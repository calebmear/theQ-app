'use client';

import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import AppSearch from './AppSearch';
import AuthGuard from './AuthGuard';
import UserMenu from './UserMenu';
import FloatingReceiptButton from './FloatingReceiptButton';

const publicRoutes = ['/', '/login'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname);

  if (isPublicRoute) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 text-black pb-[env(safe-area-inset-bottom)] md:flex">
        <aside className="sticky top-0 z-40 border-r bg-white px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:h-screen md:w-64 md:shrink-0 md:p-4">
          <div className="flex w-full items-center gap-3">
            <h1 className="shrink-0 text-2xl font-bold">THE Q</h1>

            <div className="min-w-0 flex-1">
              <AppSearch />
            </div>

            <UserMenu />
          </div>

          <AppNav />
        </aside>

        <main className="flex-1 p-4 md:p-8">{children}</main>

<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#009be5] text-white shadow-xl hover:bg-[#007bb8]">
          <div className="pointer-events-auto">
            <FloatingReceiptButton />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}