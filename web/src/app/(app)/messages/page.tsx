'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket, isUserOnline, onPresenceChange, refreshUserPresence } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { Send, Plus, Trash2, Check, CheckCheck, Search, X, MessageSquare, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InboxItem {
    _id: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
    isRead: boolean;
    unreadCount: number;
    createdAt: string;
    // enriched
    otherUserId: string;
    otherUserName: string;
}

interface Message {
    _id: string;
    senderId: string;
    recipientId: string;
    conversationId: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

interface UserResult {
    _id: string;
    name: string;
    role: string;
    avatarUrl?: string;
}

// ─── User Search Modal ────────────────────────────────────────────────────────
function UserSearchModal({ onSelect, onClose }: { onSelect: (user: UserResult) => void; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/api/v1/users/search?q=${encodeURIComponent(query)}`);
                setResults(data.data || []);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 420, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>New Conversation</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="neu-input" placeholder="Search by name…" value={query}
                        onChange={e => setQuery(e.target.value)} style={{ paddingLeft: '2.4rem' }} autoFocus />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Searching…</p>}
                    {!loading && results.length === 0 && query.trim() && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No users found.</p>
                    )}
                    {results.map(u => (
                        <div key={u._id} onClick={() => onSelect(u)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
            </div>
        </div>
    );
}

// ─── Messages Page ────────────────────────────────────────────────────────────
export default function MessagesPage() {
    const user = useAuthStore(s => s.user);
    const myId = user?.userId ?? '';

    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [activeOtherUser, setActiveOtherUser] = useState<{ id: string; name: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showChatMobile, setShowChatMobile] = useState(false);
    const [, forcePresenceUpdate] = useState(0);

    const bottomRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Subscribe to presence changes for re-render
    useEffect(() => {
        const unsub = onPresenceChange(() => forcePresenceUpdate(n => n + 1));
        return unsub;
    }, []);

    useEffect(() => {
        if (!activeOtherUser?.id) return;
        const refresh = () => {
            refreshUserPresence(activeOtherUser.id).catch(() => {});
        };

        refresh();
        const interval = setInterval(refresh, 5000);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') refresh();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [activeOtherUser?.id]);

    // ── Inbox ──────────────────────────────────────────────────────────────────
    const loadInbox = useCallback(async () => {
        try {
            const { data } = await api.get('/api/v1/messages/inbox');
            const raw: any[] = data.data || [];
            // Collect unique other-user IDs to resolve names
            const otherIds = [...new Set(raw.map((item: any) => {
                const parts = item.conversationId?.split('_') || [];
                return parts.find((p: string) => p !== myId) || item.senderId;
            }))];
            // Fetch names in parallel
            const nameMap: Record<string, string> = {};
            await Promise.all(otherIds.map(async (id) => {
                try {
                    const { data: ud } = await api.get(`/api/v1/users/${id}`);
                    nameMap[id] = ud.data?.name || 'User';
                } catch { nameMap[id] = 'User'; }
            }));
            const items: InboxItem[] = raw.map((item: any) => {
                const parts = item.conversationId?.split('_') || [];
                const otherId = parts.find((p: string) => p !== myId) || item.senderId;
                return { ...item, otherUserId: otherId, otherUserName: nameMap[otherId] || 'User' };
            });
            setInbox(items);
        } catch { /* ignore */ }
    }, [myId]);

    useEffect(() => { loadInbox(); }, [loadInbox]);

    // ── Load thread ────────────────────────────────────────────────────────────
    const loadThread = useCallback(async (otherUserId: string) => {
        try {
            const { data } = await api.get(`/api/v1/messages/conversation/${otherUserId}`);
            const msgs: Message[] = data.data || [];
            setMessages(msgs);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

            // Mark unread messages as read
            msgs.filter(m => m.recipientId === myId && !m.isRead).forEach(m => {
                api.put(`/api/v1/messages/${m._id}/read`).catch(() => {});
            });
            // Reset unread count in inbox
            setInbox(prev => prev.map(c => c.otherUserId === otherUserId ? { ...c, unreadCount: 0 } : c));
        } catch { toast.error('Failed to load messages'); }
    }, [myId]);

    // ── Open conversation ──────────────────────────────────────────────────────
    const openConversation = useCallback((otherId: string, otherName: string, convId?: string) => {
        const cid = convId || [myId, otherId].sort().join('_');
        setActiveConvId(cid);
        setActiveOtherUser({ id: otherId, name: otherName });
        setIsTyping(false);
        setShowChatMobile(true);
        loadThread(otherId);
    }, [myId, loadThread]);

    // Auto-open conversation when navigated from profile page (MUST be after openConversation is defined)
    useEffect(() => {
        const stored = sessionStorage.getItem('openMessageTo');
        if (!stored || !myId) return;
        try {
            const { id, name } = JSON.parse(stored);
            sessionStorage.removeItem('openMessageTo');
            openConversation(id, name);
        } catch { sessionStorage.removeItem('openMessageTo'); }
    }, [myId, openConversation]);

    // ── Socket events ──────────────────────────────────────────────────────────
    useEffect(() => {
        let socket: ReturnType<typeof getSocket>;
        try { socket = getSocket(); } catch { return; }

        const onMessage = (msg: Message) => {
            const isActive = activeConvId && (msg.conversationId === activeConvId);

            if (isActive) {
                setMessages(prev => [...prev, msg]);
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                if (msg.recipientId === myId) {
                    api.put(`/api/v1/messages/${msg._id}/read`).catch(() => {});
                }
            }

            // Upsert inbox
            setInbox(prev => {
                const parts = msg.conversationId.split('_');
                const otherId = parts.find(p => p !== myId) || msg.senderId;
                const exists = prev.find(c => c.conversationId === msg.conversationId);
                const newItem: InboxItem = {
                    ...msg, otherUserId: otherId, otherUserName: 'User', unreadCount: isActive ? 0 : 1,
                };
                if (exists) {
                    return prev.map(c => c.conversationId === msg.conversationId
                        ? { ...c, content: msg.content, createdAt: msg.createdAt, unreadCount: isActive ? 0 : (c.unreadCount || 0) + 1 }
                        : c
                    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                }
                return [newItem, ...prev];
            });
        };

        const onMessageRead = ({ messageId }: { messageId: string; conversationId: string }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isRead: true } : m));
        };

        const onTypingStart = ({ senderId, conversationId }: { senderId: string; conversationId: string }) => {
            if (senderId === activeOtherUser?.id && conversationId === activeConvId) setIsTyping(true);
        };

        const onTypingStop = ({ senderId }: { senderId: string }) => {
            if (senderId === activeOtherUser?.id) setIsTyping(false);
        };

        socket.on('message', onMessage);
        socket.on('message:sent', onMessage);
        socket.on('message:read', onMessageRead);
        socket.on('typing:start', onTypingStart);
        socket.on('typing:stop', onTypingStop);

        return () => {
            socket.off('message', onMessage);
            socket.off('message:sent', onMessage);
            socket.off('message:read', onMessageRead);
            socket.off('typing:start', onTypingStart);
            socket.off('typing:stop', onTypingStop);
        };
    }, [activeConvId, activeOtherUser, myId]);

    // ── Send message ───────────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!text.trim() || !activeOtherUser || isSending) return;
        const content = text.trim();
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsSending(true);

        // Stop typing indicator
        try { getSocket().emit('typing:stop', { recipientId: activeOtherUser.id, conversationId: activeConvId }); } catch {}
        clearTimeout(typingTimeoutRef.current);

        try {
            await api.post('/api/v1/messages/send', { recipientId: activeOtherUser.id, content });
            loadThread(activeOtherUser.id);
        } catch { toast.error('Failed to send'); setText(content); }
        finally { setIsSending(false); }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        // Auto-resize
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';

        // Typing indicators
        if (!activeOtherUser || !activeConvId) return;
        try {
            getSocket().emit('typing:start', { recipientId: activeOtherUser.id, conversationId: activeConvId });
        } catch {}
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            try { getSocket().emit('typing:stop', { recipientId: activeOtherUser.id, conversationId: activeConvId }); } catch {}
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ── Delete message ─────────────────────────────────────────────────────────
    const deleteMessage = async (msgId: string) => {
        setMessages(prev => prev.filter(m => m._id !== msgId));
        try { await api.delete(`/api/v1/messages/${msgId}`); }
        catch { toast.error('Failed to delete'); loadThread(activeOtherUser!.id); }
    };

    // ── Read receipt icon ──────────────────────────────────────────────────────
    const ReadReceipt = ({ msg }: { msg: Message }) => {
        if (msg.senderId !== myId) return null;
        return msg.isRead
            ? <CheckCheck size={12} style={{ color: '#3b82f6', marginTop: 2 }} />
            : <Check size={12} style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }} />;
    };

    const activeInboxItem = inbox.find(c => c.conversationId === activeConvId);

    return (
        <AppShell>
            <div className={`messages-layout${showChatMobile ? ' chat-active' : ''}`}>

                {/* ── Inbox Panel ────────────────────────────────────────────── */}
                <div className="neu-card messages-inbox" style={{ overflow: 'hidden', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Conversations</div>
                        <button className="btn btn-primary" onClick={() => setShowSearch(true)}
                            style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                            title="New conversation">
                            <Plus size={16} />
                        </button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {inbox.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                <MessageSquare size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                                <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>No conversations yet</p>
                                <button className="btn btn-primary" onClick={() => setShowSearch(true)} style={{ fontSize: '0.82rem' }}>
                                    Find someone to message
                                </button>
                            </div>
                        ) : inbox.map((conv) => {
                            const online = isUserOnline(conv.otherUserId);
                            const isActive = activeConvId === conv.conversationId;
                            return (
                                <div key={conv.conversationId}
                                    onClick={() => openConversation(conv.otherUserId, conv.otherUserName, conv.conversationId)}
                                    className={`nav-item${isActive ? ' active' : ''}`}
                                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', padding: '0.75rem', marginBottom: '0.25rem', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                        {/* Avatar with presence dot */}
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                                                {conv.otherUserName?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span style={{
                                                position: 'absolute', bottom: 0, right: 0, width: 9, height: 9,
                                                borderRadius: '50%', border: '2px solid var(--bg)',
                                                background: online ? '#22c55e' : '#94a3b8',
                                            }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: conv.unreadCount > 0 ? 700 : 600, fontSize: '0.9rem' }}>{conv.otherUserName}</div>
                                                {conv.unreadCount > 0 && (
                                                    <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, padding: '0 4px' }}>
                                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                                                {conv.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Chat Panel ─────────────────────────────────────────────── */}
                <div className="neu-card messages-chat" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {!activeOtherUser ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={28} color="#fff" />
                            </div>
                            <p>Select a conversation to start chatting</p>
                            <button className="btn btn-primary" onClick={() => setShowSearch(true)} style={{ fontSize: '0.85rem' }}>
                                <Plus size={14} style={{ marginRight: 4 }} /> New Conversation
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(200,207,216,0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Back button — mobile only */}
                                <button className="mobile-menu-btn" onClick={() => setShowChatMobile(false)} aria-label="Back to conversations">
                                    <ArrowLeft size={20} />
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <div className="avatar-fallback" style={{ width: 38, height: 38 }}>
                                        {activeOtherUser.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <span style={{
                                        position: 'absolute', bottom: 0, right: 0, width: 10, height: 10,
                                        borderRadius: '50%', border: '2px solid var(--surface)',
                                        background: isUserOnline(activeOtherUser.id) ? '#22c55e' : '#94a3b8',
                                    }} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{activeOtherUser.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: isTyping ? 'var(--primary)' : 'var(--text-muted)' }}>
                                        {isTyping ? 'typing…' : isUserOnline(activeOtherUser.id) ? 'Online' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages list */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {messages.length === 0 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                                        <div className="avatar-fallback" style={{ width: 52, height: 52, fontSize: '1.3rem' }}>
                                            {activeOtherUser.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <p style={{ fontSize: '0.9rem' }}>Start a conversation with {activeOtherUser.name}</p>
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isMine = msg.senderId === myId;
                                    return (
                                        <div key={msg._id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '0.5rem' }}
                                            className="message-row">
                                            <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ maxWidth: '70%' }}>
                                                {msg.content}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem', marginTop: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>
                                                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                                    </span>
                                                    <ReadReceipt msg={msg} />
                                                </div>
                                            </div>
                                            {isMine && (
                                                <button className="msg-delete-btn" onClick={() => deleteMessage(msg._id)}
                                                    title="Delete" style={{ color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.15s', padding: '0.2rem' }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Typing bubble */}
                                {isTyping && (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <div className="chat-bubble theirs" style={{ padding: '0.6rem 1rem' }}>
                                            <div className="typing-dots">
                                                <span /><span /><span />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(200,207,216,0.5)', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                                <textarea
                                    ref={textareaRef}
                                    className="neu-input"
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    value={text}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    disabled={isSending}
                                    rows={1}
                                    style={{ flex: 1, resize: 'none', overflow: 'hidden', fontFamily: 'inherit', minHeight: 42 }}
                                />
                                <button className="btn btn-primary" onClick={sendMessage} disabled={isSending || !text.trim()}
                                    style={{ padding: '0.65rem 1.2rem', alignSelf: 'flex-end', flexShrink: 0 }}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* User search modal */}
            {showSearch && (
                <UserSearchModal
                    onSelect={(u) => { setShowSearch(false); openConversation(u._id, u.name); }}
                    onClose={() => setShowSearch(false)}
                />
            )}
        </AppShell>
    );
}
