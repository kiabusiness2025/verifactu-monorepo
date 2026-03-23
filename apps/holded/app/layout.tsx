import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import HoldedSiteChrome from './components/HoldedSiteChrome';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Isaak para Holded',
  description:
    'Asistente para entender ventas, gastos y beneficio con tus datos de Holded en un flujo simple.',
  icons: {
    icon: [{ url: '/brand/holded/holded-diamond-logo.png', type: 'image/png' }],
    shortcut: ['/brand/holded/holded-diamond-logo.png'],
    apple: [{ url: '/brand/holded/holded-diamond-logo.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={manrope.className}>
        <HoldedSiteChrome>{children}</HoldedSiteChrome>
      </body>
    </html>
  );
}
