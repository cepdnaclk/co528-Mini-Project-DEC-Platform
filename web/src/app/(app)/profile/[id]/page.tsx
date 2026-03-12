'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, UserMinus, MessageSquare, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface UserProfile {
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

interface Post {
    _id: string;
    content: string;
    mediaUrls: string[];
    likeCount: number;
    commentCount: number;
    createdAt: string;
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;
    const myId = useAuthStore(s => s.user?.userId) || '';

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!userId || userId === myId) { router.replace('/profile'); return; }

        Promise.all([
            api.get(`/api/v1/users/${userId}`),
            api.get(`/api/v1/feed/posts?authorId=${userId}&limit=20`),
        ]).then(([userRes, postsRes]) => {
            const u: UserProfile = userRes.data.data;
            setProfile(u);
            setFollowing(u.followers?.includes(myId) || false);
            setPosts(postsRes.data.data || []);
        }).catch(() => toast.error('Failed to load profile'))
        .finally(() => setLoading(false));
    }, [userId, myId]);

    const toggleFollow = async () => {
        setFollowLoading(true);
        try {
            if (following) {
                await api.delete(`/api/v1/users/${userId}/follow`);
                setFollowing(false);
                setProfile(prev => prev ? { ...prev, followers: prev.followers.filter(f => f !== myId) } : prev);
                toast.success('Unfollowed');
            } else {
                await api.post(`/api/v1/users/${userId}/follow`);
                setFollowing(true);
                setProfile(prev => prev ? { ...prev, followers: [...prev.followers, myId] } : prev);
                toast.success('Following!');
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed');
        } finally { setFollowLoading(false); }
    };

    const messageUser = () => {
        sessionStorage.setItem('openMessageTo', JSON.stringify({ id: userId, name: profile?.name || 'User' }));
        router.push('/messages');
    };

    if (loading) return <AppShell><div className="skeleton" style={{ height: 300 }} /></AppShell>;
    if (!profile) return <AppShell><div className="neu-card" style={{ textAlign: 'center', padding: '3rem' }}>User not found.</div></AppShell>;

    return (
        <AppShell>
            <button className="btn btn-neu" onClick={() => router.back()} style={{ marginBottom: '1.5rem', gap: '0.4rem', fontSize: '0.88rem' }}>
                <ArrowLeft size={15} /> Back
            </button>

            <div className="neu-card-lg" style={{ maxWidth: 640, marginBottom: '2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flexShrink: 0 }}>
                        {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt={profile.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div className="avatar-fallback" style={{ width: 72, height: 72, fontSize: '1.8rem' }}>
                                {profile.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.4rem' }}>{profile.name}</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge">{profile.role}</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <strong>{profile.followers?.length || 0}</strong> Followers
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <strong>{profile.following?.length || 0}</strong> Following
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button className="btn btn-neu" onClick={messageUser} style={{ gap: '0.4rem', fontSize: '0.85rem' }}>
                            <MessageSquare size={15} /> Message
                        </button>
                        <button
                            className={following ? 'btn btn-neu' : 'btn btn-primary'}
                            onClick={toggleFollow}
                            disabled={followLoading}
                            style={{ gap: '0.4rem', fontSize: '0.85rem', color: following ? 'var(--danger)' : undefined }}>
                            {following ? <><UserMinus size={15} /> Unfollow</> : <><UserPlus size={15} /> Follow</>}
                        </button>
                    </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div className="section-label" style={{ marginBottom: '0.6rem' }}>Bio</div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{profile.bio}</p>
                    </div>
                )}

                {/* Skills */}
                {(profile.skills || []).length > 0 && (
                    <div>
                        <div className="section-label" style={{ marginBottom: '0.6rem' }}>Skills</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {profile.skills.map(s => <span key={s} className="chip active">{s}</span>)}
                        </div>
                    </div>
                )}
            </div>

            {/* Their posts */}
            {posts.length > 0 && (
                <div style={{ maxWidth: 640 }}>
                    <div className="section-label" style={{ marginBottom: '1rem' }}>Posts</div>
                    {posts.map(post => (
                        <div key={post._id} className="neu-card" style={{ marginBottom: '1rem' }}>
                            <p style={{ lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>{post.content}</p>
                            {post.mediaUrls?.length > 0 && (
                                <img src={post.mediaUrls[0]} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 280, objectFit: 'cover', marginBottom: '0.75rem' }} />
                            )}
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                <span>❤️ {post.likeCount}</span>
                                <span>💬 {post.commentCount}</span>
                                <span style={{ marginLeft: 'auto' }}>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppShell>
    );
}
