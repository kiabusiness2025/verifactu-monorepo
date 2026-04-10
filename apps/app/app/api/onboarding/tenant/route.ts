import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { sendWelcomeLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import {
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { rememberVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import {
  getTenantProfileColumnAvailability,
  isMissingTenantProfileColumnError,
  LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY,
  type TenantProfileColumnAvailability,
  resetTenantProfileColumnAvailabilityCache,
} from '@/lib/tenantProfileSchema';
import { upsertUser } from '@/lib/tenants';
import { buildFullName } from '@/lib/personName';

type TenantPayload = {
  reuseCurrentTenant?: boolean;
  name: string;
  legalName?: string;
  nif?: string;
  taxId?: string;
  tradeName?: string;
  taxRegime?: string;
  defaultCurrency?: string;
  country?: string;
  fiscalAddress?: Record<string, unknown> | null;
  extra?: {
    cnae?: string;
    cnaeCode?: string;
    cnaeText?: string;
    website?: string;
    incorporationDate?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    province?: string;
    country?: string;
    taxRegime?: string;
    defaultCurrency?: string;
    fiscalAddress?: unknown;
    representative?: string;
    representativeRole?: string;
    contactFirstName?: string;
    contactLastName?: string;
    email?: string;
    phone?: string;
  };
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function looksLikeSyntheticCompanyName(value?: string | null) {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) return true;

  return normalized === 'tu empresa' || normalized.endsWith(' workspace');
}

async function findReusableCurrentTenant(input: {
  sessionTenantId?: string | null;
  userId: string;
}) {
  const tenantId = normalizeText(input.sessionTenantId);
  if (!tenantId) return null;

  const [membership, tenant] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        tenantId,
        userId: input.userId,
        status: 'active',
      },
      select: { tenantId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        legalName: true,
        nif: true,
        isDemo: true,
        profile: {
          select: {
            tradeName: true,
            taxId: true,
          },
        },
      },
    }),
  ]);

  if (!membership || !tenant) {
    return null;
  }

  const currentCompanyName = tenant.profile?.tradeName || tenant.name;
  const currentTaxId = normalizeText(tenant.profile?.taxId) || normalizeText(tenant.nif);
  const canReuse =
    tenant.isDemo || (!currentTaxId && looksLikeSyntheticCompanyName(currentCompanyName));

  return canReuse ? tenant : null;
}

function splitCnae(value?: string) {
  if (!value) return { code: undefined, text: undefined };
  const parts = value
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { code: undefined, text: undefined };
  if (parts.length === 1) return { code: parts[0], text: undefined };
  return { code: parts[0], text: parts.slice(1).join(' - ') };
}

function normalizeCity(value?: string) {
  if (!value) return { postalCode: undefined, city: undefined };
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})\s+([^()]+)(?:\s*\(.*\))?$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: undefined, city: trimmed.split('(')[0]?.trim() || trimmed };
}

async function resolvePlanId(): Promise<number> {
  const preferredCodes = ['base', 'pro', 'trial'];
  const plan =
    (await prisma.plan.findFirst({
      where: { code: { in: preferredCodes } },
      orderBy: { id: 'asc' },
    })) || (await prisma.plan.findFirst({ orderBy: { id: 'asc' } }));

  if (plan) return plan.id;

  const created = await prisma.plan.create({
    data: {
      code: 'trial',
      name: 'Plan Trial',
      fixedMonthly: new Prisma.Decimal(0),
      variableRate: new Prisma.Decimal(0),
    },
  });

  return created.id;
}

