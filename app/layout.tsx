import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Revenue Ops App',
  description: 'Operations Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-black">
        <div className="flex">
          <Sidebar />

          <main className="min-h-screen flex-1 p-4 pb-24 md:p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}