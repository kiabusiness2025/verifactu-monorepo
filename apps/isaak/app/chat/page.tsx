import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import IsaakWorkspaceClient from './IsaakWorkspaceClient';

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

  const [connection, profile] = await Promise.all([
    getHoldedConnection(session.tenantId),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: {
        representative: true,
        phone: true,
        tradeName: true,
        legalName: true,
      },
    }),
  ]);

  return (
    <IsaakWorkspaceClient
      session={{
        email: session.email,
        name: session.name,
        tenantId: session.tenantId,
        tenantName: connection?.tenantName ?? profile?.tradeName ?? null,
        legalName: connection?.legalName ?? profile?.legalName ?? null,
        taxId: connection?.taxId ?? null,
        keyMasked: connection?.keyMasked ?? null,
        connectedAt: connection?.connectedAt ?? null,
        lastValidatedAt: connection?.lastValidatedAt ?? null,
        supportedModules: connection?.supportedModules ?? [],
        validationSummary: connection?.validationSummary ?? null,
        phone: profile?.phone ?? null,
        representative: profile?.representative ?? null,
        isAdmin: false,
      }}
    />
  );
}
