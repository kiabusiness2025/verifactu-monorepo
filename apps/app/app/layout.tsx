import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

import { FirebaseAnalytics } from '@/components/FirebaseAnalytics';
import { GoogleTagManager } from '@/components/GoogleTagManager';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWARegistration } from '@/components/PWARegistration';
import { ErrorMonitor } from '@/components/monitoring/ErrorMonitor';
import { ToastProvider } from '@/components/notifications/ToastNotifications';
import { IsaakUIProvider } from '@/context/IsaakUIContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Verifactu Business',
  description:
    'Plataforma para llevar ventas, gastos y beneficio con tranquilidad, cumpliendo VeriFactu.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Verifactu Business',
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon-32x32.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0b6cfb',
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const holdedFlow = requestHeaders.get('x-holded-flow') === '1';

  return (
    <html lang="es">
      <head>
        <GoogleTagManager />
        {holdedFlow ? (
          <>
            <link rel="icon" href="/brand/holded/holded-diamond-logo.png" sizes="32x32" />
            <link rel="shortcut icon" href="/brand/holded/holded-diamond-logo.png" />
          </>
        ) : null}
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <PWARegistration />
        <PWAInstallPrompt />
        <ErrorMonitor />
        <FirebaseAnalytics />
        <ToastProvider>
          <ThemeProvider>
            <SidebarProvider>
              <IsaakUIProvider>{children}</IsaakUIProvider>
            </SidebarProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
