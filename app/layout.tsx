import './globals.css';
import AppShell from '../components/AppShell';

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}