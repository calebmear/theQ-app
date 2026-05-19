'use client';

import { useEffect, useState } from 'react';

export default function AppSplash() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem('theqIntroSeen');

    if (alreadySeen) return;

    sessionStorage.setItem('theqIntroSeen', 'true');
    setShowSplash(true);
  }, []);

  if (!showSplash) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] bg-white"
      onAnimationEnd={() => setShowSplash(false)}
    >
      <div className="theq-intro-mark">Q</div>
    </div>
  );
}
