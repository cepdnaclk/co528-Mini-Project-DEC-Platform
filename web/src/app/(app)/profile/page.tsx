'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { User, Edit3, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
    name: string;
    bio: string;
    skills: string[];
    avatarUrl: string;
    role: string;
    email: string;
}

export default function ProfilePage() {
    const { user, setAuth, token } = useAuthStore();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ bio: '', skills: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/v1/users/me').then(({ data }) => {
            setProfile(data.data);
            setForm({ bio: data.data.bio || '', skills: (data.data.skills || []).join(', ') });
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const save = async () => {
        try {
            const { data } = await api.put('/api/v1/users/me', {
                bio: form.bio,
                skills: form.skills.split(',').map((s: string) => s.trim()).filter(Boolean),
            });
            setProfile(data.data);
            setEditing(false);
            toast.success('Profile updated!');
        } catch { toast.error('Failed to update profile'); }
    };

    if (loading) return <AppShell><div className="skeleton" style={{ height: 300 }} /></AppShell>;

    return (
        <AppShell>
            <div className="neu-card-lg" style={{ maxWidth: 600 }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="avatar-fallback" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>
                        {profile?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.4rem' }}>{profile?.name || user?.email}</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <span className="badge">{profile?.role}</span>
                        </div>
                    </div>
                    <button
                        className="btn btn-neu"
                        onClick={() => editing ? save() : setEditing(true)}
                        style={{ marginLeft: 'auto', gap: '0.4rem' }}
                    >
                        {editing ? <><Save size={15} /> Save</> : <><Edit3 size={15} /> Edit</>}
                    </button>
                </div>

                {/* Bio */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="section-label" style={{ marginBottom: '0.6rem' }}>Bio</div>
                    {editing ? (
                        <textarea
                            className="neu-input"
                            rows={4}
                            value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            placeholder="Tell us about yourself…"
                            style={{ resize: 'none' }}
                        />
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            {profile?.bio || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No bio yet</span>}
                        </p>
                    )}
                </div>

                {/* Skills */}
                <div>
                    <div className="section-label" style={{ marginBottom: '0.6rem' }}>Skills</div>
                    {editing ? (
                        <input
                            className="neu-input"
                            value={form.skills}
                            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                            placeholder="Python, Machine Learning, React…"
                        />
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {(profile?.skills || []).length === 0 ? (
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No skills listed</span>
                            ) : profile?.skills.map(s => <span key={s} className="chip active">{s}</span>)}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