function buildRememberedPrefill(input: {
  companyName: string;
  legalName?: string | null;
  taxId: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  website?: string | null;
  sectorCode?: string | null;
  sectorLabel?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactRole?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
}) {
  const normalizedContactFirstName = normalizeText(input.contactFirstName);
  const normalizedContactLastName = normalizeText(input.contactLastName);

  return {
    companyName: normalizeText(input.companyName),
    companyLegalName: normalizeText(input.legalName) || normalizeText(input.companyName),
    companyTaxId: normalizeText(input.taxId)?.toUpperCase() || null,
    companyAddress: normalizeText(input.address),
    companyPostalCode: normalizeText(input.postalCode),
    companyCity: normalizeText(input.city),
    companyProvince: normalizeText(input.province),
    companyCountry: normalizeText(input.country),
    companyWebsite: normalizeText(input.website),
    companySectorCode: normalizeText(input.sectorCode),
    companySectorLabel: normalizeText(input.sectorLabel),
    contactFirstName: normalizedContactFirstName,
    contactLastName: normalizedContactLastName,
    contactRole: normalizeText(input.contactRole),
    contactFullName: buildFullName({
      firstName: normalizedContactFirstName,
      lastName: normalizedContactLastName,
    }),
    contactEmail: normalizeText(input.contactEmail)?.toLowerCase() || null,
    companyEmail: normalizeText(input.companyEmail)?.toLowerCase() || null,
    contactPhone: normalizeText(input.contactPhone),
  };
}

