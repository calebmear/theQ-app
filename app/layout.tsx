import './globals.css';

import AppNav from '../components/AppNav';
import AppSearch from '../components/AppSearch';

export const metadata = {
  title: 'THEQ App',
  description: 'Operations and revenue dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-100 text-black md:flex">
        <aside className="border-r bg-white px-4 pt-3 pb-0 md:min-h-screen md:w-64 md:p-4">
            <div className="flex items-center gap-3 md:block">
              <h1 className="shrink-0 text-xl font-bold">THEQ</h1>
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
