import type { Metadata } from 'next';
import { ConnectorSupportPage } from '@/app/components/ConnectorSupportPage';

export const metadata: Metadata = {
  title: 'Soporte | Conector Holded para Claude - Verifactu Business',
  description:
    'Soporte del conector Holded para Claude: chat de soporte, formulario autenticado y email directo.',
  alternates: { canonical: '/conectores/claude/soporte' },
};

export default function ClaudeSoportePage() {
  return <ConnectorSupportPage connector="claude" />;
}