export async function POST(req: Request) {
  try {
    const session = await getSessionPayload();
    const onboardingSession = await resolveHoldedOnboardingSessionFromHeaders(req.headers);
    const authSession = onboardingSession
      ? {
          uid: onboardingSession.uid,
          email: onboardingSession.email ?? session?.email ?? null,
          name: onboardingSession.name ?? session?.name ?? null,
          tenantId: onboardingSession.tenantId ?? session?.tenantId ?? undefined,
        }
      : session?.uid
        ? session
        : null;
    if (!authSession?.uid) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (onboardingSession && !isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
      return NextResponse.json(
        { ok: false, error: 'identity verification required' },
        { status: 403 }
      );
    }

    const uid = authSession.uid;
    const body = (await req.json().catch(() => null)) as TenantPayload | null;
    const tenantProfileColumns = await getTenantProfileColumnAvailability();

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const legalName = typeof body?.legalName === 'string' ? body.legalName.trim() : '';
    const taxIdRaw =
      typeof body?.taxId === 'string'
        ? body.taxId.trim()
        : typeof body?.nif === 'string'
          ? body.nif.trim()
          : '';
    const tradeName = typeof body?.tradeName === 'string' ? body.tradeName.trim() : '';
    const taxRegime = typeof body?.taxRegime === 'string' ? body.taxRegime.trim() : '';
    const defaultCurrency =
      typeof body?.defaultCurrency === 'string' && body.defaultCurrency.trim()
        ? body.defaultCurrency.trim().toUpperCase()
        : 'EUR';
    const country =
      typeof body?.country === 'string' && body.country.trim()
        ? body.country.trim().toUpperCase()
        : 'ES';
    const reuseCurrentTenant = body?.reuseCurrentTenant === true;
    const fiscalAddress =
      body?.fiscalAddress && typeof body.fiscalAddress === 'object' ? body.fiscalAddress : null;
    const companyEmail =
      typeof body?.extra?.email === 'string' && body.extra.email.trim()
        ? body.extra.email.trim()
        : null;
    const companyPhone =
      typeof body?.extra?.phone === 'string' && body.extra.phone.trim()
        ? body.extra.phone.trim()
        : null;
    const contactFirstName =
      typeof body?.extra?.contactFirstName === 'string' && body.extra.contactFirstName.trim()
        ? body.extra.contactFirstName.trim()
        : null;
    const contactLastName =
      typeof body?.extra?.contactLastName === 'string' && body.extra.contactLastName.trim()
        ? body.extra.contactLastName.trim()
        : null;
    const contactFullName =
      [contactFirstName, contactLastName].filter(Boolean).join(' ').trim() ||
      (typeof body?.extra?.representative === 'string' && body.extra.representative.trim()
        ? body.extra.representative.trim()
        : null);

    if (!name || !taxIdRaw) {
      return NextResponse.json({ ok: false, error: 'name and taxId required' }, { status: 400 });
    }

    const userId = await upsertUser({
      id: uid,
      email: (authSession.email as string | undefined) || companyEmail || undefined,
      name: contactFullName || (authSession.name as string | undefined),
      firstName: contactFirstName,
      lastName: contactLastName,
    });

    const existingTenant = await prisma.tenant.findFirst({
      where: { nif: taxIdRaw },
    });

    if (existingTenant) {
      const membership = await prisma.membership.findFirst({
        where: { tenantId: existingTenant.id, userId },
      });

      if (membership) {
        await prisma.userPreference.upsert({
          where: { userId },
          create: { userId, preferredTenantId: existingTenant.id },
          update: { preferredTenantId: existingTenant.id },
        });
        return NextResponse.json({
          ok: true,
          action: 'ALREADY_MEMBER',
          tenantId: existingTenant.id,
        });
      }

      return NextResponse.json({
        ok: true,
        action: 'REQUEST_ACCESS',
        tenantId: existingTenant.id,
        message: 'Tu usuario no pertenece a esta empresa',
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const planId = await resolvePlanId();
    const reusableCurrentTenant = await findReusableCurrentTenant({
      sessionTenantId: reuseCurrentTenant ? (authSession.tenantId ?? null) : null,
      userId,
    });

    const runTenantProvisionTransaction = async (columns: TenantProfileColumnAvailability) =>
      prisma.$transaction(async (tx) => {
        const tenant = reusableCurrentTenant
          ? await tx.tenant.update({
              where: { id: reusableCurrentTenant.id },
              data: {
                name,
                legalName: legalName || undefined,
                nif: taxIdRaw,
                isDemo: false,
              },
            })
          : await tx.tenant.create({
              data: {
                name,
                legalName: legalName || undefined,
                nif: taxIdRaw,
              },
            });

        if (!reusableCurrentTenant) {
          await tx.membership.create({
            data: {
              tenantId: tenant.id,
              userId,
              role: 'owner',
              status: 'active',
            },
          });
        }

        await tx.userPreference.upsert({
          where: { userId },
          create: { userId, preferredTenantId: tenant.id },
          update: { preferredTenantId: tenant.id },
        });

        const existingSubscription = reusableCurrentTenant
          ? await tx.tenantSubscription.findFirst({
              where: { tenantId: tenant.id },
              orderBy: { createdAt: 'desc' },
            })
          : null;
        const subscription =
          existingSubscription ||
          (await tx.tenantSubscription.create({
            data: {
              tenantId: tenant.id,
              planId,
              status: 'trial',
              trialEndsAt,
              currentPeriodStart: now,
              currentPeriodEnd: trialEndsAt,
            },
          }));

        const extra = body?.extra;
        const cnaeParts = splitCnae(extra?.cnae);
        const cityParts = normalizeCity(extra?.city);
        const effectiveFiscalAddress =
          fiscalAddress ||
          (extra?.address || extra?.postalCode || extra?.city || extra?.province || extra?.country
            ? {
                address: extra?.address || null,
                postalCode: extra?.postalCode || cityParts.postalCode || null,
                city: cityParts.city || null,
                province: extra?.province || null,
                country: extra?.country || country,
              }
            : null);

        const buildTenantProfileData = (profileColumns: TenantProfileColumnAvailability) => ({
          source: 'manual',
          taxId: taxIdRaw,
          legalName: legalName || name,
          tradeName: tradeName || name,
          fiscalAddress: effectiveFiscalAddress ?? undefined,
          taxRegime: taxRegime || extra?.taxRegime || undefined,
          defaultCurrency: defaultCurrency || extra?.defaultCurrency || 'EUR',
          cnae: extra?.cnae || undefined,
          ...(profileColumns.cnaeCode ? { cnaeCode: extra?.cnaeCode || cnaeParts.code } : {}),
          ...(profileColumns.cnaeText ? { cnaeText: extra?.cnaeText || cnaeParts.text } : {}),
          ...(profileColumns.website ? { website: extra?.website || undefined } : {}),
          incorporationDate: extra?.incorporationDate
            ? new Date(extra.incorporationDate)
            : undefined,
          address: extra?.address || undefined,
          ...(profileColumns.postalCode
            ? { postalCode: extra?.postalCode || cityParts.postalCode }
            : {}),
          city: cityParts.city || undefined,
          province: extra?.province || undefined,
          ...(profileColumns.country ? { country: extra?.country || country || undefined } : {}),
          representative: extra?.representative || undefined,
          ...(profileColumns.representativeRole
            ? { representativeRole: extra?.representativeRole || undefined }
            : {}),
          email: companyEmail || undefined,
          phone: companyPhone || undefined,
        });

        const upsertTenantProfile = async () =>
          tx.tenantProfile.upsert({
            where: { tenantId: tenant.id },
            create: {
              tenantId: tenant.id,
              ...buildTenantProfileData(columns),
            } as never,
            update: buildTenantProfileData(columns) as never,
            select: { tenantId: true },
          });

        await upsertTenantProfile();

        return {
          tenant,
          subscription,
          action: reusableCurrentTenant ? 'UPDATED_CURRENT' : 'CREATED',
        };
      });

    let result;

    try {
      result = await runTenantProvisionTransaction(tenantProfileColumns);
    } catch (error) {
      if (!isMissingTenantProfileColumnError(error)) {
        throw error;
      }

      resetTenantProfileColumnAvailabilityCache();

      console.warn('[api/onboarding/tenant] retrying tenantProfile upsert with legacy schema', {
        message: error instanceof Error ? error.message : String(error),
      });

      result = await runTenantProvisionTransaction(LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY);
    }

    const rememberedContactEmail = normalizeText(authSession.email ?? null)?.toLowerCase() || null;
    const rememberedContactName =
      contactFullName ||
      buildFullName({
        firstName: onboardingSession?.firstName ?? null,
        lastName: onboardingSession?.lastName ?? null,
      }) ||
      normalizeText(authSession.name ?? null);

    if (rememberedContactEmail) {
      await rememberVerifiedHoldedEmailIdentity({
        uid,
        email: rememberedContactEmail,
        authMethod: onboardingSession?.authMethod ?? 'unknown',
        verifiedAt: onboardingSession?.verifiedAt ?? new Date().toISOString(),
        firstName: contactFirstName ?? onboardingSession?.firstName ?? null,
        lastName: contactLastName ?? onboardingSession?.lastName ?? null,
        fullName: rememberedContactName,
        tenantId: result.tenant.id,
        prefill: buildRememberedPrefill({
          companyName: tradeName || name,
          legalName: legalName || result.tenant.legalName || name,
          taxId: taxIdRaw,
          address: body?.extra?.address,
          postalCode: body?.extra?.postalCode,
          city: body?.extra?.city,
          province: body?.extra?.province,
          country: body?.extra?.country || country,
          website: body?.extra?.website,
          sectorCode: body?.extra?.cnaeCode,
          sectorLabel: body?.extra?.cnaeText,
          contactFirstName,
          contactLastName,
          contactRole: body?.extra?.representativeRole,
          contactEmail: rememberedContactEmail,
          companyEmail,
          contactPhone: companyPhone,
        }),
      }).catch((rememberError) => {
        console.error('[api/onboarding/tenant] failed to remember verified onboarding prefill', {
          uid,
          email: rememberedContactEmail,
          tenantId: result?.tenant?.id,
          message: rememberError instanceof Error ? rememberError.message : String(rememberError),
        });
      });
    }

    if (!onboardingSession) {
      try {
        await sendWelcomeLifecycleEmails({
          userEmail: authSession.email ?? null,
          userName: authSession.name ?? null,
          tenantName: tradeName || result.tenant.name,
          tenantLegalName: legalName || result.tenant.legalName || result.tenant.name,
          contactName: contactFullName || authSession.name || null,
          contactEmail: authSession.email ?? null,
          companyEmail,
          contactPhone: companyPhone,
        });
      } catch (notificationError) {
        console.error('[api/onboarding/tenant] welcome notification failed', {
          tenantId: result.tenant.id,
          uid,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      action: result.action,
      tenantId: result.tenant.id,
      onboardingToken: onboardingSession
        ? await mintHoldedOnboardingTokenForSubject({
            uid: onboardingSession.uid,
            email: onboardingSession.email ?? authSession.email ?? null,
            name: onboardingSession.name ?? contactFullName ?? authSession.name ?? null,
            tenantId: result.tenant.id,
            tenantBound: true,
            authMethod: onboardingSession.authMethod,
            emailVerified: onboardingSession.emailVerified,
            firstName: onboardingSession.firstName,
            lastName: onboardingSession.lastName,
            verifiedAt: onboardingSession.verifiedAt,
          })
        : null,
      trial: {
        status: result.subscription.status,
        trialEndsAt: result.subscription.trialEndsAt,
      },
    });
  } catch (error) {
    console.error('[api/onboarding/tenant] tenant provisioning failed', {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'No hemos podido preparar la empresa para continuar.',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
