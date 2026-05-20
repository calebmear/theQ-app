'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Enter username and password.');
      return;
    }

    setLoading(true);

    const { data: loginProfile, error: loginProfileError } = await supabase
      .from('user_profiles')
      .select('email')
      .ilike('username', username.trim())
      .single();

    if (loginProfileError || !loginProfile?.email) {
      console.error('Username lookup failed:', loginProfileError, loginProfile);
      setLoading(false);
      setErrorMessage('Username was not found or profile email is missing.');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginProfile.email,
      password,
    });

    if (error || !data.user) {
      console.error('Auth login failed:', error);
      setLoading(false);
      setErrorMessage('Password failed for the email tied to this username.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, active')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile || profile.active === false) {
      await supabase.auth.signOut();
      setErrorMessage('Your account is not active.');
      return;
    }

    const userRole = String(profile.role).trim().toLowerCase();

    if (userRole === 'field') {
      router.replace('/activework');
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-100 px-4 pt-40 text-black">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">THE Q</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to continue.</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') login();
              }}
              className="w-full rounded-lg border p-3"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') login();
              }}
              className="w-full rounded-lg border p-3"
              disabled={loading}
            />
          </div>

          {errorMessage && (
            <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="w-full rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}