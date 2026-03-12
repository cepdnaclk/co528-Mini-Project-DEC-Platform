'use client';
import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Edit3, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

interface Profile {
    _id: string;
    name: string;
    bio: string;
    skills: string[];
    avatarUrl: string;
    role: string;
    email: string;
    followers: string[];
    following: string[];
}

interface FollowUser {
    _id: string;
    name: string;
    role: string;
    avatarUrl?: string;
}

function FollowList({ userId, type }: { userId: string; type: 'followers' | 'following' }) {
    const [users, setUsers] = useState<FollowUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/api/v1/users/${userId}/${type}`)
            .then(({ data }) => setUsers(data.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [userId, type]);

    if (loading) return <div className="skeleton" style={{ height: 60 }} />;
    if (users.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>None yet.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map(u => (
                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="avatar-fallback" style={{ width: 36, height: 36, fontSize: '0.85rem', flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ProfilePage() {
    const { user, setAuth, token, refreshToken } = useAuthStore();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ bio: '', skills: '' });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'followers' | 'following' | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

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

    const handleAvatarFile = async (file: File) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) { toast.error('Only JPG/PNG/WebP allowed'); return; }
        // Optimistic preview
        const preview = URL.createObjectURL(file);
        setAvatarPreview(preview);
        setAvatarUploading(true);
        try {
            // Step 1: get presigned URL
            const { data: urlData } = await api.post('/api/v1/users/me/avatar', { mimeType: file.type });
            const { uploadUrl, publicUrl } = urlData;
            // Step 2: PUT to R2
            await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
            // Step 3: confirm
            await api.put('/api/v1/users/me/avatar', { avatarUrl: publicUrl });
            setProfile(prev => prev ? { ...prev, avatarUrl: publicUrl } : prev);
            toast.success('Avatar updated!');
        } catch {
            setAvatarPreview(null);
            toast.error('Avatar upload failed');
        } finally { setAvatarUploading(false); }
    };

    if (loading) return <AppShell><div className="skeleton" style={{ height: 300 }} /></AppShell>;

    const followerCount = profile?.followers?.length ?? 0;
    const followingCount = profile?.following?.length ?? 0;
    const displayAvatar = avatarPreview || profile?.avatarUrl;

    return (
        <AppShell>
            <div className="neu-card-lg" style={{ maxWidth: 640 }}>
                {/* Avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {/* Clickable avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {displayAvatar ? (
                            <img src={displayAvatar} alt="Avatar"
                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div className="avatar-fallback" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>
                                {profile?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={avatarUploading}
                            style={{
                                position: 'absolute', bottom: 0, right: 0, width: 24, height: 24,
                                background: 'var(--primary)', color: '#fff', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
                            title="Change avatar">
                            <Camera size={13} />
                        </button>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                            onChange={e => e.target.files?.[0] && handleAvatarFile(e.target.files[0])} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.4rem' }}>{profile?.name || user?.email}</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge">{profile?.role}</span>
                            {/* Follower/following counts */}
                            <button onClick={() => setActiveTab(activeTab === 'followers' ? null : 'followers')}
                                style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{followerCount}</span> Followers
                            </button>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <button onClick={() => setActiveTab(activeTab === 'following' ? null : 'following')}
                                style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{followingCount}</span> Following
                            </button>
                        </div>
                    </div>

                    <button className="btn btn-neu" onClick={() => editing ? save() : setEditing(true)}
                        style={{ gap: '0.4rem', flexShrink: 0 }}>
                        {editing ? <><Save size={15} /> Save</> : <><Edit3 size={15} /> Edit</>}
                    </button>
                </div>

                {/* Followers / Following panel */}
                {activeTab && (
                    <div className="neu-inset" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 12 }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            {(['followers', 'following'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={activeTab === tab ? 'btn btn-primary' : 'btn btn-neu'}
                                    style={{ fontSize: '0.82rem', padding: '0.4rem 1rem', textTransform: 'capitalize' }}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        {user?.userId && <FollowList userId={user.userId} type={activeTab} />}
                    </div>
                )}

                {/* Bio */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <div className="section-label" style={{ marginBottom: '0.6rem' }}>Bio</div>
                    {editing ? (
                        <textarea className="neu-input" rows={4} value={form.bio}
                            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                            placeholder="Tell us about yourself…" style={{ resize: 'none' }} />
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
                        <input className="neu-input" value={form.skills}
                            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
                            placeholder="Python, Machine Learning, React…" />
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
