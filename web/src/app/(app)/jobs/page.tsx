'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { Briefcase, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Job {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    description: string;
    postedById: string;
    createdAt: string;
    applicationCount?: number;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchJobs = async () => {
        try {
            const q = search ? `?search=${search}` : '';
            const { data } = await api.get(`/api/v1/jobs${q}`);
            setJobs(data.data || []);
        } catch { toast.error('Failed to load jobs'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchJobs(); }, [search]);

    const apply = async (id: string) => {
        try {
            await api.post(`/api/v1/jobs/${id}/apply`, { coverLetter: 'I am interested in this position.' });
            toast.success('Application submitted!');
        } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to apply'); }
    };

    return (
        <AppShell>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input className="neu-input" placeholder="Search jobs…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            </div>

            <div className={jobs.length > 0 ? "grid-cols-2" : ""}>
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 140, marginBottom: '1rem' }} />)
                ) : jobs.length === 0 ? (
                    <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No job postings found.
                    </div>
                ) : jobs.map(job => (
                    <div key={job._id} className="neu-card hover-lift" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{job.title}</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Briefcase size={14} />{job.company}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} />{job.location}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge">{job.type}</span>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem', flex: 1 }}>
                            {job.description?.slice(0, 150)}{job.description?.length > 150 ? '…' : ''}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Calendar size={13} /> {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            </span>
                            <button className="btn btn-primary" onClick={() => apply(job._id)} style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}>
                                Apply <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </AppShell>
    );
}
