'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Calendar, MapPin, Users, Check, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Event {
    _id: string;
    title: string;
    description: string;
    eventDate: string;
    location: string;
    rsvpCount: number;
    creatorId: string;
    participantIds: string[];
}

// ─── Create Event Modal ───────────────────────────────────────────────────────
function CreateEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (ev: Event) => void }) {
    const [form, setForm] = useState({ title: '', description: '', eventDate: '', location: '' });
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/api/v1/events', form);
            toast.success('Event created!');
            onSuccess(data.data);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to create event');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.2rem' }}>Create Event</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { key: 'title', label: 'Title', placeholder: 'e.g. Tech Talk: AI in 2026' },
                        { key: 'location', label: 'Location', placeholder: 'e.g. Engineering Block A / Online' },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                            <input className="neu-input" placeholder={placeholder} value={(form as any)[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
                        </div>
                    ))}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Date & Time</label>
                        <input className="neu-input" type="datetime-local" value={form.eventDate}
                            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Description</label>
                        <textarea className="neu-input" rows={3} placeholder="Describe the event…" value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }} required />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-neu" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Event'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventDetailModal({ event, myId, onClose, onRsvpChange }: {
    event: Event; myId: string; onClose: () => void; onRsvpChange: (id: string, joined: boolean) => void;
}) {
    const isRsvpd = event.participantIds?.includes(myId);
    const [loading, setLoading] = useState(false);

    const toggleRsvp = async () => {
        setLoading(true);
        try {
            if (isRsvpd) {
                await api.delete(`/api/v1/events/${event._id}/rsvp`);
                onRsvpChange(event._id, false);
                toast.success('RSVP cancelled');
            } else {
                await api.post(`/api/v1/events/${event._id}/rsvp`);
                onRsvpChange(event._id, true);
                toast.success('RSVP confirmed!');
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '1.3rem', flex: 1, marginRight: '1rem' }}>{event.title}</h2>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)', flexShrink: 0 }}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>{event.description}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={15} /> {event.eventDate ? format(new Date(event.eventDate), 'PPPp') : 'TBD'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={15} /> {event.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={15} /> {event.rsvpCount} attending
                    </span>
                </div>
                <button className="btn btn-primary" onClick={toggleRsvp} disabled={loading}
                    style={{ width: '100%', background: isRsvpd ? '#ef4444' : undefined, boxShadow: isRsvpd ? '0 4px 15px rgba(239,68,68,0.4)' : undefined }}>
                    {loading ? '…' : isRsvpd ? 'Cancel RSVP' : <><Check size={15} /> RSVP</>}
                </button>
            </div>
        </div>
    );
}

// ─── Events Page ──────────────────────────────────────────────────────────────
export default function EventsPage() {
    const user = useAuthStore(s => s.user);
    const myId = user?.userId || '';
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [detailEvent, setDetailEvent] = useState<Event | null>(null);
    const [rsvpdIds, setRsvpdIds] = useState<Set<string>>(new Set());

    const fetchEvents = async () => {
        try {
            const { data } = await api.get('/api/v1/events?limit=30');
            const items: Event[] = data.data || [];
            setEvents(items);
            // Track which we've RSVP'd to
            const already = new Set(items.filter(e => e.participantIds?.includes(myId)).map(e => e._id));
            setRsvpdIds(already);
        } catch { toast.error('Failed to load events'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEvents(); }, [myId]);

    const handleRsvpChange = (id: string, joined: boolean) => {
        setRsvpdIds(prev => {
            const next = new Set(prev);
            joined ? next.add(id) : next.delete(id);
            return next;
        });
        setEvents(prev => prev.map(e => e._id === id ? {
            ...e,
            rsvpCount: e.rsvpCount + (joined ? 1 : -1),
            participantIds: joined ? [...(e.participantIds || []), myId] : (e.participantIds || []).filter(i => i !== myId),
        } : e));
        // Update detail modal if open
        if (detailEvent?._id === id) {
            setDetailEvent(prev => prev ? {
                ...prev,
                rsvpCount: prev.rsvpCount + (joined ? 1 : -1),
                participantIds: joined ? [...(prev.participantIds || []), myId] : (prev.participantIds || []).filter(i => i !== myId),
            } : null);
        }
    };

    const isAdmin = user?.role === 'admin';

    return (
        <AppShell>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap: '0.4rem' }}>
                        <Plus size={16} /> Create Event
                    </button>
                )}
            </div>

            <div className={events.length > 0 ? 'grid-cols-3' : ''}>
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)
                ) : events.length === 0 ? (
                    <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                        No events yet.
                    </div>
                ) : events.map(ev => {
                    const isRsvpd = rsvpdIds.has(ev._id);
                    return (
                        <div key={ev._id} className="neu-card hover-lift"
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer' }}
                            onClick={() => setDetailEvent(ev)}>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, flex: 1 }}>
                                {ev.description?.slice(0, 100)}{ev.description?.length > 100 ? '…' : ''}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Calendar size={13} /> {ev.eventDate ? format(new Date(ev.eventDate), 'PPP') : 'TBD'}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <MapPin size={13} /> {ev.location}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Users size={13} /> {ev.rsvpCount} attending
                                </span>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleRsvpChange(ev._id, !isRsvpd);
                                    if (!isRsvpd) {
                                        api.post(`/api/v1/events/${ev._id}/rsvp`).catch(() => { handleRsvpChange(ev._id, false); toast.error('RSVP failed'); });
                                    } else {
                                        api.delete(`/api/v1/events/${ev._id}/rsvp`).catch(() => { handleRsvpChange(ev._id, true); toast.error('Cancel failed'); });
                                    }
                                }}
                                style={{ marginTop: 'auto', fontSize: '0.85rem', gap: '0.4rem', background: isRsvpd ? '#ef4444' : undefined, boxShadow: isRsvpd ? '0 4px 12px rgba(239,68,68,0.35)' : undefined }}>
                                {isRsvpd ? 'Cancel RSVP' : <><Check size={15} /> RSVP</>}
                            </button>
                        </div>
                    );
                })}
            </div>

            {showCreate && (
                <CreateEventModal onClose={() => setShowCreate(false)} onSuccess={(ev) => { setEvents(prev => [ev, ...prev]); setShowCreate(false); }} />
            )}
            {detailEvent && (
                <EventDetailModal event={detailEvent} myId={myId} onClose={() => setDetailEvent(null)} onRsvpChange={handleRsvpChange} />
            )}
        </AppShell>
    );
}
