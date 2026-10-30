'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
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
          <div className="flex w-full items-center gap-3">
            <h1 className="shrink-0 text-2xl font-bold">THE Q</h1>
            <div className="min-w-0 flex-1"><AppSearch /></div>
            <UserMenu />
          </div>
          <AppNav />
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
