import { mintHoldedOnboardingToken, verifyHoldedOnboardingToken } from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl, getLandingUrl } from '@verifactu/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { inferHoldedEntryChannel } from './entryChannel';
import HoldedOnboardingClient from './HoldedOnboardingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Activa tu conexion con Holded | Compatible con Holded',
  description:
    'Conecta Holded para activar tu espacio de trabajo con datos reales dentro de verifactu.business.',
  icons: {
    icon: '/brand/holded/holded-diamond-logo.png',
    shortcut: '/brand/holded/holded-diamond-logo.png',
    apple: '/brand/holded/holded-diamond-logo.png',
  },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeNextUrl(nextUrl: string | undefined) {
  const fallback = new URL('/dashboard/isaak', getAppUrl()).toString();
  if (!nextUrl) return fallback;

  try {
    const parsed = new URL(nextUrl, getAppUrl());
    const appOrigin = new URL(getAppUrl()).origin;
    const landingOrigin = new URL(getLandingUrl()).origin;
    return parsed.origin === appOrigin || parsed.origin === landingOrigin
      ? parsed.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

function attachOnboardingToken(nextUrl: string, onboardingToken: string | null) {
  if (!onboardingToken) return nextUrl;

  try {
    const parsed = new URL(nextUrl);
    if (parsed.origin === new URL(getAppUrl()).origin && parsed.pathname === '/oauth/authorize') {
      parsed.searchParams.set('onboarding_token', onboardingToken);
    }
    return parsed.toString();
  } catch {
    return nextUrl;
  }
}

function buildWorkspaceLabel(input: { name?: string | null; email?: string | null } | null) {
  const base = input?.name?.trim() || input?.email?.split('@')[0]?.trim() || 'Tu';
  return `${base} Workspace`;
}

export default async function HoldedOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await getSessionPayload();

  if (!session?.uid) {
    const loginUrl = new URL('/login', getAppUrl());
    loginUrl.searchParams.set('source', 'holded_onboarding');
    const current = new URL('/onboarding/holded', getAppUrl());
    const nextParam = firstValue(params.next)?.trim();
    const channel = firstValue(params.channel)?.trim();
    const source = firstValue(params.source)?.trim();
    const onboardingToken = firstValue(params.onboarding_token)?.trim();
    if (nextParam) current.searchParams.set('next', nextParam);
    if (channel) current.searchParams.set('channel', channel);
    if (source) current.searchParams.set('source', source);
    if (onboardingToken) current.searchParams.set('onboarding_token', onboardingToken);
    loginUrl.searchParams.set('next', current.toString());
    redirect(loginUrl.toString());
  }

  const existingToken = firstValue(params.onboarding_token)?.trim() || null;
  const onboardingToken =
    existingToken ||
    (!session.uid
      ? await mintHoldedOnboardingToken({
          seed: `holded-onboarding:${Date.now()}:${Math.random()}`,
        })
      : null);
  const onboardingPayload =
    !session.uid && onboardingToken ? await verifyHoldedOnboardingToken(onboardingToken) : null;
  const nextUrl = attachOnboardingToken(normalizeNextUrl(firstValue(params.next)), onboardingToken);
  const entryChannel = inferHoldedEntryChannel({
    channel: params.channel,
    source: params.source,
    next: params.next,
  });

  const tenantName = buildWorkspaceLabel(
    session.uid
      ? { name: session.name ?? null, email: session.email ?? null }
      : onboardingPayload
        ? { name: onboardingPayload.name ?? null, email: onboardingPayload.email ?? null }
        : null
  );

  return (
    <HoldedOnboardingClient
      entryChannel={entryChannel}
      nextUrl={nextUrl}
      tenantName={tenantName}
      onboardingToken={onboardingToken}
    />
  );
}
