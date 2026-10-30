'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import AppSplash from './AppSplash';

const publicRoutes = ['/', '/login'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      const isPublicRoute = publicRoutes.includes(pathname);
      if (!user && !isPublicRoute) {
        router.replace('/login');
        return;
      }
      setCheckingAuth(false);
    }
    void checkAuth();
    return () => { cancelled = true; };
  }, [pathname, router]);

  return <>
    <AppSplash />
    {checkingAuth && !publicRoutes.includes(pathname)
      ? <div aria-busy="true" aria-label="Checking sign-in" className="min-h-screen bg-gray-100" />
      : children}
  </>;
}
