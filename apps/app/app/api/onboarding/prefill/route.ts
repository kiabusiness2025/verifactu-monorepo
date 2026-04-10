import { NextRequest, NextResponse } from 'next/server';
import { maskSecret } from '@/lib/integrations/accounting';
import {
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import {
  readVerifiedHoldedEmailIdentity,
  type RememberedHoldedOnboardingPrefill,
} from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
import { buildFullName, normalizeMeaningfulPersonName, splitFullName } from '@/lib/personName';
import prisma from '@/lib/prisma';
import {
  buildTenantProfileOnboardingSelect,
  getTenantProfileColumnAvailability,
} from '@/lib/tenantProfileSchema';

export const runtime = 'nodejs';

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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
    representativeRole?: string | null;
    email: string | null;
    phone: string | null;
    website?: string | null;
    cnae: string | null;
    cnaeCode?: string | null;
    cnaeText?: string | null;
    address: string | null;
    fiscalAddress?: unknown;
    postalCode?: string | null;
    city: string | null;
    province: string | null;
    country?: string | null;
  } | null;
};

function getFiscalAddressField(fiscalAddress: unknown, field: 'postalCode' | 'country') {
  if (!fiscalAddress || typeof fiscalAddress !== 'object' || Array.isArray(fiscalAddress)) {
    return null;
  }

  const value = (fiscalAddress as Record<string, unknown>)[field];
  return typeof value === 'string' ? normalizeText(value) : null;
}

function getOnboardingContactFirstName(value?: string | null) {
  return splitFullName(normalizeMeaningfulPersonName(value)).firstName || '';
}

function buildHoldedSummaryFromRememberedPrefill(
  prefill: RememberedHoldedOnboardingPrefill,
  defaults: { contactName?: string | null; contactEmail?: string | null }
) {
  const rememberedFullName =
    normalizeMeaningfulPersonName(prefill.contactFullName) ||
    buildFullName({
      firstName: prefill.contactFirstName,
      lastName: prefill.contactLastName,
    }) ||
    normalizeMeaningfulPersonName(defaults.contactName) ||
    null;

  return {
    companyName: prefill.companyName || prefill.companyLegalName || 'Tu empresa',
    companyLegalName: prefill.companyLegalName,
    companyTaxId: prefill.companyTaxId,
    companyAddress: prefill.companyAddress,
    companyPostalCode: prefill.companyPostalCode,
    companyCity: prefill.companyCity,
    companyProvince: prefill.companyProvince,
    companyCountry: prefill.companyCountry,
    companyWebsite: prefill.companyWebsite,
    companySectorCode: prefill.companySectorCode,
    companySectorLabel: prefill.companySectorLabel,
    contactFirstName: prefill.contactFirstName || getOnboardingContactFirstName(rememberedFullName),
    contactRole: prefill.contactRole,
    contactFullName: rememberedFullName,
    contactEmail: prefill.contactEmail || normalizeText(defaults.contactEmail),
    companyEmail: prefill.companyEmail,
    contactPhone: prefill.contactPhone,
  };
}

function mergeSummaryWithRememberedPrefill(
  summary: ReturnType<typeof buildHoldedSummaryFromTenant>,
  prefill?: RememberedHoldedOnboardingPrefill | null
) {
  if (!prefill) {
    return summary;
  }

  const rememberedFullName =
    normalizeMeaningfulPersonName(prefill.contactFullName) ||
    buildFullName({
      firstName: prefill.contactFirstName,
      lastName: prefill.contactLastName,
    });
  const companyName = normalizeText(summary.companyName);

  return {
    ...summary,
    companyName:
      companyName && companyName.toLowerCase() !== 'tu empresa'
        ? summary.companyName
        : prefill.companyName || prefill.companyLegalName || summary.companyName,
    companyLegalName: summary.companyLegalName || prefill.companyLegalName,
    companyTaxId: summary.companyTaxId || prefill.companyTaxId,
    companyAddress: summary.companyAddress || prefill.companyAddress,
    companyPostalCode: summary.companyPostalCode || prefill.companyPostalCode,
    companyCity: summary.companyCity || prefill.companyCity,
    companyProvince: summary.companyProvince || prefill.companyProvince,
    companyCountry: summary.companyCountry || prefill.companyCountry,
    companyWebsite: summary.companyWebsite || prefill.companyWebsite,
    companySectorCode: summary.companySectorCode || prefill.companySectorCode,
    companySectorLabel: summary.companySectorLabel || prefill.companySectorLabel,
    contactFirstName:
      summary.contactFirstName ||
      prefill.contactFirstName ||
      getOnboardingContactFirstName(rememberedFullName),
    contactRole: summary.contactRole || prefill.contactRole,
    contactFullName: summary.contactFullName || rememberedFullName,
    contactEmail: summary.contactEmail || prefill.contactEmail,
    companyEmail: summary.companyEmail || prefill.companyEmail,
    contactPhone: summary.contactPhone || prefill.contactPhone,
  };
}

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
    companyPostalCode:
      normalizeText(tenant.profile?.postalCode) ||
      getFiscalAddressField(tenant.profile?.fiscalAddress, 'postalCode'),
    companyCity: normalizeText(tenant.profile?.city),
    companyProvince: normalizeText(tenant.profile?.province),
    companyCountry:
      normalizeText(tenant.profile?.country) ||
      getFiscalAddressField(tenant.profile?.fiscalAddress, 'country'),
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

