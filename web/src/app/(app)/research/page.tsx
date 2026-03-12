'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { FlaskConical, Users, Tag, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Project {
    _id: string;
    title: string;
    description: string;
    domain: string;
    status: 'open' | 'in_progress' | 'completed';
    tags: string[];
    creatorId: string;
    collaboratorIds: string[];
}

const STATUS_COLORS: Record<string, string> = {
    open: 'success', in_progress: 'warning', completed: 'muted',
};

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (p: Project) => void }) {
    const [form, setForm] = useState({ title: '', description: '', domain: '', tags: '' });
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/api/v1/research', {
                ...form,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            });
            toast.success('Project created!');
            onSuccess(data.data);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to create');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>New Research Project</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { key: 'title', label: 'Title', placeholder: 'e.g. AI-Powered Diagnostics' },
                        { key: 'domain', label: 'Domain', placeholder: 'e.g. Machine Learning, Healthcare' },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                            <input className="neu-input" placeholder={placeholder} value={(form as any)[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
                        </div>
                    ))}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Description</label>
                        <textarea className="neu-input" rows={3} placeholder="Describe the research project…" value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                            Tags <span style={{ fontWeight: 400 }}>(comma-separated, optional)</span>
                        </label>
                        <input className="neu-input" placeholder="Python, NLP, Data Science" value={form.tags}
                            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-neu" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Project'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Project Detail Modal ─────────────────────────────────────────────────────
function ProjectDetailModal({ project, myId, onClose, onJoin, onLeave, onStatusUpdate }: {
    project: Project; myId: string; onClose: () => void;
    onJoin: (id: string) => void; onLeave: (id: string) => void;
    onStatusUpdate: (id: string, status: string) => void;
}) {
    const isCreator = project.creatorId === myId;
    const isMember = project.collaboratorIds?.includes(myId);
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        setLoading(true);
        try {
            await api.post(`/api/v1/research/${project._id}/join`);
            onJoin(project._id);
            toast.success('Joined project!');
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to join'); }
        finally { setLoading(false); }
    };

    const handleLeave = async () => {
        if (!confirm('Leave this project?')) return;
        setLoading(true);
        try {
            await api.delete(`/api/v1/research/${project._id}/leave`);
            onLeave(project._id);
            toast.success('Left project');
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to leave'); }
        finally { setLoading(false); }
    };

    const handleStatus = async (status: string) => {
        try {
            await api.put(`/api/v1/research/${project._id}`, { status });
            onStatusUpdate(project._id, status);
            toast.success('Status updated');
        } catch { toast.error('Failed to update status'); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{project.title}</h2>
                        <span className={`badge badge-${STATUS_COLORS[project.status] || 'muted'}`}>{project.status.replace('_', ' ')}</span>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)', flexShrink: 0 }}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{project.description}</p>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tag size={13} /> {project.domain}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={13} /> {project.collaboratorIds?.length || 0} collaborators</span>
                </div>
                {project.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                        {project.tags.map(t => <span key={t} className="chip">{t}</span>)}
                    </div>
                )}

                {/* Creator status update */}
                {isCreator && (
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Update Status</label>
                        <select className="neu-input" value={project.status} onChange={e => handleStatus(e.target.value)}>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                )}

                {/* Join/Leave */}
                {!isCreator && (
                    isMember ? (
                        <button className="btn btn-neu" onClick={handleLeave} disabled={loading}
                            style={{ width: '100%', color: 'var(--danger)' }}>
                            {loading ? '…' : 'Leave Project'}
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleJoin} disabled={loading || project.status === 'completed'}
                            style={{ width: '100%' }}>
                            {loading ? '…' : project.status === 'completed' ? 'Project Completed' : 'Join Project'}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

// ─── Research Page ────────────────────────────────────────────────────────────
export default function ResearchPage() {
    const user = useAuthStore(s => s.user);
    const myId = user?.userId || '';
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [detailProject, setDetailProject] = useState<Project | null>(null);

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/api/v1/research?limit=30');
            setProjects(data.data || []);
        } catch { toast.error('Failed to load research projects'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProjects(); }, []);

    const onJoin = (id: string) => {
        setProjects(prev => prev.map(p => p._id === id ? { ...p, collaboratorIds: [...(p.collaboratorIds || []), myId] } : p));
        if (detailProject?._id === id) setDetailProject(prev => prev ? { ...prev, collaboratorIds: [...(prev.collaboratorIds || []), myId] } : null);
    };

    const onLeave = (id: string) => {
        setProjects(prev => prev.map(p => p._id === id ? { ...p, collaboratorIds: (p.collaboratorIds || []).filter(c => c !== myId) } : p));
        setDetailProject(null);
    };

    const onStatusUpdate = (id: string, status: string) => {
        setProjects(prev => prev.map(p => p._id === id ? { ...p, status: status as Project['status'] } : p));
        if (detailProject?._id === id) setDetailProject(prev => prev ? { ...prev, status: status as Project['status'] } : null);
    };

    return (
        <AppShell>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap: '0.4rem' }}>
                    <Plus size={16} /> New Project
                </button>
            </div>

            <div className={projects.length > 0 ? 'grid-cols-3' : ''}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 200 }} />)
                ) : projects.length === 0 ? (
                    <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                        No research projects yet.
                    </div>
                ) : projects.map(p => {
                    const isMember = p.collaboratorIds?.includes(myId);
                    const isCreator = p.creatorId === myId;
                    return (
                        <div key={p._id} className="neu-card hover-lift"
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer' }}
                            onClick={() => setDetailProject(p)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FlaskConical size={18} color="#fff" />
                                </div>
                                <span className={`badge badge-${STATUS_COLORS[p.status] || 'muted'}`}>{p.status.replace('_', ' ')}</span>
                            </div>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{p.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, flex: 1 }}>
                                {p.description?.slice(0, 100)}{p.description?.length > 100 ? '…' : ''}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tag size={12} /> {p.domain}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={12} /> {p.collaboratorIds?.length || 0}</span>
                                </div>
                                {!isCreator && (
                                    <button
                                        className="btn btn-neu"
                                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', color: isMember ? 'var(--danger)' : undefined }}
                                        disabled={p.status === 'completed' && !isMember}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (isMember) {
                                                await api.delete(`/api/v1/research/${p._id}/leave`).then(() => { onLeave(p._id); toast.success('Left project'); }).catch(err => toast.error(err.response?.data?.error || 'Failed'));
                                            } else {
                                                await api.post(`/api/v1/research/${p._id}/join`).then(() => { onJoin(p._id); toast.success('Joined!'); }).catch(err => toast.error(err.response?.data?.error || 'Failed'));
                                            }
                                        }}>
                                        {isMember ? 'Leave' : p.status === 'completed' ? 'Closed' : 'Join'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCreate && (
                <CreateProjectModal onClose={() => setShowCreate(false)} onSuccess={(p) => { setProjects(prev => [p, ...prev]); setShowCreate(false); }} />
            )}
            {detailProject && (
                <ProjectDetailModal
                    project={detailProject} myId={myId}
                    onClose={() => setDetailProject(null)}
                    onJoin={onJoin} onLeave={onLeave} onStatusUpdate={onStatusUpdate}
                />
            )}
        </AppShell>
    );
}
