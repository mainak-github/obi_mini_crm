'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sprout } from 'lucide-react';
import { ACCESS_TOKEN_KEY, api, USER_KEY, User } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@miuicrm.dev');
  const [password, setPassword] = useState('DemoPass123!');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await api<{ accessToken: string; user: User }>(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, password }) });
      localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      router.push('/dashboard');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Sign-in failed. Please try again.'); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><div className="auth-orb orb-one"/><div className="auth-orb orb-two"/><section className="auth-card">
    <a className="brand brand-auth" href="/login"><span className="brand-mark"><Sprout size={19}/></span><span>OBI<span className="brand-light"> CRM</span></span></a>
    <div className="auth-kicker">A little more room to grow</div><h1>{mode === 'login' ? 'Good to see you.' : 'Make yourself at home.'}</h1><p className="auth-copy">Your people, your pipeline, all in one calm place.</p>
    <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button></div>
    <form className="auth-form" onSubmit={submit}>{mode === 'register' && <label>Your name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan"/></label>}
      <label>Work email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com"/></label>
      <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 10 : 1} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters"/></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button-primary auth-submit" disabled={loading}>{loading ? 'One moment…' : mode === 'login' ? 'Welcome back' : 'Create account'}<ArrowRight size={17}/></button>
    </form>
    <div className="demo-note"><span className="demo-dot"/><div><strong>Ready for a look around?</strong><br/><span>Use the demo account — it is already filled in above.</span></div></div>
    <div className="auth-foot"></div>
  </section></main>;
}
