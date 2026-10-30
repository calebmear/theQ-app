'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import AppSearch from './AppSearch';
import AuthGuard from './AuthGuard';
import UserMenu from './UserMenu';
import FloatingReceiptButton from './FloatingReceiptButton';

const publicRoutes = ['/', '/login'];
const mainSections = ['/dashboard', '/activework', '/projects', '/customers'];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname);
  const currentSection = mainSections.find((route) => pathname === route || pathname.startsWith(`${route}/`)) ?? null;
  const isMainSection = currentSection !== null;
  const contentRef = useRef<HTMLElement>(null);
  const previousSection = useRef(currentSection);
  const [currentDate, setCurrentDate] = useState<{ label: string; key: string } | null>(null);
  useEffect(() => {
    const updateDate = () => {
      const today = new Date();
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const label = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      setCurrentDate(previous => previous?.key === key ? previous : { key, label });
    };
    updateDate();
    const timer = window.setInterval(updateDate, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') updateDate(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);


  useLayoutEffect(() => {
    const prior = previousSection.current;
    previousSection.current = currentSection;
    if (!prior || !currentSection || prior === currentSection) return;
    const content = contentRef.current;
    if (!content || typeof content.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = content.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 180, easing: 'ease-out' }
    );
    return () => animation.cancel();
  }, [currentSection]);

  if (isPublicRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-black pb-[env(safe-area-inset-bottom)] md:flex">
        <aside className={`sticky top-0 z-40 border-r bg-white px-4 ${isMainSection ? 'pb-0' : 'pb-4'} pt-[calc(env(safe-area-inset-top)+1rem)] md:h-screen md:w-64 md:shrink-0 md:p-4`}>
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <h1 className="shrink-0 text-3xl font-bold">Q</h1>
            <div className="min-w-0 flex-1 [&_input]:min-w-0 [&_input]:overflow-hidden [&_input]:text-ellipsis [&_input]:whitespace-nowrap"><AppSearch /></div>
            <UserMenu />
          </div>
          <div className="mt-1 min-h-4 text-center text-xs text-gray-500 md:text-left">
            {currentDate && <time dateTime={currentDate.key}>{currentDate.label}</time>}
          </div>
          <div className="[&_nav]:!mt-1 md:[&_nav]:!mt-6"><AppNav /></div>
        </aside>

        <main ref={contentRef} className={`min-w-0 flex-1 ${isMainSection ? 'px-4 pb-4 pt-2' : 'p-4'} md:p-8`}>
          {children}
        </main>

        <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+7rem)] right-0 z-30">
          <div className="pointer-events-auto"><FloatingReceiptButton /></div>
        </div>
      </div>
    </AuthGuard>
  );
}
