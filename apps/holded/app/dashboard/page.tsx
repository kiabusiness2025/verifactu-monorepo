import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildDashboardUrl } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Redirigiendo a Isaak | Holded',
  description: 'Tu acceso de Holded continua en el workspace principal de Isaak.',
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
  const nextTarget = buildDashboardUrl(source);
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }

  redirect(nextTarget);
}
