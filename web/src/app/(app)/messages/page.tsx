'use client';
import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Conversation { userId: string; name: string; lastMessage: string; updatedAt: string; }
interface Message { _id: string; senderId: string; content: string; createdAt: string; }

export default function MessagesPage() {
    const user = useAuthStore(s => s.user);
    const [inbox, setInbox] = useState<Conversation[]>([]);
    const [activeUser, setActiveUser] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const loadInbox = async () => {
        try {
            const { data } = await api.get('/api/v1/messages/inbox');
            setInbox(data.data || []);
        } catch { /* ignore */ }
    };

    const loadThread = async (userId: string) => {
        try {
            const { data } = await api.get(`/api/v1/messages/conversation/${userId}`);
            setMessages(data.data || []);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { toast.error('Failed to load thread'); }
    };

    const sendMessage = async () => {
        if (!text.trim() || !activeUser) return;
        const content = text;
        setText('');
        try {
            await api.post('/api/v1/messages/send', { recipientId: activeUser.userId, content });
            loadThread(activeUser.userId);
        } catch { toast.error('Failed to send'); }
    };

    useEffect(() => { loadInbox(); }, []);

    useEffect(() => {
        if (!activeUser) return;
        const socket = getSocket();
        const handler = (msg: Message) => {
            if (msg.senderId === activeUser.userId || msg.senderId === user?.userId) {
                setMessages(prev => [...prev, msg]);
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            }
        };
        socket.on('message', handler);
        socket.on('message:sent', handler);
        return () => { socket.off('message', handler); socket.off('message:sent', handler); };
    }, [activeUser]);

    return (
        <AppShell>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', height: 'calc(100vh - 150px)' }}>
                {/* Inbox */}
                <div className="neu-card" style={{ overflow: 'auto', padding: '1rem' }}>
                    <div className="section-label" style={{ marginBottom: '1rem' }}>Conversations</div>
                    {inbox.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>No messages yet</p>
                    ) : inbox.map((conv) => (
                        <div
                            key={conv.userId}
                            onClick={() => { setActiveUser(conv); loadThread(conv.userId); }}
                            className={`nav-item${activeUser?.userId === conv.userId ? ' active' : ''}`}
                            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', padding: '0.75rem', marginBottom: '0.25rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                                <div className="avatar-fallback" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                                    {conv.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{conv.name || 'User'}</div>
                                    <div style={{ fontSize: '0.78rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {conv.lastMessage}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat panel */}
                <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {!activeUser ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Send size={28} color="#fff" />
                            </div>
                            <p>Select a conversation to start chatting</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(200,207,216,0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="avatar-fallback" style={{ width: 38, height: 38 }}>
                                    {activeUser.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ fontWeight: 700 }}>{activeUser.name || 'User'}</div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {messages.map((msg) => (
                                    <div key={msg._id} style={{ display: 'flex', flexDirection: msg.senderId === user?.userId ? 'row-reverse' : 'row' }}>
                                        <div className={`chat-bubble ${msg.senderId === user?.userId ? 'mine' : 'theirs'}`}>
                                            {msg.content}
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.25rem', textAlign: 'right' }}>
                                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(200,207,216,0.5)', display: 'flex', gap: '0.75rem' }}>
                                <input
                                    className="neu-input"
                                    placeholder="Type a message…"
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary" onClick={sendMessage} style={{ padding: '0.65rem 1.2rem' }}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
