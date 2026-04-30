import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';

export const metadata: Metadata = {
  title: 'Conector Holded para Claude | Verifactu Business',
  description:
    'Conecta Holded con Claude para consultar facturas, contactos, cuentas contables y diario en lenguaje natural. Borradores solo con confirmacion explicita.',
  alternates: {
    canonical: '/conectores/claude',
  },
};

export default function ClaudeConnectorPage() {
  return <ConnectorLandingClient connector="claude" />;
}
