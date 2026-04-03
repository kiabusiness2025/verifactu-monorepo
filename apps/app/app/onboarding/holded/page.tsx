import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getPreferredFirstName } from '@/lib/personName';
import prisma from '@/lib/prisma';
import { mintHoldedOnboardingToken, verifyHoldedOnboardingToken } from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl } from '@verifactu/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { deriveHoldedCompanySetupState } from './flowState';
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
    return parsed.origin === appOrigin ? parsed.toString() : fallback;
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

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export default async function HoldedOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await getSessionPayload();
  const captureMode = firstValue(params.capture)?.trim() === '1';

  if (!session?.uid) {
    const loginUrl = new URL('/login', getAppUrl());
    loginUrl.searchParams.set('source', 'holded_onboarding');
    const current = new URL('/onboarding/holded', getAppUrl());
    const nextParam = firstValue(params.next)?.trim();
    const channel = firstValue(params.channel)?.trim();
    const source = firstValue(params.source)?.trim();
    const onboardingToken = firstValue(params.onboarding_token)?.trim();
    const requireConnectionConfirmation =
      firstValue(params.require_connection_confirmation)?.trim() === '1';
    if (nextParam) current.searchParams.set('next', nextParam);
    if (channel) current.searchParams.set('channel', channel);
    if (source) current.searchParams.set('source', source);
    if (onboardingToken) current.searchParams.set('onboarding_token', onboardingToken);
    if (requireConnectionConfirmation) {
      current.searchParams.set('require_connection_confirmation', '1');
    }
    if (captureMode) {
      current.searchParams.set('capture', '1');
    }
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
  const requireConnectionConfirmation =
    firstValue(params.require_connection_confirmation)?.trim() === '1';
  const entryChannel = inferHoldedEntryChannel({
    channel: params.channel,
    source: params.source,
    next: params.next,
  });

  const defaultContactName = session.name ?? onboardingPayload?.name ?? null;
  const defaultContactEmail = session.email ?? onboardingPayload?.email ?? null;
  let summary = {
    companyName: 'Tu empresa',
    companyLegalName: null as string | null,
    companyTaxId: null as string | null,
    contactFirstName: getPreferredFirstName({
      fullName: defaultContactName,
      email: defaultContactEmail,
      fallback: 'Usuario',
    }),
    contactFullName: normalizeText(defaultContactName),
    contactEmail: normalizeText(defaultContactEmail),
    companyEmail: null as string | null,
    contactPhone: null as string | null,
  };
  let resolvedTenantInfo = {
    tenantId: null as string | null,
    tenantIsDemo: null as boolean | null,
    tenantNif: null as string | null,
  };

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      onboardingToken,
      metadata: { source: 'holded-onboarding-page' },
    });

    if (!('error' in auth)) {
      resolvedTenantInfo = {
        tenantId: auth.tenantId,
        tenantIsDemo: null,
        tenantNif: null,
      };

      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: {
          id: true,
          nif: true,
          isDemo: true,
          name: true,
          legalName: true,
          profile: {
            select: {
              tradeName: true,
              legalName: true,
              representative: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      resolvedTenantInfo = {
        tenantId: tenant?.id || auth.tenantId,
        tenantIsDemo: tenant?.isDemo ?? null,
        tenantNif: normalizeText(tenant?.nif),
      };

      const contactFullName =
        normalizeText(auth.session.name) ||
        normalizeText(tenant?.profile?.representative) ||
        normalizeText(defaultContactName);
      const contactEmail = normalizeText(auth.session.email) || normalizeText(defaultContactEmail);

      summary = {
        companyName: tenant?.profile?.tradeName || tenant?.name || 'Tu empresa',
        companyLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
        companyTaxId: normalizeText(tenant?.nif),
        contactFirstName: getPreferredFirstName({
          fullName: contactFullName,
          email: contactEmail,
          fallback: 'Usuario',
        }),
        contactFullName,
        contactEmail,
        companyEmail: normalizeText(tenant?.profile?.email),
        contactPhone: normalizeText(tenant?.profile?.phone),
      };
    }
  } catch (error) {
    console.error('[onboarding/holded] failed to load tenant summary', {
      message: error instanceof Error ? error.message : String(error),
      entryChannel,
    });
  }

  const companySetup = deriveHoldedCompanySetupState({
    entryChannel,
    requireConnectionConfirmation,
    tenantId: resolvedTenantInfo.tenantId,
    tenantIsDemo: resolvedTenantInfo.tenantIsDemo,
    tenantNif: resolvedTenantInfo.tenantNif,
    companyName: summary.companyName,
  });

  return (
    <HoldedOnboardingClient
      captureMode={captureMode}
      entryChannel={entryChannel}
      nextUrl={nextUrl}
      onboardingToken={onboardingToken}
      requireConnectionConfirmation={requireConnectionConfirmation}
      summary={summary}
      companySetup={companySetup}
    />
  );
}
