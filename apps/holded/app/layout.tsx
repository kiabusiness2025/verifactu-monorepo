import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import HoldedSiteChrome from './components/HoldedSiteChrome';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const siteUrl = process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';
const ogImage = '/brand/holded/holded-diamond-logo.png';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Holded | Hub vertical de conectores',
  description:
    'Hub vertical de conectores Holded dentro de Verifactu Business. Documentacion, privacidad, DPA y soporte para ChatGPT y Claude.',
  alternates: {
    canonical: '/conectores',
  },
  icons: {
    icon: [
      { url: '/Holded/Corporativo/Holded logo.svg', type: 'image/svg+xml' },
      { url: '/brand/holded/holded-diamond-logo.png', type: 'image/png' },
    ],
    shortcut: ['/Holded/Corporativo/Holded logo.svg'],
    apple: [{ url: '/brand/holded/holded-diamond-logo.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'Holded | Hub vertical de conectores',
    description:
      'Hub vertical de conectores Holded dentro de Verifactu Business. Documentacion, privacidad, DPA y soporte para ChatGPT y Claude.',
    url: `${siteUrl}/conectores`,
    siteName: 'Holded by Verifactu Business',
    images: [{ url: ogImage, width: 512, height: 512, alt: 'Logo Holded' }],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Holded | Hub vertical de conectores',
    description:
      'Hub vertical de conectores Holded dentro de Verifactu Business. Documentacion, privacidad, DPA y soporte para ChatGPT y Claude.',
    images: [ogImage],
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
