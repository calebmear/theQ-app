'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

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
