import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/notifications/ToastNotifications';
import PwaRegistration from '@/components/pwa/PwaRegistration';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Holded Admin',
  description:
    'Panel interno para observar usuarios, tenants y actividad operativa del canal Holded.',
  applicationName: 'Holded Admin',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Holded Admin',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/android-chrome-192x192.png', type: 'image/png' },
      { url: '/android-chrome-512x512.png', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const themeColor = '#0f172a';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <PwaRegistration />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
