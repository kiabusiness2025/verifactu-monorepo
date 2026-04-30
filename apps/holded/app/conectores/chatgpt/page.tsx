import type { Metadata } from 'next';
import { ConnectorLandingClient } from '@/app/components/ConnectorLandingClient';

export const metadata: Metadata = {
  title: 'Conector Holded para ChatGPT | Verifactu Business',
  description:
    'Conecta Holded con ChatGPT para consultar facturas, contactos, cuentas contables y diario en lenguaje natural. Borradores solo con confirmacion explicita.',
  alternates: {
    canonical: '/conectores/chatgpt',
  },
};

export default function ChatGPTConnectorPage() {
  return <ConnectorLandingClient connector="chatgpt" />;
}
