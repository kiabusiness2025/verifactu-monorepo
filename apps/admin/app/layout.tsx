import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/notifications/ToastNotifications';
import PwaRegistration from '@/components/pwa/PwaRegistration';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Holded + ChatGPT Admin',
  description:
    'Panel interno para observar el conector directo Holded + ChatGPT y su actividad operativa.',
  applicationName: 'Holded + ChatGPT Admin',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Holded Admin',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <PwaRegistration />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
