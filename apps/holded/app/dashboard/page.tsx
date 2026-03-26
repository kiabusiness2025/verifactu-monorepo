import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import HoldedDashboardClient from './HoldedDashboardClient';
import { getHoldedSession } from '@/app/lib/holded-session';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { isHoldedAdminEmail } from '@/app/lib/holded-admin';

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
  const tenantId = session?.tenantId || null;
  if (!tenantId || !session) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }

  if (session.userId) {
    await writeHoldedActivity({
      tenantId,
      userId: session.userId,
      action: 'dashboard_accessed',
      resourceType: 'dashboard',
    }).catch((error) => {
      console.warn('[holded dashboard] activity log skipped', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return (
    <HoldedDashboardClient
      session={{
        email: session.email,
        tenantId,
        tenantName: null,
        legalName: null,
        taxId: null,
        keyMasked: null,
        connectedAt: null,
        lastValidatedAt: null,
        supportedModules: [],
        validationSummary: null,
        isAdmin: isHoldedAdminEmail(session.email),
      }}
    />
  );
}
