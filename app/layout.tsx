import './globals.css';
import AppNav from '../components/AppNav';

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
        <aside className="border-r bg-white p-4 md:min-h-screen md:w-64">
  <div className="flex items-center gap-3 md:block">
    <h1 className="shrink-0 text-xl font-bold">THEQ</h1>

    <input
      type="text"
      placeholder="Search projects, customers, addresses..."
      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm md:mt-4 md:w-full"
    />
  </div>

  <AppNav />
</aside>


          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
