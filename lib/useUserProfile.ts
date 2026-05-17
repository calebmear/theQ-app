'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

type UserProfile = {
  role: string | null;
  fullName: string | null;
  loading: boolean;
};

export function useUserProfile(): UserProfile {
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    setLoading(true);
    setRole(null);
    setFullName(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading user profile:', error);
      setLoading(false);
      return;
    }

    setRole(data?.role ?? null);
    setFullName(data?.full_name ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { role, fullName, loading };
}
