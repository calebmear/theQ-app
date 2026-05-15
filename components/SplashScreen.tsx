'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const router = useRouter();
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem('qpiSplashSeen');

    if (alreadySeen) {
      router.replace('/dashboard');
      return;
    }

    sessionStorage.setItem('qpiSplashSeen', 'true');
    setShowLogo(true);

    const timer = window.setTimeout(() => {
      router.replace('/dashboard');
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [router]);

  if (!showLogo) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <img
        src="/qpi-logo.png"
        alt="QPI"
        className="h-64 w-64 animate-logo-intro object-contain drop-shadow-2xl"
      />
    </div>
  );
}
