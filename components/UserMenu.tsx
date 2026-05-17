'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

type UserProfile = {
  full_name: string;
  role: 'admin' | 'management' | 'field';
};

function formatRole(role: UserProfile['role'] | null) {
  if (role === 'admin') return 'Admin';
  if (role === 'management') return 'Management';
  if (role === 'field') return 'Field';

  return '';
}

export default function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setOpen(false);

      if (!user) {
        setEmail('');
        setProfile(null);
        return;
      }

      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  async function logout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="min-w-[72px] max-w-[140px] rounded-lg px-2 py-1 text-center hover:bg-gray-100"
      >
        <p className="truncate text-sm font-semibold text-gray-900">
          {profile?.full_name || email || 'User'}
        </p>

        <p className="text-xs font-medium text-gray-500">
          {formatRole(profile?.role ?? null)}
        </p>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-32 rounded-xl border bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
