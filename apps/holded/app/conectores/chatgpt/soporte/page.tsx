import type { Metadata } from 'next';
import { ConnectorSupportPage } from '@/app/components/ConnectorSupportPage';

export const metadata: Metadata = {
  title: 'Soporte | Conector Holded para ChatGPT - Verifactu Business',
  description:
    'Soporte del conector Holded para ChatGPT: chat con Isaak, formulario autenticado y email directo.',
  alternates: { canonical: '/conectores/chatgpt/soporte' },
};

export default function ChatGPTSoportePage() {
  return <ConnectorSupportPage connector="chatgpt" />;
}
