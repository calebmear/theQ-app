'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const publicRoutes = ['/login'];

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isPublicRoute = publicRoutes.includes(pathname);

      if (!user && !isPublicRoute) {
        router.replace('/login');
        return;
      }

      

      setCheckingAuth(false);
    }

    checkAuth();
  }, [pathname, router]);

  if (checkingAuth && !publicRoutes.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-black">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
