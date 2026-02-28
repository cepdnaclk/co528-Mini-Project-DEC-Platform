'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Bell, Check } from 'lucide-react';
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
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifs = async () => {
        try {
            const { data } = await api.get('/api/v1/notifications?limit=30');
            setNotifs(data.data || []);
        } catch { }
        finally { setLoading(false); }
    };

    const markRead = async (id: string) => {
        try {
            await api.put(`/api/v1/notifications/${id}/read`);
            setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch { toast.error('Failed to mark as read'); }
    };

    useEffect(() => {
        fetchNotifs();
        const socket = getSocket();
        const handler = (n: Notification) => {
            setNotifs(prev => [n, ...prev]);
            toast(`🔔 ${n.content}`, { icon: '🔔' });
        };
        socket.on('notification', handler);
        return () => { socket.off('notification', handler); };
    }, []);

    return (
        <AppShell>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Notifications</h2>
                <span className="badge">{notifs.filter(n => !n.isRead).length} unread</span>
            </div>

            {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 70, marginBottom: '0.75rem' }} />)
            ) : notifs.length === 0 ? (
                <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p>No notifications yet</p>
                </div>
            ) : notifs.map(n => (
                <div key={n._id} className="neu-card" style={{
                    marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    opacity: n.isRead ? 0.65 : 1,
                    transition: 'opacity 0.2s',
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
                        <button className="btn btn-neu" onClick={() => markRead(n._id)} title="Mark as read" style={{ padding: '0.4rem 0.7rem' }}>
                            <Check size={15} />
                        </button>
                    )}
                </div>
            ))}
        </AppShell>
    );
}
