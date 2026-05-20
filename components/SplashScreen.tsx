'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function SplashScreen() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/activework');
        return;
      }

      setCheckingSession(false);
    }

    checkSession();
  }, [router]);

  async function signIn() {
    if (!email.trim() || !password || signingIn) return;

    setSigningIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSigningIn(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.replace('/activework');
  }

  if (checkingSession) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-black">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold">THE Q</h1>

        <div className="mt-6 space-y-3">
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
              if (e.key === 'Enter') signIn();
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
      </div>
    </main>
  );
}