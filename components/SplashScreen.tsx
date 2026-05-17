'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../lib/useUserProfile';

export default function SplashScreen() {
  const router = useRouter();
  const { role } = useUserProfile();
  const [showLogo, setShowLogo] = useState(false);

  const normalizedRole = role ? String(role).trim().toLowerCase() : null;

  useEffect(() => {
    if (!normalizedRole) return;

    const destination =
      normalizedRole === 'admin' || normalizedRole === 'management'
        ? '/dashboard'
        : '/activework';

    const alreadySeen = sessionStorage.getItem('qpiSplashSeen');

    if (alreadySeen) {
      router.replace(destination);
      return;
    }

    sessionStorage.setItem('qpiSplashSeen', 'true');
    setShowLogo(true);

    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [normalizedRole, router]);

  if (!showLogo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center bg-white pt-[36vh]">
      <div className="animate-pulse -translate-x-[1px] text-7xl font-bold leading-none text-black">
        Q
      </div>
    </div>
  );
}
