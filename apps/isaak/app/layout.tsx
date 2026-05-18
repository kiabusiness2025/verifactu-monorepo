import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import IsaakFloatingChatButton from './components/IsaakFloatingChatButton';
import WhatsAppButton from './components/WhatsAppButton';
import IsaakSiteChrome from './components/IsaakSiteChrome';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const siteUrl = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';
const avatarPath = '/Personalidad/isaak-avatar-verifactu.png';

export const viewport: Viewport = {
  themeColor: '#2361d8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Isaak',
  },
  metadataBase: new URL(siteUrl),
  title: 'Isaak — Libera el 80% de tu tiempo de gestión empresarial',
  description:
    'Isaak es la IA protagonista que conecta Holded, bancos, documentos y correo para que el empresario dirija sin gestionar. 99% menos errores. Disponible 24/7.',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'IA empresarial',
    'automatización gestión',
    'orquestador empresarial',
    'holded IA',
    'contabilidad automática',
    'asesor fiscal inteligente',
  ],
  icons: {
    icon: [{ url: avatarPath, type: 'image/png' }],
    shortcut: [avatarPath],
    apple: [{ url: avatarPath, type: 'image/png' }],
  },
  openGraph: {
    title: 'Isaak — Libera el 80% de tu tiempo de gestión empresarial',
    description:
      'La IA que conecta Holded, bancos, documentos y correo. 99% menos errores. 24/7. El empresario dirige, no gestiona.',
    url: siteUrl,
    siteName: 'Isaak',
    images: [{ url: avatarPath, width: 512, height: 512, alt: 'Avatar de Isaak' }],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Isaak — Libera el 80% de tu tiempo de gestión empresarial',
    description:
      'La IA protagonista que conecta todo tu ecosistema empresarial. 80% tiempo liberado. 99% menos errores. 24/7.',
    images: [avatarPath],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={manrope.className}>
        <IsaakSiteChrome>{children}</IsaakSiteChrome>
        <WhatsAppButton />
        <IsaakFloatingChatButton />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}`,
          }}
        />
      </body>
    </html>
  );
}
