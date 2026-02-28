'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { Heart, MessageCircle, Share2, Image, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Post {
    _id: string;
    authorName: string;
    authorAvatar: string;
    content: string;
    mediaUrls: string[];
    likeCount: number;
    commentCount: number;
    likes: string[];
    createdAt: string;
}

function PostCard({ post, userId, onLike }: { post: Post; userId: string; onLike: (id: string) => void }) {
    const liked = post.likes.includes(userId);
    return (
        <div className="neu-card hover-lift" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="avatar-fallback" style={{ width: 42, height: 42 }}>
                    {post.authorName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <div style={{ fontWeight: 700 }}>{post.authorName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </div>
                </div>
            </div>
            <p style={{ lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: '1rem' }}>{post.content}</p>
            {post.mediaUrls?.[0] && (
                <img src={post.mediaUrls[0]} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: '1rem', maxHeight: 380, objectFit: 'cover' }} />
            )}
            <div className="divider" />
            <div className="post-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button onClick={() => onLike(post._id)} className={liked ? 'liked' : ''}>
                    <Heart size={16} fill={liked ? '#ef4444' : 'none'} /> {post.likeCount}
                </button>
                <button><MessageCircle size={16} /> {post.commentCount}</button>
                <button><Share2 size={16} /> Share</button>
            </div>
        </div>
    );
}

function CreatePost({ onCreated }: { onCreated: () => void }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            await api.post('/api/v1/feed/posts', { content });
            setContent('');
            onCreated();
            toast.success('Post created!');
        } catch { toast.error('Failed to post'); }
        finally { setLoading(false); }
    };

    return (
        <div className="neu-card" style={{ marginBottom: '1.5rem' }}>
            <textarea
                className="neu-input"
                placeholder="What's on your mind?"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
                style={{ resize: 'none', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-neu" style={{ gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    <Image size={16} /> Photo
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={loading || !content.trim()} style={{ gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}>
                    <Send size={16} /> {loading ? 'Posting…' : 'Post'}
                </button>
            </div>
        </div>
    );
}

export default function FeedPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(s => s.user);

    const fetchPosts = async () => {
        try {
            const { data } = await api.get('/api/v1/feed/posts?limit=20');
            setPosts(data.data || []);
        } catch { toast.error('Failed to load feed'); }
        finally { setLoading(false); }
    };

    const likePost = async (id: string) => {
        try {
            await api.post(`/api/v1/feed/posts/${id}/like`);
            fetchPosts();
        } catch { toast.error('Failed to like'); }
    };

    useEffect(() => { fetchPosts(); }, []);

    // Real-time: show new posts from others via socket
    useEffect(() => {
        const socket = getSocket();
        socket.on('feed:new_post', fetchPosts);
        return () => { socket.off('feed:new_post', fetchPosts); };
    }, []);

    return (
        <AppShell>
            <div className="feed-layout">
                {/* Main Feed Column */}
                <div>
                    <CreatePost onCreated={fetchPosts} />
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 160, marginBottom: '1.25rem' }} />
                        ))
                    ) : posts.length === 0 ? (
                        <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No posts yet. Be the first to share something!
                        </div>
                    ) : posts.map(post => (
                        <PostCard key={post._id} post={post} userId={user?.userId || ''} onLike={likePost} />
                    ))}
                </div>

                {/* Right Sidebar - Suggestions / Trending (CSS Grid) */}
                <div className="feed-sidebar">
                    <div className="neu-card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            Trending Topics
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div className="chip active">#DigitalEngineering</div>
                            <div className="chip">#NextJs</div>
                            <div className="chip">#TechCareers</div>
                            <div className="chip">#Neumorphism</div>
                        </div>
                    </div>

                    <div className="neu-card">
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            Suggested Connections
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>A</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Alex Chen</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Software Engineer</div>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Follow</button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>M</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Maria Garcia</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product Manager</div>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Follow</button>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
