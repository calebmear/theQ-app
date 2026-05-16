'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export type UserRole = 'admin' | 'management' | 'field';

type UserProfile = {
  id: string;
  full_name: string;
  role: UserRole;
  active: boolean;
};

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, active')
        .eq('id', user.id)
        .single();

      if (error || !data || !data.active) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setProfile(data);
      setLoadingProfile(false);
    }

    loadProfile();
  }, []);

  return {
    profile,
    loadingProfile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isManagement: profile?.role === 'management',
    isField: profile?.role === 'field',
  };
}
