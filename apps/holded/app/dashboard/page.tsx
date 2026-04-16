import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedSession } from '@/app/lib/holded-session';
import { buildDashboardUrl, sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';

export const metadata: Metadata = {
  title: 'Redirigiendo | Holded',
  description: 'Tu acceso de Holded te lleva al workspace principal.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function sanitizeNext(value: string | string[] | undefined, source: string) {
  return sanitizeHoldedReturnTarget(readSource(value), buildDashboardUrl(source));
}

export default async function HoldedDashboardPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_dashboard';
  const nextTarget = sanitizeNext(resolved.next, source);
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(nextTarget)}`
    );
  }

  redirect(nextTarget);
}
