'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
    _id: string;
    type: string;
    content: string;
    link: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifs = async (cursor?: string) => {
        if (cursor) setLoadingMore(true);
        try {
            const q = cursor ? `?limit=20&cursor=${cursor}` : '?limit=20';
            const { data } = await api.get(`/api/v1/notifications${q}`);
            if (cursor) {
                setNotifs(prev => [...prev, ...(data.data || [])]);
            } else {
                setNotifs(data.data || []);
            }
            setNextCursor(data.nextCursor || null);
        } catch { }
        finally { setLoading(false); setLoadingMore(false); }
    };

    const markRead = async (id: string) => {
        try {
            await api.put(`/api/v1/notifications/${id}/read`);
            setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch { toast.error('Failed to mark as read'); }
    };

    const markAllRead = async () => {
        setMarkingAll(true);
        try {
            await api.put('/api/v1/notifications/read-all');
            setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
            toast.success('All marked as read');
        } catch { toast.error('Failed'); }
        finally { setMarkingAll(false); }
    };

    const handleClick = (n: Notification) => {
        if (!n.isRead) markRead(n._id);
        if (n.link) router.push(n.link);
    };

    useEffect(() => {
        fetchNotifs();
        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(); } catch { return; }
        const handler = (n: Notification) => {
            setNotifs(prev => [n, ...prev]);
            toast(n.content, { icon: '🔔' });
        };
        socket.on('notification', handler);
        return () => { socket.off('notification', handler); };
    }, []);

    const unreadCount = notifs.filter(n => !n.isRead).length;

    return (
        <AppShell>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Notifications</h2>
                    {unreadCount > 0 && <span className="badge">{unreadCount} unread</span>}
                </div>
                {unreadCount > 0 && (
                    <button className="btn btn-neu" onClick={markAllRead} disabled={markingAll}
                        style={{ fontSize: '0.85rem', gap: '0.4rem' }}>
                        <CheckCheck size={15} /> {markingAll ? 'Marking…' : 'Mark all as read'}
                    </button>
                )}
            </div>

            {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 70, marginBottom: '0.75rem' }} />)
            ) : notifs.length === 0 ? (
                <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p>No notifications yet</p>
                </div>
            ) : (
                <>
                    {notifs.map(n => (
                        <div key={n._id}
                            onClick={() => handleClick(n)}
                            className="neu-card"
                            style={{
                                marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                opacity: n.isRead ? 0.65 : 1, transition: 'opacity 0.2s',
                                cursor: n.link ? 'pointer' : 'default',
                            }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                background: n.isRead ? 'var(--text-muted)' : 'var(--primary)',
                            }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: n.isRead ? 400 : 600, fontSize: '0.93rem' }}>{n.content}</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!n.isRead && (
                                <button className="btn btn-neu" onClick={e => { e.stopPropagation(); markRead(n._id); }}
                                    title="Mark as read" style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}>
                                    <Check size={15} />
                                </button>
                            )}
                        </div>
                    ))}
                    {nextCursor && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button className="btn btn-neu" onClick={() => fetchNotifs(nextCursor)} disabled={loadingMore}
                                style={{ fontSize: '0.88rem' }}>
                                {loadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </AppShell>
    );
}
