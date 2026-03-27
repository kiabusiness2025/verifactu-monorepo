import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import HoldedDashboardClient from '../../../holded/app/dashboard/HoldedDashboardClient';
import { getHoldedSession } from '@/app/lib/holded-session';

export const metadata: Metadata = {
  title: 'Chat | Isaak',
  description: 'Workspace principal de Isaak con chat, memoria y conexion Holded.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function IsaakChatWorkspacePage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'isaak_chat';
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(`/onboarding/holded?source=${encodeURIComponent(source)}`);
  }

  return (
    <HoldedDashboardClient
      session={{
        email: session.email,
        name: session.name,
        tenantId: session.tenantId,
        tenantName: null,
        legalName: null,
        taxId: null,
        keyMasked: null,
        connectedAt: null,
        lastValidatedAt: null,
        supportedModules: [],
        validationSummary: null,
        isAdmin: false,
      }}
    />
  );
}
