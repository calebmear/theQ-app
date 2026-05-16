'use client';

import { useEffect, useState } from 'react';

export default function AppSplash() {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('theq-splash-shown');

    if (alreadyShown) {
      setVisible(false);
      return;
    }

    sessionStorage.setItem('theq-splash-shown', 'true');
    setVisible(true);

    const enterTimer = window.setTimeout(() => {
      setMounted(true);
    }, 50);

    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, 1200);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 1850);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
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
