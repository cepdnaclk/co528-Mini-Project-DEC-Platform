'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { Calendar, MapPin, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Event {
    _id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    type: string;
    rsvpCount: number;
    participantIds: string[];
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const { data } = await api.get('/api/v1/events?limit=20');
            setEvents(data.data || []);
        } catch { toast.error('Failed to load events'); }
        finally { setLoading(false); }
    };

    const rsvp = async (id: string) => {
        try {
            await api.post(`/api/v1/events/${id}/rsvp`);
            toast.success('RSVP confirmed!');
            fetchEvents();
        } catch (e: any) { toast.error(e.response?.data?.error || 'Already RSVPed'); }
    };

    useEffect(() => { fetchEvents(); }, []);

    return (
        <AppShell>
            <div className={events.length > 0 ? "grid-cols-3" : ""}>
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)
                ) : events.length === 0 ? (
                    <div className="neu-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                        No events yet.
                    </div>
                ) : events.map(ev => (
                    <div key={ev._id} className="neu-card hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{ev.title}</h3>
                            <span className="badge">{ev.type}</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                            {ev.description?.slice(0, 120)}{ev.description?.length > 120 ? '…' : ''}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Calendar size={13} /> {ev.date ? format(new Date(ev.date), 'PPP') : 'TBD'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <MapPin size={13} /> {ev.location}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Users size={13} /> {ev.rsvpCount} attending
                            </span>
                        </div>
                        <button className="btn btn-primary" onClick={() => rsvp(ev._id)} style={{ marginTop: 'auto', fontSize: '0.85rem', gap: '0.4rem' }}>
                            <Check size={15} /> RSVP
                        </button>
                    </div>
                ))}
            </div>
        </AppShell>
    );
}
