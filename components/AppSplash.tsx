'use client';

import { useEffect, useState } from 'react';

export default function AppSplash() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);

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

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-700 ease-out ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="-translate-y-8">
        <div
          className={`text-5xl font-bold tracking-wide text-black transition-all duration-700 ease-out ${
            mounted && !leaving
              ? 'scale-100 opacity-100'
              : 'scale-95 opacity-0'
          }`}
        >
          Q
        </div>
      </div>
    </div>
  );
}
