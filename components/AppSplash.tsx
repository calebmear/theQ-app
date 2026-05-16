'use client';

import { useEffect, useState } from 'react';

export default function AppSplash() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const shouldSkip = sessionStorage.getItem('skipAppSplashOnce');

    if (shouldSkip) {
      sessionStorage.removeItem('skipAppSplashOnce');
      setShowSplash(false);
      return;
    }

    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');

    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    sessionStorage.setItem('hasSeenSplash', 'true');

    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, []);

  if (!showSplash) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="animate-logo-intro text-7xl font-bold text-black">
        Q
      </div>
    </div>
  );
}
