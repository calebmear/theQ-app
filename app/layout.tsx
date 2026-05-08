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
      <body className="bg-gray-100">
        <div className="flex">
          <Sidebar />

          <main className="flex-1 min-h-screen p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}