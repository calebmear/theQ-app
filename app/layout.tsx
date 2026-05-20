import './globals.css';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'THE Q',
  applicationName: 'THE Q',
  description: 'Operations and revenue dashboard',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'THE Q',
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