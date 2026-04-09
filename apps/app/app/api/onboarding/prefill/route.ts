import { NextRequest, NextResponse } from 'next/server';
import { maskSecret } from '@/lib/integrations/accounting';
import {
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
import { normalizeMeaningfulPersonName, splitFullName } from '@/lib/personName';
import prisma from '@/lib/prisma';

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

function getOnboardingContactFirstName(value?: string | null) {
  return splitFullName(normalizeMeaningfulPersonName(value)).firstName || '';
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const onboardingSession = await resolveIdentityOnboardingSession(request, body);

  if (!isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
    return NextResponse.json(
      { ok: false, error: 'identity verification required' },
      { status: 403 }
    );
  }

  const normalizedUid = normalizeText(onboardingSession?.uid);
  const normalizedEmail = normalizeText(onboardingSession?.email)?.toLowerCase() || null;

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
    return NextResponse.json({ ok: true, summary: null, tenantIdHint: null, savedPrefill: null });
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
    return NextResponse.json({ ok: true, summary: null, tenantIdHint: null, savedPrefill: null });
  }

  const summary = buildHoldedSummaryFromTenant(selectedMembership.tenant, {
    contactName:
      normalizeMeaningfulPersonName(onboardingSession?.name) ||
      normalizeMeaningfulPersonName(user.name),
    contactEmail: normalizedEmail || normalizeText(user.email),
  });

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
}
