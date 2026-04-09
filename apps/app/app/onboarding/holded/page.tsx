import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getHoldedOnboardingTokenFromSearchParams,
  resolveHoldedOnboardingSession,
} from '@/lib/integrations/holdedOnboardingSession';
import { maskSecret } from '@/lib/integrations/accounting';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
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

type HoldedSavedPrefill = {
  companyName: string | null;
  companyTaxId: string | null;
  contactEmail: string | null;
  maskedApiKey: string | null;
  connectionStatus: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

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

type TenantSummaryRecord = {
  id: string;
  nif: string | null;
  isDemo: boolean;
  name: string;
  legalName: string | null;
  profile: {
    tradeName: string | null;
    legalName: string | null;
    representative: string | null;
    representativeRole: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    cnae: string | null;
    cnaeCode: string | null;
    cnaeText: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
  } | null;
};

function buildHoldedSummaryFromTenant(
  tenant: TenantSummaryRecord,
  defaults: { contactName?: string | null; contactEmail?: string | null }
) {
  const contactFullName =
    normalizeMeaningfulPersonName(defaults.contactName) ||
    normalizeMeaningfulPersonName(tenant.profile?.representative) ||
    null;
  const contactEmail = normalizeText(defaults.contactEmail) || null;

  return {
    companyName: tenant.profile?.tradeName || tenant.name || 'Tu empresa',
    companyLegalName: tenant.profile?.legalName || tenant.legalName || null,
    companyTaxId: normalizeText(tenant.nif),
    companyAddress: normalizeText(tenant.profile?.address),
    companyPostalCode: normalizeText(tenant.profile?.postalCode),
    companyCity: normalizeText(tenant.profile?.city),
    companyProvince: normalizeText(tenant.profile?.province),
    companyCountry: normalizeText(tenant.profile?.country),
    companyWebsite: normalizeText(tenant.profile?.website),
    companySectorCode: normalizeText(tenant.profile?.cnaeCode),
    companySectorLabel:
      normalizeText(tenant.profile?.cnaeText) || normalizeText(tenant.profile?.cnae),
    contactFirstName: getOnboardingContactFirstName(contactFullName),
    contactRole: normalizeText(tenant.profile?.representativeRole),
    contactFullName,
    contactEmail,
    companyEmail: normalizeText(tenant.profile?.email),
    contactPhone: normalizeText(tenant.profile?.phone),
  };
}

async function resolveVerifiedEmailTenantPrefill(input: {
  uid?: string | null;
  email?: string | null;
  contactName?: string | null;
}) {
  const normalizedUid = normalizeText(input.uid);
  const normalizedEmail = normalizeText(input.email)?.toLowerCase() || null;
  if (!normalizedUid && !normalizedEmail) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(normalizedUid ? [{ authSubject: normalizedUid }] : []),
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return null;
  }

  const [preference, memberships] = await Promise.all([
    prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: { preferredTenantId: true },
    }),
    prisma.membership.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        tenantId: true,
        tenant: {
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
        },
      },
    }),
  ]);

  const preferredMembership = preference?.preferredTenantId
    ? memberships.find((membership) => membership.tenantId === preference.preferredTenantId) || null
    : null;
  const realMemberships = memberships.filter((membership) => !membership.tenant.isDemo);
  const selectedMembership =
    preferredMembership ||
    (realMemberships.length === 1
      ? realMemberships[0]
      : memberships.length === 1
        ? memberships[0]
        : null);

  if (!selectedMembership) {
    return null;
  }

  return {
    tenantId: selectedMembership.tenantId,
    tenantIsDemo: selectedMembership.tenant.isDemo,
    tenantNif: normalizeText(selectedMembership.tenant.nif),
    summary: buildHoldedSummaryFromTenant(selectedMembership.tenant, {
      contactName:
        normalizeMeaningfulPersonName(input.contactName) ||
        normalizeMeaningfulPersonName(user.name),
      contactEmail: normalizedEmail || normalizeText(user.email),
    }),
  };
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
  const sessionNameParts = splitFullName(normalizeMeaningfulPersonName(session?.name));
  const effectiveOnboardingToken =
    onboardingToken ||
    (entryChannel === 'chatgpt' && session?.uid
      ? await mintHoldedOnboardingTokenForSubject({
          uid: session.uid,
          email: session.email ?? null,
          name: normalizeMeaningfulPersonName(session.name),
          tenantId: tenantIdHint,
          authMethod: 'unknown',
          emailVerified: false,
          firstName: sessionNameParts.firstName,
          lastName: sessionNameParts.lastName,
          verifiedAt: null,
        })
      : null);
  const effectiveOnboardingSession = onboardingSession
    ? onboardingSession
    : effectiveOnboardingToken && entryChannel === 'chatgpt' && session?.uid
      ? {
          uid: session.uid,
          email: session.email ?? null,
          name: normalizeMeaningfulPersonName(session.name),
          tenantId: tenantIdHint,
          tenantBound: false,
          authMethod: 'unknown' as const,
          emailVerified: false,
          firstName: sessionNameParts.firstName,
          lastName: sessionNameParts.lastName,
          verifiedAt: null,
        }
      : null;

  const defaultContactName =
    normalizeMeaningfulPersonName(session?.name) ??
    normalizeMeaningfulPersonName(effectiveOnboardingSession?.name) ??
    null;
  const defaultContactEmail = session?.email ?? effectiveOnboardingSession?.email ?? null;
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
  let savedPrefill: HoldedSavedPrefill | null = null;

  const passiveVerifiedTenantPrefill =
    entryChannel === 'chatgpt' &&
    !session?.uid &&
    !tenantIdHint &&
    !effectiveOnboardingSession?.tenantId &&
    effectiveOnboardingSession?.emailVerified &&
    effectiveOnboardingSession.email
      ? await resolveVerifiedEmailTenantPrefill({
          uid: effectiveOnboardingSession.uid,
          email: effectiveOnboardingSession.email,
          contactName:
            normalizeMeaningfulPersonName(effectiveOnboardingSession.name) ?? defaultContactName,
        })
      : null;

  try {
    const auth =
      session?.uid || effectiveOnboardingSession?.tenantId
        ? await requireTenantContext({
            channelType: entryChannel,
            metadata: { source: 'holded-onboarding-page' },
            tenantIdHint: passiveVerifiedTenantPrefill?.tenantId ?? tenantIdHint,
            onboardingToken: effectiveOnboardingToken,
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

      summary = buildHoldedSummaryFromTenant(tenant as TenantSummaryRecord, {
        contactName: contactFullName,
        contactEmail,
      });
    }
  } catch (error) {
    console.error('[onboarding/holded] failed to load tenant summary', {
      message: error instanceof Error ? error.message : String(error),
      entryChannel,
    });
  }

  if (!resolvedTenantInfo.tenantId && passiveVerifiedTenantPrefill) {
    resolvedTenantInfo = {
      tenantId: passiveVerifiedTenantPrefill.tenantId,
      tenantIsDemo: passiveVerifiedTenantPrefill.tenantIsDemo,
      tenantNif: passiveVerifiedTenantPrefill.tenantNif,
    };
    summary = passiveVerifiedTenantPrefill.summary;
  }

  const companySetup = deriveHoldedCompanySetupState({
    entryChannel,
    requireConnectionConfirmation,
    tenantId: resolvedTenantInfo.tenantId,
    tenantIsDemo: resolvedTenantInfo.tenantIsDemo,
    tenantNif: resolvedTenantInfo.tenantNif,
    companyName: summary.companyName,
  });

  const shouldBindResolvedTenantToOnboardingToken =
    entryChannel === 'chatgpt' &&
    effectiveOnboardingSession?.emailVerified === true &&
    !!resolvedTenantInfo.tenantId &&
    (effectiveOnboardingSession?.tenantBound !== true ||
      effectiveOnboardingSession?.tenantId !== resolvedTenantInfo.tenantId);

  const clientOnboardingToken =
    shouldBindResolvedTenantToOnboardingToken && effectiveOnboardingSession?.uid
      ? await mintHoldedOnboardingTokenForSubject({
          uid: effectiveOnboardingSession.uid,
          email: effectiveOnboardingSession.email ?? session?.email ?? null,
          name:
            normalizeMeaningfulPersonName(effectiveOnboardingSession.name) ??
            normalizeMeaningfulPersonName(session?.name),
          tenantId: resolvedTenantInfo.tenantId,
          tenantBound: true,
          authMethod: effectiveOnboardingSession.authMethod,
          emailVerified: effectiveOnboardingSession.emailVerified,
          firstName: effectiveOnboardingSession.firstName,
          lastName: effectiveOnboardingSession.lastName,
          verifiedAt: effectiveOnboardingSession.verifiedAt,
        })
      : effectiveOnboardingToken;

  if (resolvedTenantInfo.tenantId) {
    try {
      const savedConnection = await resolveSharedHoldedConnectionForTenant(
        resolvedTenantInfo.tenantId,
        entryChannel === 'chatgpt' ? 'chatgpt' : 'dashboard'
      );

      if (savedConnection) {
        savedPrefill = {
          companyName: normalizeText(summary.companyName),
          companyTaxId: normalizeText(summary.companyTaxId),
          contactEmail: normalizeText(summary.contactEmail),
          maskedApiKey: maskSecret(savedConnection.apiKey),
          connectionStatus: savedConnection.status ?? null,
          lastSyncAt: savedConnection.lastSyncAt ?? null,
          lastError: savedConnection.lastError ?? null,
        };
      }
    } catch (error) {
      console.error('[onboarding/holded] failed to load saved Holded prefill', {
        tenantId: resolvedTenantInfo.tenantId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <HoldedOnboardingClient
      captureMode={captureMode}
      entryChannel={entryChannel}
      nextUrl={nextUrl}
      requireConnectionConfirmation={requireConnectionConfirmation}
      requiresVerifiedIdentity={entryChannel === 'chatgpt'}
      identity={{
        authMethod: effectiveOnboardingSession?.authMethod ?? 'unknown',
        email: normalizeText(effectiveOnboardingSession?.email),
        emailVerified: effectiveOnboardingSession?.emailVerified === true,
        firstName: normalizeText(effectiveOnboardingSession?.firstName),
        lastName: normalizeText(effectiveOnboardingSession?.lastName),
        verifiedAt: normalizeText(effectiveOnboardingSession?.verifiedAt),
      }}
      summary={summary}
      companySetup={companySetup}
      onboardingToken={clientOnboardingToken}
      tenantIdHint={
        resolvedTenantInfo.tenantId ?? passiveVerifiedTenantPrefill?.tenantId ?? tenantIdHint
      }
      savedPrefill={savedPrefill}
    />
  );
}
