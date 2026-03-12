'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
    Rss, Briefcase, Calendar,
    MessageSquare, FlaskConical, Bell, User,
    BarChart3, LogOut, Sparkles, Menu, X,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSocket, connectSocket } from '@/lib/socket';

const NAV = [
    { href: '/feed', icon: Rss, label: 'Feed' },
    { href: '/jobs', icon: Briefcase, label: 'Jobs' },
    { href: '/events', icon: Calendar, label: 'Events' },
    { href: '/messages', icon: MessageSquare, label: 'Messages', badge: 'messages' },
    { href: '/research', icon: FlaskConical, label: 'Research' },
    { href: '/notifications', icon: Bell, label: 'Notifications', badge: 'notifications' },
    { href: '/profile', icon: User, label: 'Profile' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, token, patchUser } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);
    const [msgBadge, setMsgBadge] = useState(0);
    const [notifBadge, setNotifBadge] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    // Fetch display name from user service if not already stored (e.g. after login)
    useEffect(() => {
        if (!token || user?.name) return;
        api.get('/api/v1/users/me')
            .then(res => { if (res.data?.data?.name) patchUser({ name: res.data.data.name }); })
            .catch(() => {});
    }, [token, user?.name, patchUser]);

    // Reconnect socket if token exists but socket is disconnected (e.g. page refresh)
    useEffect(() => {
        if (!token) return;
        connectSocket(token);
    }, [token]);

    // Fetch initial badge counts
    const fetchBadges = useCallback(async () => {
        if (!token) return;
        try {
            const [msgRes, notifRes] = await Promise.all([
                api.get('/api/v1/messages/unread-count').catch(() => null),
                api.get('/api/v1/notifications/unread-count').catch(() => null),
            ]);
            if (msgRes) setMsgBadge(msgRes.data?.count ?? 0);
            if (notifRes) setNotifBadge(notifRes.data?.count ?? 0);
        } catch { /* ignore */ }
    }, [token]);

    useEffect(() => { if (isMounted) fetchBadges(); }, [isMounted, fetchBadges]);

    // Socket-driven badge updates
    useEffect(() => {
        if (!isMounted || !token) return;
        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(); } catch { return; }

        const onMsg = () => {
            if (!pathname.startsWith('/messages')) setMsgBadge(n => n + 1);
        };
        const onNotif = () => {
            if (!pathname.startsWith('/notifications')) setNotifBadge(n => n + 1);
        };

        socket.on('message', onMsg);
        socket.on('notification', onNotif);
        return () => { socket.off('message', onMsg); socket.off('notification', onNotif); };
    }, [isMounted, token, pathname]);

    // Clear badge when user navigates to that page; close mobile sidebar on nav
    useEffect(() => {
        if (pathname.startsWith('/messages')) setMsgBadge(0);
        if (pathname.startsWith('/notifications')) setNotifBadge(0);
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        logout(); // also calls disconnectSocket inside authStore
        router.push('/login');
    };

    const getBadge = (badge?: string) => {
        if (badge === 'messages') return msgBadge;
        if (badge === 'notifications') return notifBadge;
        return 0;
    };

    const sidebarContent = (
        <>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Sparkles size={18} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                        DE<span className="gradient-text">CP</span>
                    </span>
                </Link>
                {/* Close button on mobile */}
                <button
                    className="mobile-menu-btn"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="section-label">Menu</div>

            {NAV.map(({ href, icon: Icon, label, badge }) => {
                const count = isMounted ? getBadge(badge) : 0;
                return (
                    <Link key={href} href={href} className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}>
                        <Icon size={18} />
                        {label}
                        {count > 0 && (
                            <span className="nav-badge">{count > 9 ? '9+' : count}</span>
                        )}
                    </Link>
                );
            })}

            {isMounted && user?.role === 'admin' && (
                <Link href="/admin" className={`nav-item${pathname === '/admin' ? ' active' : ''}`}>
                    <BarChart3 size={18} />
                    Analytics
                </Link>
            )}

            <div style={{ flex: 1 }} />

            {/* User info */}
            <div className="neu-card-sm" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="avatar-fallback" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                        {isMounted ? (user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U') : 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isMounted ? (user?.name || 'User') : 'User'}
                        </div>
                        <div className="badge badge-muted" style={{ marginTop: '2px' }}>
                            {isMounted ? user?.role : ''}
                        </div>
                    </div>
                    <button onClick={handleLogout} title="Logout" style={{ color: 'var(--text-muted)' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="app-layout">
            {/* Desktop sidebar */}
            <aside className="sidebar">{sidebarContent}</aside>

            {/* Mobile sidebar overlay */}
            <div
                className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />
            {sidebarOpen && (
                <aside className="sidebar mobile-open">{sidebarContent}</aside>
            )}

            {/* Main */}
            <div className="main-content">
                <header className="top-bar">
                    {/* Hamburger — mobile only */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {NAV.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href="/notifications" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Bell size={20} />
                            {isMounted && notifBadge > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16,
                                    background: 'var(--danger)', color: '#fff', borderRadius: '50%',
                                    fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
                                }}>{notifBadge > 9 ? '9+' : notifBadge}</span>
                            )}
                        </Link>
                        <Link href="/profile">
                            <div className="avatar-fallback" style={{ width: 36, height: 36, fontSize: '0.9rem', cursor: 'pointer' }}>
                                {isMounted ? (user?.name?.[0]?.toUpperCase() || 'U') : 'U'}
                            </div>
                        </Link>
                    </div>
                </header>
                <main className="page-content">{children}</main>
            </div>

            {/* Mobile bottom navigation */}
            <nav className="mobile-nav">
                {NAV.map(({ href, icon: Icon, label, badge }) => {
                    const count = isMounted ? getBadge(badge) : 0;
                    return (
                        <Link key={href} href={href} className={`mobile-nav-item${pathname.startsWith(href) ? ' active' : ''}`}>
                            <div style={{ position: 'relative' }}>
                                <Icon size={21} />
                                {count > 0 && (
                                    <span className="mobile-nav-badge">{count > 9 ? '9+' : count}</span>
                                )}
                            </div>
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
