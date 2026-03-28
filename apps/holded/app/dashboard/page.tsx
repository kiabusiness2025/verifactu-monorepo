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

function sanitizeNext(value: string | string[] | undefined, source: string) {
  const fallback = buildDashboardUrl(source);
  const candidate = readSource(value);
  if (!candidate) return fallback;

  try {
    const parsed = new URL(candidate);
    if (
      parsed.origin === 'https://isaak.verifactu.business' ||
      parsed.origin === 'https://holded.verifactu.business'
    ) {
      return parsed.toString();
    }
  } catch {
    if (candidate.startsWith('/')) {
      return `https://holded.verifactu.business${candidate}`;
    }
  }

  return fallback;
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
