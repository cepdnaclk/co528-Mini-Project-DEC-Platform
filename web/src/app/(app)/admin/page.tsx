'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { BarChart3, FileText, Briefcase, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Metrics {
    totalPosts: number;
    totalLikes: number;
    totalJobs: number;
    totalEvents: number;
    totalUsers: number;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
    return (
        <div className="neu-card hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={22} color="#fff" />
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{value ?? '—'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>{label}</div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/v1/analytics/metrics').then(({ data }) => {
            setMetrics(data.data);
        }).catch(() => toast.error('Failed to load metrics')).finally(() => setLoading(false));
    }, []);

    const stats = [
        { key: 'totalPosts', label: 'Total Posts', icon: FileText, color: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        { key: 'totalLikes', label: 'Total Likes', icon: BarChart3, color: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
        { key: 'totalJobs', label: 'Jobs Posted', icon: Briefcase, color: 'linear-gradient(135deg, #10b981, #059669)' },
        { key: 'totalEvents', label: 'Events', icon: Calendar, color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { key: 'totalUsers', label: 'Registered Users', icon: Users, color: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    ];

    return (
        <AppShell>
            <div style={{ marginBottom: '2rem' }}>
                <div className="section-label">Admin</div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Platform Analytics</h1>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    {stats.map(({ key, label, icon, color }) => (
                        <StatCard key={key} label={label} value={(metrics as any)?.[key] ?? 0} icon={icon} color={color} />
                    ))}
                </div>
            )}

            <div className="neu-card" style={{ marginTop: '2rem' }}>
                <div className="section-label" style={{ marginBottom: '0.75rem' }}>About</div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.93rem' }}>
                    Metrics are updated in real-time via the GCP Pub/Sub event pipeline. Each user action (post, like, job apply, RSVP) emits an event that is consumed by the Analytics service and persisted to MongoDB.
                </p>
            </div>
        </AppShell>
    );
}
