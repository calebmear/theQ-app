'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useUserProfile } from '../lib/useUserProfile';

export default function SplashScreen() {
  const router = useRouter();
  const { role } = useUserProfile();

  const [introDone, setIntroDone] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const normalizedRole = role ? String(role).trim().toLowerCase() : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIntroDone(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!normalizedRole) return;

    if (normalizedRole === 'admin' || normalizedRole === 'management') {
      router.replace('/dashboard');
      return;
    }

    if (normalizedRole === 'field') {
      router.replace('/activework');
    }
  }, [normalizedRole, router]);

  async function signIn() {
    if (!email.trim() || !password) return;

    setSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSigningIn(false);

    if (error) {
      alert(error.message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-black">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="animate-login-q mx-auto text-7xl font-bold leading-none">
            Q
          </div>

          {introDone && (
            <div className="animate-login-form mt-10 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none focus:border-black"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    signIn();
                  }
                }}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-lg border px-3 py-3 text-sm outline-none focus:border-black"
              />

              <button
                type="button"
                onClick={signIn}
                disabled={signingIn}
                className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {signingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
