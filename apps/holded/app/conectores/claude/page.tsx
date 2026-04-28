import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';

export const metadata: Metadata = {
  title: 'Conector Holded para Claude | Verifactu Business',
  description:
    'Conecta Holded con Claude mediante MCP y OAuth. Consulta facturación, contabilidad, clientes y proyectos en lenguaje natural. Solo lectura por defecto.',
  alternates: {
    canonical: '/conectores/claude',
  },
};

export default function ClaudeConnectorPage() {
  return <ConnectorLandingClient connector="claude" />;
}
