import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
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

function readChannel(value: string | string[] | undefined) {
  const resolved = Array.isArray(value) ? value[0] || '' : value || '';
  return resolved === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export default async function HoldedOnboardingConnectionPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const source = readSource(resolved.source) || 'holded_onboarding_connect';
  const channel = readChannel(resolved.channel);
  const next = readSource(resolved.next);
  const onboardingToken = readSource(resolved.onboarding_token);
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    const redirectTarget = new URL('/onboarding/holded', 'https://holded.verifactu.business');
    redirectTarget.searchParams.set('source', source);
    redirectTarget.searchParams.set('channel', channel);
    if (next) redirectTarget.searchParams.set('next', next);
    if (onboardingToken) redirectTarget.searchParams.set('onboarding_token', onboardingToken);

    redirect(
      `/auth/holded?source=${encodeURIComponent(source)}&next=${encodeURIComponent(`${redirectTarget.pathname}${redirectTarget.search}`)}`
    );
  }

  return <OnboardingHoldedClient />;
}
