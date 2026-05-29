import type { Metadata } from 'next';
import { ISAAK_V1_LAUNCH } from '@/app/lib/feature-flags';
import IntegrationsClient from './IntegrationsClient';
import IntegrationsV1Client from './IntegrationsV1Client';

export const metadata: Metadata = {
  title: 'Integraciones — Isaak',
  description: 'Gestiona conectores, API keys, MCP server y webhooks de Isaak.',
};

export default function IntegrationsPage() {
  // V1: hub minimal (4 cards). V2+: catálogo completo (50+ apps).
  if (ISAAK_V1_LAUNCH) return <IntegrationsV1Client />;
  return <IntegrationsClient />;
}
