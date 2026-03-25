import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import HoldedDashboardClient from './HoldedDashboardClient';
import { getHoldedSession } from '@/app/lib/holded-session';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { isHoldedAdminEmail } from '@/app/lib/holded-admin';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const metadata: Metadata = {
  title: 'Dashboard | Isaak para Holded',
  description:
    'Dashboard propio de Holded con acceso, activación y chat integrado en el mismo producto.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedDashboardPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_dashboard';
  const nextTarget = `/dashboard?source=${encodeURIComponent(source)}`;
  const session = await getHoldedSession();

  try {
    const tenantId = session?.tenantId || null;
    if (!tenantId || !session) {
      redirect(
        `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
      );
    }

    const connection = await getHoldedConnection(tenantId);
    if (!connection) {
      redirect('/onboarding/holded');
    }

    if (session.userId) {
      await writeHoldedActivity({
        tenantId,
        userId: session.userId,
        action: 'dashboard_accessed',
        resourceType: 'dashboard',
      });
    }

    return (
      <HoldedDashboardClient
        session={{
          email: session.email,
          tenantId,
          tenantName: connection.tenantName,
          legalName: connection.legalName,
          taxId: connection.taxId,
          keyMasked: connection.keyMasked,
          connectedAt: connection.connectedAt,
          lastValidatedAt: connection.lastValidatedAt,
          supportedModules: connection.supportedModules,
          validationSummary: connection.validationSummary,
          isAdmin: isHoldedAdminEmail(session.email),
        }}
      />
    );
  } catch {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }
}
