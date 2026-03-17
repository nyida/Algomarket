'use client';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useState } from 'react';

type Mode = 'signin' | 'signup';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const supabaseReady = isSupabaseConfigured();

  if (!supabaseReady) {
    return (
      <div className="rounded-none p-4 text-sm" style={{ border: '1px solid var(--warning)', background: 'rgba(201,148,58,0.08)', color: 'var(--warning)' }}>
        <p className="font-medium">Log-in not configured</p>
        <p className="mt-1 opacity-80">
          Add <code className="research-code">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="research-code">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel → Settings → Environment Variables.
          Create a free project at supabase.com.
        </p>
      </div>
    );
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) { setError(err.message); return; }
        setSuccess('Account created! Check your email to confirm, or log in below.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) { setError(err.message); return; }
        window.location.href = '/chats';
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="space-y-4">
      {/* OAuth buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('github')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
          </svg>
          GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Mode toggle */}
      <div className="flex p-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        {(['signin', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setSuccess(null); setConfirmPassword(''); }}
            className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: mode === m ? 'var(--bg-elevated)' : 'transparent',
              color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {m === 'signin' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      {success && (
        <div className="p-3 text-sm" style={{ border: '1px solid var(--success)', background: 'rgba(106,158,106,0.08)', color: 'var(--success)' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        )}
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base w-full"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base w-full"
          required
          minLength={mode === 'signup' ? 6 : undefined}
        />
        {mode === 'signup' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-base w-full"
            required
            minLength={6}
          />
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? '…' : mode === 'signin' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
