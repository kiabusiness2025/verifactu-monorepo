import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import HoldedDashboardClient from './HoldedDashboardClient';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { readSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from '@/app/lib/session';

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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const nextTarget = `/dashboard?source=${encodeURIComponent(source)}`;

  if (!token) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }

  try {
    const session = await verifySessionToken(token, readSessionSecret());
    const tenantId = typeof session?.tenantId === 'string' ? session.tenantId : null;
    if (!tenantId) {
      redirect('/onboarding');
    }

    const connection = await getHoldedConnection(tenantId);
    if (!connection) {
      redirect('/onboarding/holded');
    }

    return (
      <HoldedDashboardClient
        session={{
          email: typeof session.email === 'string' ? session.email : null,
          tenantId,
          keyMasked: connection.keyMasked,
        }}
      />
    );
  } catch {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }
}
