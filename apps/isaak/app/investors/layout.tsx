import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Isaak | Inversores y Partners',
  description:
    'Descarga el dossier estratégico de Isaak — la plataforma de IA fiscal para PYMEs españolas. VeriFactu, AEAT, Open Banking y ERPs en un solo asistente.',
  robots: { index: false, follow: false },
};

export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
