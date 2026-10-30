'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const busy = useRef(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (busy.current) return;
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Enter username and password.');
      return;
    }
    busy.current = true;
    setLoading(true);
    let navigating = false;
    try {
      const { data: loginProfile, error: loginProfileError } = await supabase
        .from('user_profiles').select('email').ilike('username', username.trim()).single();
      if (loginProfileError || !loginProfile?.email) {
        setErrorMessage('Username was not found or profile email is missing.');
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginProfile.email, password,
      });
      if (error || !data.user) {
        setErrorMessage('Password failed for the email tied to this username.');
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles').select('role, active').eq('id', data.user.id).single();
      if (profileError || !profile || profile.active === false) {
        await supabase.auth.signOut();
        setErrorMessage('Your account is not active.');
        return;
      }
      try { sessionStorage.setItem('theqLoginIntroPending', 'true'); } catch {}
      const userRole = String(profile.role).trim().toLowerCase();
      router.replace(userRole === 'field' ? '/activework' : '/dashboard');
      navigating = true;
    } catch {
      setErrorMessage('Could not sign in. Check your connection and try again.');
    } finally {
      if (!navigating) { busy.current = false; setLoading(false); }
    }
  }

  return <div className="flex min-h-screen items-start justify-center bg-gray-100 px-4 pt-20 text-black sm:pt-32">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
      <div className="text-center">
        <h1 className="text-3xl font-bold">THE Q</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to continue.</p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void login(); }}>
        <div>
          <label htmlFor="login-username" className="mb-2 block text-sm font-medium">Username</label>
          <input id="login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={username} onChange={event => setUsername(event.target.value.toLowerCase())}
            className="w-full rounded-lg border p-3" disabled={loading} />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-medium">Password</label>
          <input id="login-password" type="password" autoComplete="current-password"
            value={password} onChange={event => setPassword(event.target.value)}
            className="w-full rounded-lg border p-3" disabled={loading} />
        </div>
        {errorMessage && <p role="alert" className="text-sm font-medium text-red-600">{errorMessage}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-[#16324f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10263d] disabled:opacity-60">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  </div>;
}
