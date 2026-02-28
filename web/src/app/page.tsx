'use client';
import Link from 'next/link';
import { Sparkles, ArrowRight, Zap, Users, MessageSquare, FlaskConical } from 'lucide-react';

const features = [
    { icon: Zap, label: 'Real-time Feed', desc: 'Posts, likes and comments with instant WebSocket delivery' },
    { icon: Users, label: 'Alumni Network', desc: 'Connect students with alumni mentors across disciplines' },
    { icon: MessageSquare, label: 'Live Chat', desc: '1:1 messaging powered by socket.io' },
    { icon: FlaskConical, label: 'Research Projects', desc: 'Discover and join research collaborations' },
];

export default function LandingPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
            {/* Nav */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 3rem',
                background: 'var(--bg)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Sparkles size={18} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                        DE<span className="gradient-text">CP</span>
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link href="/login" className="btn btn-neu" style={{ fontSize: '0.9rem', padding: '0.55rem 1.2rem' }}>
                        Sign In
                    </Link>
                    <Link href="/register" className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.55rem 1.2rem' }}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{
                padding: '5rem 3rem 4rem',
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
                maxWidth: 1200, margin: '0 auto',
            }}>
                <div>
                    <div className="badge" style={{ marginBottom: '1.5rem', fontSize: '0.7rem' }}>
                        ✨ Digital Engineering Community
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Connect.<br />
                        <span className="gradient-text">Collaborate.</span>
                    </h1>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                        Grow.
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 420 }}>
                        DECP bridges the gap between alumni and students — a private network for mentorship, research, and career opportunities.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link href="/register" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}>
                            Join the Network <ArrowRight size={18} />
                        </Link>
                        <Link href="/login" className="btn btn-neu" style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}>
                            Sign In
                        </Link>
                    </div>
                </div>

                {/* Hero card mockup */}
                <div style={{ position: 'relative' }}>
                    <div className="neu-card-lg hover-lift" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="avatar-fallback" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>A</div>
                            <div>
                                <div style={{ fontWeight: 700 }}>Alumni Mentor</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Senior Engineer @ Google</div>
                            </div>
                            <div className="badge" style={{ marginLeft: 'auto' }}>Open to Mentor</div>
                        </div>
                        <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                "Looking for final-year students interested in distributed systems for a 3-month mentorship program..."
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {['Distributed Systems', 'Cloud Run', 'Go'].map(t => (
                                <span key={t} className="chip">{t}</span>
                            ))}
                        </div>
                    </div>

                    {/* Floating notification */}
                    <div className="neu-card-sm" style={{
                        position: 'absolute', bottom: -20, right: -20,
                        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>3 new messages</span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '3rem', maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div className="section-label">Platform Features</div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Everything you need to connect</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {features.map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="neu-card hover-lift" style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 14, background: 'var(--gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem',
                            }}>
                                <Icon size={22} color="#fff" />
                            </div>
                            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{label}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature tags */}
            <section style={{ padding: '2rem 3rem 4rem', textAlign: 'center', maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Social Feed', 'Job Board', 'Live Events', 'Research Hub', 'Real-time Chat', 'Push Notifications'].map(tag => (
                        <span key={tag} className="chip">{tag}</span>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ background: 'var(--bg-dark)', padding: '2rem 3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                © 2026 DECP Platform · Built with Next.js + Node.js microservices
            </footer>
        </div>
    );
}
