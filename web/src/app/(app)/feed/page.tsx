'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import {
    Heart, MessageCircle, Share2, Image as ImageIcon, Send,
    MoreHorizontal, Pencil, Trash2, X, ChevronDown, RefreshCw,
    TrendingUp, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Post {
    _id: string;
    authorId: string;
    authorName: string;
    content: string;
    mediaUrls: string[];
    likeCount: number;
    commentCount: number;
    likes: string[];
    createdAt: string;
}

interface Comment {
    _id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
}

// ─── Comment Section ──────────────────────────────────────────────────────────
function CommentSection({ postId }: { postId: string }) {
    const myId = useAuthStore(s => s.user?.userId ?? '');
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get(`/api/v1/feed/posts/${postId}/comments`)
            .then(({ data }) => setComments(data.data || []))
            .catch(() => toast.error('Failed to load comments'))
            .finally(() => setLoading(false));
    }, [postId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            const { data } = await api.post(`/api/v1/feed/posts/${postId}/comments`, { content: text.trim() });
            setComments(prev => [...prev, data.data]);
            setText('');
        } catch { toast.error('Failed to comment'); }
        finally { setSubmitting(false); }
    };

    const deleteComment = async (commentId: string) => {
        try {
            await api.delete(`/api/v1/feed/posts/${postId}/comments/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId));
            toast.success('Comment deleted');
        } catch { toast.error('Failed to delete comment'); }
    };

    return (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(200,207,216,0.5)' }}>
            {loading ? (
                <div className="skeleton" style={{ height: 40, marginBottom: '0.75rem' }} />
            ) : (
                <>
                    {comments.map(c => (
                        <div key={c._id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="avatar-fallback" style={{ width: 30, height: 30, fontSize: '0.75rem', flexShrink: 0 }}>
                                {c.authorName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '0.5rem 0.9rem', flex: 1, position: 'relative' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.2rem' }}>{c.authorName}</div>
                                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                </div>
                                {c.authorId === myId && (
                                    <button
                                        onClick={() => deleteComment(c._id)}
                                        title="Delete comment"
                                        style={{
                                            position: 'absolute', top: '0.5rem', right: '0.6rem',
                                            color: 'var(--text-muted)', opacity: 0.6, padding: '2px',
                                            lineHeight: 1, cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>No comments yet. Be the first!</p>
                    )}
                    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input className="neu-input" placeholder="Add a comment…" value={text}
                            onChange={e => setText(e.target.value)} style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.88rem' }} />
                        <button type="submit" className="btn btn-primary" disabled={submitting || !text.trim()}
                            style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                            {submitting ? '…' : <Send size={14} />}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}

// ─── Media Uploader ───────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

function MediaUploader({ onUpload }: { onUpload: (urls: string[]) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
    const [uploading, setUploading] = useState(false);

    const handleFiles = async (files: FileList) => {
        const valid = Array.from(files).filter(f => ALLOWED_TYPES.includes(f.type)).slice(0, 4);
        if (valid.length === 0) { toast.error('Unsupported file type'); return; }
        const previewUrls = valid.map(f => ({ url: URL.createObjectURL(f), file: f }));
        setPreviews(previewUrls);
        setUploading(true);
        try {
            // Upload via backend proxy (avoids browser CORS issues with direct R2 PUT)
            const publicUrls = await Promise.all(valid.map(async (file) => {
                const arrayBuffer = await file.arrayBuffer();
                const { data } = await api.post('/api/v1/feed/media/upload-proxy', arrayBuffer, {
                    headers: { 'Content-Type': file.type },
                });
                return data.publicUrl as string;
            }));
            onUpload(publicUrls);
            toast.success('Media uploaded!');
        } catch { toast.error('Upload failed'); setPreviews([]); }
        finally { setUploading(false); }
    };

    const remove = (idx: number) => {
        URL.revokeObjectURL(previews[idx].url);
        const next = previews.filter((_, i) => i !== idx);
        setPreviews(next);
        if (next.length === 0) onUpload([]);
    };

    return (
        <div>
            <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple hidden
                onChange={e => e.target.files && handleFiles(e.target.files)} />
            <button type="button" className="btn btn-neu" onClick={() => fileRef.current?.click()}
                style={{ gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }} disabled={uploading}>
                <ImageIcon size={16} /> {uploading ? 'Uploading…' : 'Photo/Video'}
            </button>
            {previews.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {previews.map((p, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            <img src={p.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                            <button onClick={() => remove(i)}
                                style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Create Post ──────────────────────────────────────────────────────────────
function CreatePost({ onCreated }: { onCreated: (post: Post) => void }) {
    const [content, setContent] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            const { data } = await api.post('/api/v1/feed/posts', { content, mediaUrls });
            setContent('');
            setMediaUrls([]);
            onCreated(data.data);
            toast.success('Post created!');
        } catch { toast.error('Failed to post'); }
        finally { setLoading(false); }
    };

    return (
        <div className="neu-card" style={{ marginBottom: '1.5rem' }}>
            <textarea className="neu-input" placeholder="What's on your mind?" value={content}
                onChange={e => setContent(e.target.value)} rows={3} style={{ resize: 'none', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <MediaUploader onUpload={setMediaUrls} />
                <button className="btn btn-primary" onClick={submit} disabled={loading || !content.trim()}
                    style={{ gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1.2rem' }}>
                    <Send size={16} /> {loading ? 'Posting…' : 'Post'}
                </button>
            </div>
        </div>
    );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({
    post, myId,
    onLike, onDelete, onEdit,
}: {
    post: Post; myId: string;
    onLike: (id: string) => void;
    onDelete: (id: string) => void;
    onEdit: (id: string, content: string) => void;
}) {
    const isOwn = post.authorId === myId;
    const liked = post.likes.includes(myId);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(post.content);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const CHAR_LIMIT = 280;
    const isLong = post.content.length > CHAR_LIMIT;

    const saveEdit = async () => {
        if (!editText.trim()) return;
        setSaving(true);
        try {
            await api.put(`/api/v1/feed/posts/${post._id}`, { content: editText.trim() });
            onEdit(post._id, editText.trim());
            setEditing(false);
            toast.success('Post updated');
        } catch { toast.error('Failed to update'); }
        finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!confirm('Delete this post?')) return;
        try {
            await api.delete(`/api/v1/feed/posts/${post._id}`);
            onDelete(post._id);
            toast.success('Post deleted');
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <div className="neu-card hover-lift" style={{ marginBottom: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="avatar-fallback" style={{ width: 42, height: 42 }}>
                    {post.authorName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{post.authorName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </div>
                </div>
                {isOwn && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setMenuOpen(m => !m)} style={{ color: 'var(--text-muted)', padding: '0.25rem' }}>
                            <MoreHorizontal size={18} />
                        </button>
                        {menuOpen && (
                            <div className="neu-card-sm" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: 140, padding: '0.5rem' }}>
                                <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                    <Pencil size={14} /> Edit
                                </button>
                                <button onClick={() => { confirmDelete(); setMenuOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.88rem', color: 'var(--danger)' }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {editing ? (
                <div style={{ marginBottom: '1rem' }}>
                    <textarea className="neu-input" value={editText} onChange={e => setEditText(e.target.value)}
                        rows={3} style={{ resize: 'vertical', marginBottom: '0.75rem', fontFamily: 'inherit' }} autoFocus />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-neu" onClick={() => setEditing(false)} style={{ fontSize: '0.85rem' }}>Cancel</button>
                        <button className="btn btn-primary" onClick={saveEdit} disabled={saving} style={{ fontSize: '0.85rem' }}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {isLong && !expanded ? post.content.slice(0, CHAR_LIMIT) + '…' : post.content}
                    </p>
                    {isLong && (
                        <button
                            onClick={() => setExpanded(e => !e)}
                            style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.3rem', cursor: 'pointer' }}
                        >
                            {expanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}

            {/* Media */}
            {post.mediaUrls?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: post.mediaUrls.length > 1 ? '1fr 1fr' : '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    {post.mediaUrls.map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 300, objectFit: 'cover' }} />
                    ))}
                </div>
            )}

            <div className="divider" />

            {/* Actions */}
            <div className="post-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button onClick={() => onLike(post._id)} className={liked ? 'liked' : ''}>
                    <Heart size={16} fill={liked ? '#ef4444' : 'none'} /> {post.likeCount}
                </button>
                <button onClick={() => setCommentsOpen(o => !o)}>
                    <MessageCircle size={16} /> {post.commentCount}
                    <ChevronDown size={13} style={{ transform: commentsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}>
                    <Share2 size={16} /> Share
                </button>
            </div>

            {commentsOpen && <CommentSection postId={post._id} />}
        </div>
    );
}

// ─── Follow Toggle Button ─────────────────────────────────────────────────────
function FollowToggleBtn({ following, onToggle }: { following: boolean; onToggle: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onToggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                fontSize: '0.72rem', fontWeight: 600, border: 'none', borderRadius: 6,
                padding: '0.25rem 0.6rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: following
                    ? (hovered ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)')
                    : 'rgba(99,102,241,0.1)',
                color: following
                    ? (hovered ? 'var(--danger)' : 'var(--success)')
                    : 'var(--primary)',
            }}
        >
            {following ? (hovered ? 'Unfollow' : 'Following') : '+ Follow'}
        </button>
    );
}

// ─── Feed Sidebar ─────────────────────────────────────────────────────────────
const TRENDING = [
    { tag: '#DigitalEngineering', posts: 142 },
    { tag: '#CloudComputing', posts: 98 },
    { tag: '#NextJs', posts: 76 },
    { tag: '#TechCareers', posts: 64 },
    { tag: '#OpenSource', posts: 51 },
];

function FeedSidebar() {
    const myId = useAuthStore(s => s.user?.userId ?? '');
    const [suggestions, setSuggestions] = useState<{ _id: string; name: string; role: string }[]>([]);
    const [followed, setFollowed] = useState<Set<string>>(new Set());

    useEffect(() => {
        api.get('/api/v1/users/search?q=')
            .then(({ data }) => {
                const all: any[] = data.data || [];
                setSuggestions(all.filter((u: any) => u._id !== myId).slice(0, 4));
            })
            .catch(() => {});
    }, [myId]);

    const toggleFollow = async (id: string) => {
        const isFollowing = followed.has(id);
        // Optimistic update
        setFollowed(prev => { const s = new Set(prev); isFollowing ? s.delete(id) : s.add(id); return s; });
        try {
            if (isFollowing) {
                await api.delete(`/api/v1/users/${id}/follow`);
            } else {
                await api.post(`/api/v1/users/${id}/follow`);
            }
        } catch {
            // Revert on failure
            setFollowed(prev => { const s = new Set(prev); isFollowing ? s.add(id) : s.delete(id); return s; });
        }
    };

    return (
        <div className="feed-sidebar">
            {/* Trending Topics */}
            <div className="neu-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TrendingUp size={14} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Trending Topics</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {TRENDING.map(({ tag, posts }, i) => (
                        <div key={tag} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.6rem 0',
                            borderBottom: i < TRENDING.length - 1 ? '1px solid rgba(200,207,216,0.4)' : 'none',
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>{tag}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{posts} posts</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggested Connections */}
            <div className="neu-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <UserPlus size={14} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Suggested Connections</span>
                </div>
                {suggestions.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>No suggestions yet. Start following people to grow your network.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {suggestions.map(u => (
                            <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: '0.82rem', flexShrink: 0 }}>
                                    {u.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {u.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                                </div>
                                <FollowToggleBtn following={followed.has(u._id)} onToggle={() => toggleFollow(u._id)} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────
export default function FeedPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newPostPill, setNewPostPill] = useState(0);
    const user = useAuthStore(s => s.user);

    const fetchPosts = useCallback(async (cursor?: string) => {
        if (cursor) setLoadingMore(true); else setLoading(true);
        try {
            const q = cursor ? `?limit=20&cursor=${cursor}` : '?limit=20';
            const { data } = await api.get(`/api/v1/feed/posts${q}`);
            const items: Post[] = data.data || [];
            if (cursor) {
                setPosts(prev => [...prev, ...items]);
            } else {
                setPosts(items);
            }
            setNextCursor(data.nextCursor || null);
        } catch { toast.error('Failed to load feed'); }
        finally { setLoading(false); setLoadingMore(false); }
    }, []);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    // Real-time: new post pill
    useEffect(() => {
        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(); } catch { return; }

        const handler = () => setNewPostPill(n => n + 1);
        socket.on('feed:new_post', handler);
        return () => { socket.off('feed:new_post', handler); };
    }, []);

    const likePost = async (id: string) => {
        try {
            await api.post(`/api/v1/feed/posts/${id}/like`);
            setPosts(prev => prev.map(p => {
                if (p._id !== id) return p;
                const liked = p.likes.includes(user?.userId || '');
                return {
                    ...p,
                    likeCount: liked ? p.likeCount - 1 : p.likeCount + 1,
                    likes: liked ? p.likes.filter(l => l !== user?.userId) : [...p.likes, user?.userId || ''],
                };
            }));
        } catch { toast.error('Failed to like'); }
    };

    const onDelete = (id: string) => setPosts(prev => prev.filter(p => p._id !== id));
    const onEdit = (id: string, content: string) => setPosts(prev => prev.map(p => p._id === id ? { ...p, content } : p));
    const onCreated = (post: Post) => setPosts(prev => [post, ...prev]);

    const refreshFeed = () => { setNewPostPill(0); fetchPosts(); };

    return (
        <AppShell>
            <div className="feed-layout">
                {/* Main Feed */}
                <div>
                    <CreatePost onCreated={onCreated} />

                    {/* New post pill */}
                    {newPostPill > 0 && (
                        <button onClick={refreshFeed} className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '1rem', fontSize: '0.88rem', gap: '0.5rem', justifyContent: 'center' }}>
                            <RefreshCw size={14} /> {newPostPill} new post{newPostPill > 1 ? 's' : ''} — click to refresh
                        </button>
                    )}

                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 160, marginBottom: '1.25rem' }} />
                        ))
                    ) : posts.length === 0 ? (
                        <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No posts yet. Be the first to share something!
                        </div>
                    ) : posts.map(post => (
                        <PostCard key={post._id} post={post} myId={user?.userId || ''}
                            onLike={likePost} onDelete={onDelete} onEdit={onEdit} />
                    ))}

                    {/* Load more */}
                    {nextCursor && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button className="btn btn-neu" onClick={() => fetchPosts(nextCursor)} disabled={loadingMore}
                                style={{ fontSize: '0.88rem' }}>
                                {loadingMore ? 'Loading…' : 'Load more posts'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <FeedSidebar />
            </div>
        </AppShell>
    );
}
