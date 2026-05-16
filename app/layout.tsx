import './globals.css';
import AppNav from '../components/AppNav';
import AppSearch from '../components/AppSearch';
import AppSplash from '../components/AppSplash';

export const metadata = {
  title: 'THEQ App',
  applicationName: 'THEQ',
  description: 'Operations and revenue dashboard',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'THEQ',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#f3f4f6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <AppSplash />

        <div className="min-h-screen bg-gray-100 text-black pb-[env(safe-area-inset-bottom)] md:flex">
          <aside className="sticky top-0 z-40 border-r bg-white px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:h-screen md:w-64 md:shrink-0 md:p-4">
            <div className="flex items-center gap-3 md:block">
              <h1 className="shrink-0 text-2xl font-bold">THE Q</h1>
              <AppSearch />
            </div>

            <AppNav />
          </aside>

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
