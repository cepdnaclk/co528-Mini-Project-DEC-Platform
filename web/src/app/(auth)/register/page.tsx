'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = ['student', 'alumni'];

export default function RegisterPage() {
    const router = useRouter();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/api/v1/auth/register', form);
            setAuth(data.data.accessToken, {
                userId: data.data.userId,
                role: data.data.role,
                email: form.email,
                name: form.name,
            });
            toast.success('Account created! Welcome to DECP 🎉');
            router.push('/feed');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
            <div className="neu-card-lg" style={{ width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Sparkles size={20} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                        DE<span className="gradient-text">CP</span>
                    </span>
                </div>

                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create account</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    Join the DECP alumni-student network
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {[
                        { key: 'name', label: 'Full name', type: 'text', placeholder: 'John Silva' },
                        { key: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
                        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                    ].map(({ key, label, type, placeholder }) => (
                        <div key={key}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                                {label}
                            </label>
                            <input
                                className="neu-input"
                                type={type}
                                placeholder={placeholder}
                                value={(form as any)[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                required
                            />
                        </div>
                    ))}

                    {/* Role selector */}
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
                            I am a…
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {ROLES.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, role }))}
                                    className={form.role === role ? 'btn btn-primary' : 'btn btn-neu'}
                                    style={{ flex: 1, textTransform: 'capitalize' }}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '0.5rem', fontSize: '1rem', padding: '0.85rem' }}
                    >
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <div className="divider" style={{ margin: '1.5rem 0' }} />
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
