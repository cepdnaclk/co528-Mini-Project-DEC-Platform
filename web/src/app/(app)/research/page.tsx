'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { FlaskConical, Users, Tag, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Project {
    _id: string;
    title: string;
    description: string;
    domain: string;
    status: string;
    collaboratorIds: string[];
}

export default function ResearchPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/api/v1/research?limit=20');
            setProjects(data.data || []);
        } catch { toast.error('Failed to load research projects'); }
        finally { setLoading(false); }
    };

    const join = async (id: string) => {
        try {
            await api.post(`/api/v1/research/${id}/join`);
            toast.success('Joined project!');
            fetchProjects();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to join'); }
    };

    useEffect(() => { fetchProjects(); }, []);

    const statusColor = (s: string) => ({ open: 'success', closed: 'danger', active: 'warning' }[s] || 'muted');

    return (
        <AppShell>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" style={{ gap: '0.4rem' }}>
                    <Plus size={16} /> New Project
                </button>
            </div>
            <div className={projects.length > 0 ? "grid-cols-3" : ""}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 200 }} />)
                ) : projects.map(p => (
                    <div key={p._id} className="neu-card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10, background: 'var(--gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <FlaskConical size={18} color="#fff" />
                            </div>
                            <span className={`badge badge-${statusColor(p.status)}`}>{p.status}</span>
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{p.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, flex: 1 }}>
                            {p.description?.slice(0, 120)}{p.description?.length > 120 ? '…' : ''}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Tag size={12} /> {p.domain}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Users size={12} /> {p.collaboratorIds?.length || 0}
                                </span>
                            </div>
                            <button className="btn btn-neu" onClick={() => join(p._id)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
                                Join
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </AppShell>
    );
}
