import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import IsaakFloatingChatButton from './components/IsaakFloatingChatButton';
import IsaakSiteChrome from './components/IsaakSiteChrome';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const siteUrl = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';
const avatarPath = '/Personalidad/isaak-avatar-verifactu.png';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Isaak | Asistente fiscal inteligente',
  description:
    'Isaak te ayuda a entender ventas, gastos, cobros y prioridades fiscales usando contexto real de tu negocio.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: avatarPath, type: 'image/png' }],
    shortcut: [avatarPath],
    apple: [{ url: avatarPath, type: 'image/png' }],
  },
  openGraph: {
    title: 'Isaak | Asistente fiscal inteligente',
    description:
      'Isaak te ayuda a entender ventas, gastos, cobros y prioridades fiscales usando contexto real de tu negocio.',
    url: siteUrl,
    siteName: 'Isaak',
    images: [{ url: avatarPath, width: 512, height: 512, alt: 'Avatar de Isaak' }],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Isaak | Asistente fiscal inteligente',
    description:
      'Isaak te ayuda a entender ventas, gastos, cobros y prioridades fiscales usando contexto real de tu negocio.',
    images: [avatarPath],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={manrope.className}>
        <IsaakSiteChrome>{children}</IsaakSiteChrome>
        <IsaakFloatingChatButton />
      </body>
    </html>
  );
}
