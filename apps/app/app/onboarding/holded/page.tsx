import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getHoldedOnboardingTokenFromSearchParams,
  resolveHoldedOnboardingSession,
} from '@/lib/integrations/holdedOnboardingSession';
import { normalizeMeaningfulPersonName, splitFullName } from '@/lib/personName';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { getAppUrl } from '@verifactu/utils';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { deriveHoldedCompanySetupState } from './flowState';
import { inferHoldedEntryChannel } from './entryChannel';
import HoldedOnboardingClient from './HoldedOnboardingClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Conector directo Holded | verifactu.business',
  description:
    'Valida tu API key de Holded y deja lista la conexion directa con ChatGPT o Verifactu sin pasos innecesarios.',
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
  const fallback = new URL('/dashboard', getAppUrl()).toString();
  if (!nextUrl) return fallback;

  try {
    const parsed = new URL(nextUrl, getAppUrl());
    const appOrigin = new URL(getAppUrl()).origin;
    return parsed.origin === appOrigin ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getOnboardingContactFirstName(value?: string | null) {
  return splitFullName(normalizeMeaningfulPersonName(value)).firstName || '';
}

export default async function HoldedOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) search.append(key, value);
      continue;
    }
    if (typeof rawValue === 'string') {
      search.set(key, rawValue);
    }
  }
  const session = await getSessionPayload();
  const onboardingToken = getHoldedOnboardingTokenFromSearchParams(search);
  const onboardingSession = onboardingToken
    ? await resolveHoldedOnboardingSession(onboardingToken)
    : null;
  const captureMode = firstValue(params.capture)?.trim() === '1';
  const tenantIdHint = normalizeText(firstValue(params.tenant_id));

  if (!session?.uid && !onboardingSession?.uid) {
    const loginUrl = new URL('/login', getAppUrl());
    loginUrl.searchParams.set('source', 'holded_onboarding');
    const current = new URL('/onboarding/holded', getAppUrl());
    const nextParam = firstValue(params.next)?.trim();
    const channel = firstValue(params.channel)?.trim();
    const source = firstValue(params.source)?.trim();
    const requireConnectionConfirmation =
      firstValue(params.require_connection_confirmation)?.trim() === '1';
    if (nextParam) current.searchParams.set('next', nextParam);
    if (channel) current.searchParams.set('channel', channel);
    if (source) current.searchParams.set('source', source);
    if (requireConnectionConfirmation) {
      current.searchParams.set('require_connection_confirmation', '1');
    }
    if (captureMode) {
      current.searchParams.set('capture', '1');
    }
    if (onboardingToken) {
      current.searchParams.set('onboarding_token', onboardingToken);
    }
    if (tenantIdHint) {
      current.searchParams.set('tenant_id', tenantIdHint);
    }
    loginUrl.searchParams.set('next', current.toString());
    redirect(loginUrl.toString());
  }

  const nextUrl = normalizeNextUrl(firstValue(params.next));
  const requireConnectionConfirmation =
    firstValue(params.require_connection_confirmation)?.trim() === '1';
  const entryChannel = inferHoldedEntryChannel({
    channel: params.channel,
    source: params.source,
    next: params.next,
  });

  const defaultContactName =
    normalizeMeaningfulPersonName(session?.name) ??
    normalizeMeaningfulPersonName(onboardingSession?.name) ??
    null;
  const defaultContactEmail = session?.email ?? onboardingSession?.email ?? null;
  let summary = {
    companyName: 'Tu empresa',
    companyLegalName: null as string | null,
    companyTaxId: null as string | null,
    companyAddress: null as string | null,
    companyPostalCode: null as string | null,
    companyCity: null as string | null,
    companyProvince: null as string | null,
    companyCountry: null as string | null,
    companyWebsite: null as string | null,
    companySectorCode: null as string | null,
    companySectorLabel: null as string | null,
    contactFirstName: getOnboardingContactFirstName(defaultContactName),
    contactRole: null as string | null,
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
    const auth =
      session?.uid || onboardingSession?.tenantId
        ? await requireTenantContext({
            channelType: entryChannel,
            metadata: { source: 'holded-onboarding-page' },
            tenantIdHint,
            onboardingToken,
          })
        : null;

    if (auth && !('error' in auth)) {
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
              representativeRole: true,
              email: true,
              phone: true,
              website: true,
              cnae: true,
              cnaeCode: true,
              cnaeText: true,
              address: true,
              postalCode: true,
              city: true,
              province: true,
              country: true,
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
        normalizeMeaningfulPersonName(auth.session.name) ||
        normalizeMeaningfulPersonName(tenant?.profile?.representative) ||
        normalizeText(defaultContactName);
      const contactEmail = normalizeText(auth.session.email) || normalizeText(defaultContactEmail);

      summary = {
        companyName: tenant?.profile?.tradeName || tenant?.name || 'Tu empresa',
        companyLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
        companyTaxId: normalizeText(tenant?.nif),
        companyAddress: normalizeText(tenant?.profile?.address),
        companyPostalCode: normalizeText(tenant?.profile?.postalCode),
        companyCity: normalizeText(tenant?.profile?.city),
        companyProvince: normalizeText(tenant?.profile?.province),
        companyCountry: normalizeText(tenant?.profile?.country),
        companyWebsite: normalizeText(tenant?.profile?.website),
        companySectorCode: normalizeText(tenant?.profile?.cnaeCode),
        companySectorLabel:
          normalizeText(tenant?.profile?.cnaeText) || normalizeText(tenant?.profile?.cnae),
        contactFirstName: getOnboardingContactFirstName(contactFullName),
        contactRole: normalizeText(tenant?.profile?.representativeRole),
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
      requireConnectionConfirmation={requireConnectionConfirmation}
      requiresVerifiedIdentity={entryChannel === 'chatgpt'}
      identity={{
        authMethod: onboardingSession?.authMethod ?? 'unknown',
        email: normalizeText(onboardingSession?.email),
        emailVerified:
          onboardingSession?.authMethod === 'google' || onboardingSession?.emailVerified === true,
        firstName: normalizeText(onboardingSession?.firstName),
        lastName: normalizeText(onboardingSession?.lastName),
        verifiedAt: normalizeText(onboardingSession?.verifiedAt),
      }}
      summary={summary}
      companySetup={companySetup}
      onboardingToken={onboardingToken}
      tenantIdHint={resolvedTenantInfo.tenantId ?? tenantIdHint}
    />
  );
}
