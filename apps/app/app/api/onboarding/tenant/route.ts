import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { sendWelcomeLifecycleEmails } from '@/lib/email/holdedConnectionEmails';
import { prisma } from '@/lib/prisma';
import { getSessionPayload, requireUserId } from '@/lib/session';
import { upsertUser } from '@/lib/tenants';

type TenantPayload = {
  reuseCurrentTenant?: boolean;
  source?: 'einforma' | 'manual';
  einformaId?: string;
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
    legalForm?: string;
    status?: string;
    website?: string;
    capitalSocial?: number;
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
    email?: string;
    phone?: string;
    employees?: number;
    sales?: number;
    salesYear?: number;
    lastBalanceDate?: string;
    raw?: unknown;
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

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const uid = requireUserId(session);
  const body = (await req.json().catch(() => null)) as TenantPayload | null;

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
  const source = body?.source === 'einforma' ? 'einforma' : 'manual';
  const einformaId = typeof body?.einformaId === 'string' ? body.einformaId.trim() : undefined;
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

  if (!name || !taxIdRaw) {
    return NextResponse.json({ ok: false, error: 'name and taxId required' }, { status: 400 });
  }

  const userId = await upsertUser({
    id: uid,
    email: session?.email as string | undefined,
    name: session?.name as string | undefined,
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

  const existingRealMemberships = await prisma.membership.findMany({
    where: {
      userId,
      status: 'active',
      tenant: { isDemo: false },
    },
    select: { tenantId: true },
  });

  const hasTrialLimitedRealTenant = (
    await Promise.all(
      existingRealMemberships.map(async (membership) => {
        const latestSubscription = await prisma.tenantSubscription.findFirst({
          where: { tenantId: membership.tenantId },
          orderBy: { createdAt: 'desc' },
          select: { status: true },
        });
        return latestSubscription?.status === 'trial';
      })
    )
  ).some(Boolean);

  if (hasTrialLimitedRealTenant) {
    return NextResponse.json(
      {
        ok: false,
        action: 'TRIAL_LIMIT_REACHED',
        error:
          'En modo prueba solo puedes usar una empresa con datos reales. Para añadir otra, contrata un plan.',
        billingUrl: '/dashboard/settings?tab=billing',
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const planId = await resolvePlanId();
  const reusableCurrentTenant = await findReusableCurrentTenant({
    sessionTenantId: reuseCurrentTenant ? (session.tenantId ?? null) : null,
    userId,
  });

  const result = await prisma.$transaction(async (tx) => {
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

    const supportUser = await tx.user.upsert({
      where: { email: 'support@verifactu.business' },
      update: { role: 'ADMIN', name: 'Verifactu Support' },
      create: {
        email: 'support@verifactu.business',
        name: 'Verifactu Support',
        role: 'ADMIN',
      },
    });

    await tx.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: supportUser.id,
        },
      },
      create: {
        tenantId: tenant.id,
        userId: supportUser.id,
        role: 'owner',
        status: 'active',
      },
      update: {
        role: 'owner',
        status: 'active',
      },
    });

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
    const isEinforma = source === 'einforma';
    const cnaeParts = splitCnae(extra?.cnae);
    const cityParts = normalizeCity(extra?.city);
    const profileRaw = extra?.raw && typeof extra.raw === 'object' ? extra.raw : undefined;
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

    await tx.tenantProfile.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        source,
        sourceId: einformaId,
        taxId: taxIdRaw,
        legalName: legalName || name,
        tradeName: tradeName || name,
        fiscalAddress: effectiveFiscalAddress ?? undefined,
        taxRegime: taxRegime || extra?.taxRegime || undefined,
        defaultCurrency: defaultCurrency || extra?.defaultCurrency || 'EUR',
        cnae: extra?.cnae || undefined,
        cnaeCode: extra?.cnaeCode || cnaeParts.code,
        cnaeText: extra?.cnaeText || cnaeParts.text,
        legalForm: extra?.legalForm || undefined,
        status: extra?.status || undefined,
        website: extra?.website || undefined,
        capitalSocial: extra?.capitalSocial ?? undefined,
        incorporationDate: extra?.incorporationDate ? new Date(extra.incorporationDate) : undefined,
        address: extra?.address || undefined,
        postalCode: extra?.postalCode || cityParts.postalCode,
        city: cityParts.city || undefined,
        province: extra?.province || undefined,
        country: extra?.country || country || undefined,
        representative: extra?.representative || undefined,
        email: companyEmail || undefined,
        phone: companyPhone || undefined,
        einformaRaw: profileRaw,
        einformaLastSyncAt: isEinforma ? new Date() : undefined,
        einformaTaxIdVerified: isEinforma ? true : undefined,
      } as never,
      update: {
        source,
        sourceId: einformaId,
        taxId: taxIdRaw,
        legalName: legalName || name,
        tradeName: tradeName || name,
        fiscalAddress: effectiveFiscalAddress ?? undefined,
        taxRegime: taxRegime || extra?.taxRegime || undefined,
        defaultCurrency: defaultCurrency || extra?.defaultCurrency || 'EUR',
        cnae: extra?.cnae || undefined,
        cnaeCode: extra?.cnaeCode || cnaeParts.code,
        cnaeText: extra?.cnaeText || cnaeParts.text,
        legalForm: extra?.legalForm || undefined,
        status: extra?.status || undefined,
        website: extra?.website || undefined,
        capitalSocial: extra?.capitalSocial ?? undefined,
        incorporationDate: extra?.incorporationDate ? new Date(extra.incorporationDate) : undefined,
        address: extra?.address || undefined,
        postalCode: extra?.postalCode || cityParts.postalCode,
        city: cityParts.city || undefined,
        province: extra?.province || undefined,
        country: extra?.country || country || undefined,
        representative: extra?.representative || undefined,
        email: companyEmail || undefined,
        phone: companyPhone || undefined,
        einformaRaw: profileRaw,
        einformaLastSyncAt: isEinforma ? new Date() : undefined,
        einformaTaxIdVerified: isEinforma ? true : undefined,
      } as never,
    });

    return {
      tenant,
      subscription,
      action: reusableCurrentTenant ? 'UPDATED_CURRENT' : 'CREATED',
    };
  });

  try {
    await sendWelcomeLifecycleEmails({
      userEmail: session.email ?? null,
      userName: session.name ?? null,
      tenantName: tradeName || result.tenant.name,
      tenantLegalName: legalName || result.tenant.legalName || result.tenant.name,
      contactName: session.name ?? null,
      contactEmail: session.email ?? null,
      companyEmail,
      contactPhone: companyPhone,
    });
  } catch (notificationError) {
    console.error('[api/onboarding/tenant] welcome notification failed', {
      tenantId: result.tenant.id,
      uid,
      message:
        notificationError instanceof Error ? notificationError.message : String(notificationError),
    });
  }

  return NextResponse.json({
    ok: true,
    action: result.action,
    tenantId: result.tenant.id,
    trial: {
      status: result.subscription.status,
      trialEndsAt: result.subscription.trialEndsAt,
    },
  });
}
