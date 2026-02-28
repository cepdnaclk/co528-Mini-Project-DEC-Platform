'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { disconnectSocket } from '@/lib/socket';
import {
    LayoutDashboard, Rss, Briefcase, Calendar,
    MessageSquare, FlaskConical, Bell, User,
    BarChart3, LogOut, Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV = [
    { href: '/feed', icon: Rss, label: 'Feed' },
    { href: '/jobs', icon: Briefcase, label: 'Jobs' },
    { href: '/events', icon: Calendar, label: 'Events' },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/research', icon: FlaskConical, label: 'Research' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: '/profile', icon: User, label: 'Profile' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = () => {
        disconnectSocket();
        logout();
        router.push('/login');
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
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
                </div>

                <div className="section-label">Menu</div>

                {/* Nav links */}
                {NAV.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} className={`nav-item${pathname.startsWith(href) ? ' active' : ''}`}>
                        <Icon size={18} />
                        {label}
                    </Link>
                ))}

                {isMounted && user?.role === 'admin' && (
                    <Link href="/admin" className={`nav-item${pathname === '/admin' ? ' active' : ''}`}>
                        <BarChart3 size={18} />
                        Analytics
                    </Link>
                )}

                {/* Spacer */}
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
            </aside>

            {/* Main */}
            <div className="main-content">
                <header className="top-bar">
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {NAV.find(n => pathname.startsWith(n.href))?.label || 'Dashboard'}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href="/notifications" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                            <Bell size={20} />
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
        </div>
    );
}
