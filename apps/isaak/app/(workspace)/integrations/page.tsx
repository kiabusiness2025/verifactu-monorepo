import type { Metadata } from 'next';
import IntegrationsClient from './IntegrationsClient';

export const metadata: Metadata = {
  title: 'Integraciones — Isaak',
  description: 'Gestiona conectores, API keys, MCP server y webhooks de Isaak.',
};

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}
