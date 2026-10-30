'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setOpen(false);
      if (!user) {
        setEmail(''); setProfile(null); return;
      }
      setEmail(user.email ?? '');
      const { data, error } = await supabase.from('user_profiles')
        .select('full_name, role').eq('id', user.id).single();
      if (cancelled) return;
      if (error) { console.error('Error loading user profile:', error); setProfile(null); return; }
      setProfile(data ?? null);
    }
    void loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void loadUser(); });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) { setOpen(false); triggerRef.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const name = profile?.full_name || email || 'User';
  const role = formatRole(profile?.role ?? null);

  return <div ref={menuRef} className="relative min-w-0">
    <button ref={triggerRef} type="button" onClick={() => setOpen(value => !value)}
      aria-expanded={open} aria-controls={menuId} aria-label={`${name}${role ? `, ${role}` : ''}. Account options`}
      title={name}
      className="block min-h-11 min-w-[56px] max-w-[clamp(56px,24vw,112px)] rounded-lg p-0 text-center hover:bg-gray-100 md:max-w-[96px]">
      <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
      <span className="block truncate text-xs font-medium text-gray-500">{role}</span>
    </button>
    {open && <div id={menuId} className="absolute right-0 top-full z-50 mt-2 w-32 rounded-xl border bg-white p-2 shadow-lg">
      <button type="button" onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50">Log out</button>
    </div>}
  </div>;
}
