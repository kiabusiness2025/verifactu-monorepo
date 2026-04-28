import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';

export const metadata: Metadata = {
  title: 'Plugin Holded para ChatGPT | Verifactu Business',
  description:
    'Conecta Holded con ChatGPT mediante OAuth. Consulta facturación, contabilidad, clientes y proyectos en lenguaje natural. Solo lectura por defecto.',
  alternates: {
    canonical: '/conectores/chatgpt',
  },
};

export default function ChatGPTConnectorPage() {
  return <ConnectorLandingClient connector="chatgpt" />;
}
