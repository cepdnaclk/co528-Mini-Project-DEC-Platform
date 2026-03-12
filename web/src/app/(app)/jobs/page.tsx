'use client';
import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Briefcase, MapPin, Calendar, Plus, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Application {
    _id: string;
    applicantId: string;
    coverLetter: string;
    cvUrl: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

interface Job {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    requirements?: string[];
    posterId: string;
    createdAt: string;
    applicationCount?: number;
}

const JOB_TYPES = ['All', 'internship', 'full-time', 'part-time', 'contract'];

// ─── Apply Modal ─────────────────────────────────────────────────────────────
function ApplyModal({ job, onClose, onSuccess }: { job: Job; onClose: () => void; onSuccess: () => void }) {
    const [form, setForm] = useState({ coverLetter: '', cvUrl: '' });
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.coverLetter.trim().length < 10) { toast.error('Cover letter must be at least 10 characters'); return; }
        if (!form.cvUrl.startsWith('http')) { toast.error('Please enter a valid CV URL'); return; }
        setLoading(true);
        try {
            await api.post(`/api/v1/jobs/${job._id}/apply`, form);
            toast.success('Application submitted!');
            onSuccess();
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to apply');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Apply — {job.title}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{job.company}</p>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Cover Letter</label>
                        <textarea
                            className="neu-input"
                            rows={5}
                            placeholder="Tell us why you're a great fit for this role..."
                            value={form.coverLetter}
                            onChange={e => setForm(f => ({ ...f, coverLetter: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>CV / Resume URL</label>
                        <input
                            className="neu-input"
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={form.cvUrl}
                            onChange={e => setForm(f => ({ ...f, cvUrl: e.target.value }))}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-neu" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Submitting…' : 'Submit Application'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Post Job Modal ───────────────────────────────────────────────────────────
function PostJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (job: Job) => void }) {
    const [form, setForm] = useState({ title: '', company: '', location: '', type: 'full-time', description: '', requirements: '' });
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                requirements: form.requirements ? form.requirements.split(',').map(r => r.trim()).filter(Boolean) : [],
            };
            const { data } = await api.post('/api/v1/jobs', payload);
            toast.success('Job posted!');
            onSuccess(data.data);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Post a Job</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { key: 'title', label: 'Job Title', placeholder: 'e.g. Software Engineer Intern' },
                        { key: 'company', label: 'Company', placeholder: 'e.g. Acme Corp' },
                        { key: 'location', label: 'Location', placeholder: 'e.g. Remote / Colombo' },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                            <input className="neu-input" placeholder={placeholder} value={(form as any)[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
                        </div>
                    ))}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Type</label>
                        <select className="neu-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                            {JOB_TYPES.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Description</label>
                        <textarea className="neu-input" rows={4} placeholder="Describe the role..." value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                            Requirements <span style={{ fontWeight: 400 }}>(comma-separated, optional)</span>
                        </label>
                        <input className="neu-input" placeholder="React, Node.js, 2+ years experience" value={form.requirements}
                            onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="button" className="btn btn-neu" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting…' : 'Post Job'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Applications Panel ───────────────────────────────────────────────────────
function ApplicationsPanel({ job, onClose }: { job: Job; onClose: () => void }) {
    const [apps, setApps] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/api/v1/jobs/${job._id}/applications`)
            .then(({ data }) => setApps(data.data || []))
            .catch(() => toast.error('Failed to load applications'))
            .finally(() => setLoading(false));
    }, [job._id]);

    const updateStatus = async (appId: string, status: string) => {
        try {
            await api.put(`/api/v1/jobs/${job._id}/applications/${appId}`, { status });
            setApps(prev => prev.map(a => a._id === appId ? { ...a, status: status as Application['status'] } : a));
            toast.success(`Application ${status}`);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to update');
        }
    };

    const statusColor = { pending: '#f59e0b', accepted: '#10b981', rejected: '#ef4444' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Applications — {job.title}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{apps.length} applicant{apps.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, marginBottom: '0.75rem' }} />)
                ) : apps.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No applications yet.</p>
                ) : apps.map(app => (
                    <div key={app._id} className="neu-card" style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Applied {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor[app.status], textTransform: 'uppercase' }}>
                                {app.status}
                            </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{app.coverLetter}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <a href={app.cvUrl} target="_blank" rel="noreferrer" className="btn btn-neu" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                View CV <ExternalLink size={13} />
                            </a>
                            {app.status === 'pending' && (
                                <>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', background: '#10b981' }} onClick={() => updateStatus(app._id, 'accepted')}>Accept</button>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', background: '#ef4444' }} onClick={() => updateStatus(app._id, 'rejected')}>Reject</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────
export default function JobsPage() {
    const user = useAuthStore((s) => s.user);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [applyJob, setApplyJob] = useState<Job | null>(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [appsJob, setAppsJob] = useState<Job | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (search) params.search = search;
            if (typeFilter !== 'All') params.type = typeFilter;
            const q = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
            const { data } = await api.get(`/api/v1/jobs${q}`);
            setJobs(data.data || []);
        } catch { toast.error('Failed to load jobs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchJobs(); }, [search, typeFilter]);

    const canPost = user?.role === 'alumni' || user?.role === 'admin';

    return (
        <AppShell>
            {/* Header row */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="neu-input" placeholder="Search jobs…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                {canPost && (
                    <button className="btn btn-primary" onClick={() => setShowPostModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                        <Plus size={16} /> Post Job
                    </button>
                )}
            </div>

            {/* Type filter chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {JOB_TYPES.map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                        className={typeFilter === t ? 'btn btn-primary' : 'btn btn-neu'}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', textTransform: 'capitalize' }}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Job grid */}
            <div className={jobs.length > 0 ? 'grid-cols-2' : ''}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, marginBottom: '1rem' }} />)
                ) : jobs.length === 0 ? (
                    <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No job postings found.
                    </div>
                ) : jobs.map(job => (
                    <div key={job._id} className="neu-card hover-lift" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{job.title}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Briefcase size={14} />{job.company}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} />{job.location}</span>
                                </div>
                            </div>
                            <span className="badge" style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{job.type}</span>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem', flex: 1 }}>
                            {job.description?.slice(0, 150)}{job.description?.length > 150 ? '…' : ''}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Calendar size={13} /> {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {/* Poster: view applications */}
                                {job.posterId === user?.userId && (
                                    <button className="btn btn-neu" onClick={() => setAppsJob(job)}
                                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}>
                                        Applications
                                    </button>
                                )}
                                {/* Student: apply */}
                                {job.posterId !== user?.userId && (
                                    <button
                                        className="btn btn-primary"
                                        disabled={appliedIds.has(job._id)}
                                        onClick={() => setApplyJob(job)}
                                        style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}>
                                        {appliedIds.has(job._id) ? 'Applied' : 'Apply'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modals */}
            {applyJob && (
                <ApplyModal
                    job={applyJob}
                    onClose={() => setApplyJob(null)}
                    onSuccess={() => { setAppliedIds(prev => new Set(prev).add(applyJob._id)); setApplyJob(null); }}
                />
            )}
            {showPostModal && (
                <PostJobModal
                    onClose={() => setShowPostModal(false)}
                    onSuccess={(job) => { setJobs(prev => [job, ...prev]); setShowPostModal(false); }}
                />
            )}
            {appsJob && (
                <ApplicationsPanel job={appsJob} onClose={() => setAppsJob(null)} />
            )}
        </AppShell>
    );
}
