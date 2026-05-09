import './globals.css';
import Link from 'next/link';

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
            <h1 className="text-xl font-bold">THEQ</h1>

            <nav className="mt-6 flex gap-2 md:flex-col">
              <Link href="/" className="rounded-lg px-3 py-2 hover:bg-gray-100">
                Dashboard
              </Link>
              <Link
                href="/operations"
                className="rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                Operations
              </Link>
              <Link
                href="/projects"
                className="rounded-lg px-3 py-2 hover:bg-gray-100"
              >
                Projects
              </Link>
            </nav>
          </aside>

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
