'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

type QPosition = {
  left: number;
  top: number;
};

export default function LoginPage() {
  const router = useRouter();
  const titleQRef = useRef<HTMLSpanElement | null>(null);

  const [launching, setLaunching] = useState(false);
  const [launchQPosition, setLaunchQPosition] = useState<QPosition | null>(
    null
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setErrorMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage('Invalid email or password.');
      return;
    }

    const qRect = titleQRef.current?.getBoundingClientRect();

    if (qRect) {
      setLaunchQPosition({
        left: qRect.left,
        top: qRect.top,
      });
    }

    setLaunching(true);

    setTimeout(() => {
      sessionStorage.setItem('skipAppSplashOnce', 'true');
      router.push('/');
    }, 1700);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-gray-100 px-4 pt-40 text-black">
      <div
        className={`w-full max-w-sm rounded-2xl bg-white p-6 shadow transition-opacity duration-300 ${
          launching ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span
              className={`transition-opacity duration-300 ${
                launching ? 'opacity-0' : 'opacity-100'
              }`}
            >
              THE
            </span>

            <span
              ref={titleQRef}
              className={`inline-block pl-2 transition-opacity duration-150 ${
                launching ? 'opacity-0' : 'opacity-100'
              }`}
            >
              Q
            </span>
          </h1>

          <p className="mt-2 text-sm text-gray-600">Sign in to continue.</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border p-3"
              disabled={launching}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border p-3"
              disabled={launching}
            />
          </div>

          {errorMessage && (
            <p className="text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loading || launching}
            className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>

      {launching && launchQPosition && (
  <div className="fixed inset-0 z-[10000] bg-white">
    <div
className="animate-login-q-to-center fixed font-bold leading-none text-black"
style={
        {
          left: `${launchQPosition.left}px`,
          top: `${launchQPosition.top}px`,
          '--start-left': `${launchQPosition.left}px`,
          '--start-top': `${launchQPosition.top}px`,
          '--target-left': 'calc(50vw - var(--login-q-center-nudge))',
          '--target-top': '44vh',
        } as React.CSSProperties
      }
    >
      Q
    </div>
  </div>
)}
    </div>
  );
}
