'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AppSplash() {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const accent = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (pathname === '/' || pathname === '/login') return;
    try {
      if (sessionStorage.getItem('theqLoginIntroPending') !== 'true') return;
      sessionStorage.removeItem('theqLoginIntroPending');
      setShowSplash(true);
    } catch {
      // Storage restrictions must never prevent access to the app.
    }
  }, [pathname]);

  useLayoutEffect(() => {
    if (!showSplash) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowSplash(false);
      return;
    }
    const animations: Animation[] = [];
    if (mark.current?.animate) {
      animations.push(mark.current.animate([
        { opacity: 0, transform: 'scale(.94)', offset: 0, easing: 'ease-in-out' },
        { opacity: 1, transform: 'scale(1)', offset: 0.65 },
        { opacity: 1, transform: 'scale(1)', offset: 0.82, easing: 'ease-in-out' },
        { opacity: 0, transform: 'scale(1.015)', offset: 1 },
      ], { duration: 1200, easing: 'linear', fill: 'both' }));
    }
    if (accent.current?.animate) {
      animations.push(accent.current.animate([
        { opacity: 0, transform: 'scaleX(.94)', offset: 0, easing: 'ease-in-out' },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.65 },
        { opacity: 1, transform: 'scaleX(1)', offset: 0.82, easing: 'ease-in-out' },
        { opacity: 0, transform: 'scaleX(1.015)', offset: 1 },
      ], { duration: 1200, easing: 'linear', fill: 'both' }));
    }
    if (overlay.current?.animate) {
      animations.push(overlay.current.animate([{ opacity: 1 }, { opacity: 0 }],
        { delay: 950, duration: 350, easing: 'ease-in-out', fill: 'both' }));
    }
    const timer = window.setTimeout(() => setShowSplash(false), 1300);
    return () => {
      window.clearTimeout(timer);
      animations.forEach(animation => animation.cancel());
    };
  }, [showSplash]);

  if (!showSplash) return null;

  return <div ref={overlay} role="status" aria-label="Opening THE Q"
    className="fixed inset-0 z-[9999] flex items-start justify-center bg-[#16324f] px-4 pt-20 text-white sm:pt-32">
    <div className="relative mt-32 grid place-items-center">
      <div ref={mark} aria-hidden="true" className="relative -left-[3px] text-[112px] font-extrabold leading-none tracking-normal">Q</div>
      <div ref={accent} aria-hidden="true" className="absolute -bottom-7 h-1 w-8 rounded-full bg-[#009be5]" />
    </div>
  </div>;
}
