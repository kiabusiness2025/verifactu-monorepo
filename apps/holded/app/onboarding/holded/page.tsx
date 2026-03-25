import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { getHoldedSession } from '@/app/lib/holded-session';
import OnboardingHoldedClient from './OnboardingHoldedClient';

export const metadata: Metadata = {
  title: 'Conectar Holded | Isaak para Holded',
  description:
    'Pega tu API key de Holded, valida la conexión al momento y entra al dashboard gratuito.',
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSource(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedOnboardingConnectionPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding_connect';
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(`/onboarding/holded?source=${source}`)}`
    );
  }

  const connection = await getHoldedConnection(session.tenantId);
  if (connection) {
    redirect('/dashboard');
  }

  return <OnboardingHoldedClient />;
}
