import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import IsaakSiteChrome from './components/IsaakSiteChrome';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Isaak | Asistente fiscal inteligente',
  description:
    'Isaak te ayuda a entender ventas, gastos, cobros y prioridades fiscales usando contexto real de tu negocio.',
  icons: {
    icon: [{ url: '/Personalidad/Isaak%20Avatar.png', type: 'image/png' }],
    shortcut: ['/Personalidad/Isaak%20Avatar.png'],
    apple: [{ url: '/Personalidad/Isaak%20Avatar.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={manrope.className}>
        <IsaakSiteChrome>{children}</IsaakSiteChrome>
      </body>
    </html>
  );
}