async function resolveIdentityOnboardingSession(
  request: NextRequest,
  body: Record<string, unknown>
) {
  const headerSession = await resolveHoldedOnboardingSessionFromHeaders(request.headers);
  if (headerSession?.uid) {
    return headerSession;
  }

  const bodyOnboardingToken =
    typeof body.onboardingToken === 'string' ? body.onboardingToken.trim() : '';
  if (bodyOnboardingToken) {
    const bodySession = await resolveHoldedOnboardingSession(bodyOnboardingToken);
    if (bodySession?.uid) {
      return bodySession;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const onboardingSession = await resolveIdentityOnboardingSession(request, body);
    const tenantProfileColumns = await getTenantProfileColumnAvailability();

    if (!isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
      return NextResponse.json(
        { ok: false, error: 'identity verification required' },
        { status: 403 }
      );
    }

    const normalizedUid = normalizeText(onboardingSession?.uid);
    const normalizedEmail = normalizeText(onboardingSession?.email)?.toLowerCase() || null;
    const rememberedIdentity = await readVerifiedHoldedEmailIdentity({
      uid: normalizedUid,
      email: normalizedEmail,
    });

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
      return NextResponse.json({
        ok: true,
        summary: rememberedIdentity?.prefill
          ? buildHoldedSummaryFromRememberedPrefill(rememberedIdentity.prefill, {
              contactName:
                rememberedIdentity.fullName ||
                normalizeMeaningfulPersonName(onboardingSession?.name),
              contactEmail: normalizedEmail,
            })
          : null,
        tenantIdHint: null,
        savedPrefill: null,
      });
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
                select: buildTenantProfileOnboardingSelect(tenantProfileColumns),
              },
            },
          },
        },
      }),
    ]);

    const preferredMembership = preference?.preferredTenantId
      ? memberships.find((membership) => membership.tenantId === preference.preferredTenantId) ||
        null
      : null;
    const realMemberships = memberships.filter((membership) => !membership.tenant.isDemo);
    const selectedMembership = preferredMembership || realMemberships[0] || memberships[0] || null;

    if (!selectedMembership) {
      return NextResponse.json({
        ok: true,
        summary: rememberedIdentity?.prefill
          ? buildHoldedSummaryFromRememberedPrefill(rememberedIdentity.prefill, {
              contactName:
                rememberedIdentity.fullName ||
                normalizeMeaningfulPersonName(onboardingSession?.name) ||
                normalizeMeaningfulPersonName(user.name),
              contactEmail: normalizedEmail || normalizeText(user.email),
            })
          : null,
        tenantIdHint: null,
        savedPrefill: null,
      });
    }

    const summary = mergeSummaryWithRememberedPrefill(
      buildHoldedSummaryFromTenant(selectedMembership.tenant, {
        contactName:
          rememberedIdentity?.fullName ||
          normalizeMeaningfulPersonName(onboardingSession?.name) ||
          normalizeMeaningfulPersonName(user.name),
        contactEmail: normalizedEmail || normalizeText(user.email),
      }),
      rememberedIdentity?.prefill
    );

    const savedConnection = await resolveSharedHoldedConnectionForTenant(
      selectedMembership.tenantId,
      'chatgpt'
    ).catch(() => null);

    const refreshedToken = await mintHoldedOnboardingTokenForSubject({
      uid: onboardingSession!.uid,
      email: onboardingSession!.email,
      name: onboardingSession!.name,
      tenantId: selectedMembership.tenantId,
      tenantBound: true,
      authMethod: onboardingSession!.authMethod,
      emailVerified: onboardingSession!.emailVerified,
      firstName: onboardingSession!.firstName,
      lastName: onboardingSession!.lastName,
      verifiedAt: onboardingSession!.verifiedAt,
    });

    return NextResponse.json({
      ok: true,
      tenantIdHint: selectedMembership.tenantId,
      onboardingToken: refreshedToken,
      summary,
      savedPrefill: savedConnection
        ? {
            companyName: normalizeText(summary.companyName),
            companyTaxId: normalizeText(summary.companyTaxId),
            contactEmail: normalizeText(summary.contactEmail),
            maskedApiKey: maskSecret(savedConnection.apiKey),
            connectionStatus: savedConnection.status ?? null,
            lastSyncAt: savedConnection.lastSyncAt ?? null,
            lastError: savedConnection.lastError ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[api/onboarding/prefill] failed to resolve remembered prefill', {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json({
      ok: true,
      summary: null,
      tenantIdHint: null,
      savedPrefill: null,
      degraded: true,
    });
  }
}
