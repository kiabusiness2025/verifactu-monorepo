import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureRole } from '@/lib/authz';
import { Roles } from '@/lib/roles';
import { getSessionPayload, requireUserId } from '@/lib/session';
import { upsertUser } from '@/lib/tenants';

type TenantPayload = {
  source?: 'einforma' | 'manual';
  einformaId?: string;
  name: string;
  legalName?: string;
  nif: string;
  extra?: {
    cnae?: string;
    legalForm?: string;
    status?: string;
    website?: string;
    capitalSocial?: number;
    incorporationDate?: string;
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    representative?: string;
  };
};

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
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;

  const uid = requireUserId(session);
  const body = (await req.json().catch(() => null)) as TenantPayload | null;

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const legalName = typeof body?.legalName === 'string' ? body.legalName.trim() : '';
  const nif = typeof body?.nif === 'string' ? body.nif.trim() : '';
  const source = body?.source === 'einforma' ? 'einforma' : 'manual';
  const einformaId = typeof body?.einformaId === 'string' ? body.einformaId.trim() : undefined;

  if (!name || !nif) {
    return NextResponse.json({ ok: false, error: 'name and nif required' }, { status: 400 });
  }

  await upsertUser({
    id: uid,
    email: session?.email as string | undefined,
    name: session?.name as string | undefined,
  });

  const existingTenant = await prisma.tenant.findFirst({
    where: { nif },
  });

  if (existingTenant) {
    const membership = await prisma.membership.findFirst({
      where: { tenantId: existingTenant.id, userId: uid },
    });

    if (membership) {
      await prisma.userPreference.upsert({
        where: { userId: uid },
        create: { userId: uid, preferredTenantId: existingTenant.id },
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

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name,
        legalName: legalName || undefined,
        nif,
      },
    });

    await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: uid,
        role: 'owner',
        status: 'active',
      },
    });

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
      where: { userId: uid },
      create: { userId: uid, preferredTenantId: tenant.id },
      update: { preferredTenantId: tenant.id },
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId,
        status: 'trial',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });

    if (body?.extra) {
      const isEinforma = source === 'einforma';
      const cnaeParts = splitCnae(body.extra.cnae);
      const cityParts = normalizeCity(body.extra.city);
      await tx.tenantProfile.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          source,
          sourceId: einformaId,
          cnae: body.extra.cnae || undefined,
          cnaeCode: cnaeParts.code,
          cnaeText: cnaeParts.text,
          legalForm: body.extra.legalForm || undefined,
          status: body.extra.status || undefined,
          website: body.extra.website || undefined,
          capitalSocial: body.extra.capitalSocial ?? undefined,
          incorporationDate: body.extra.incorporationDate
            ? new Date(body.extra.incorporationDate)
            : undefined,
          address: body.extra.address || undefined,
          postalCode: cityParts.postalCode,
          city: cityParts.city || undefined,
          province: body.extra.province || undefined,
          country: body.extra.country || undefined,
          representative: body.extra.representative || undefined,
          einformaLastSyncAt: isEinforma ? new Date() : undefined,
          einformaTaxIdVerified: isEinforma ? true : undefined,
        },
        update: {
          source,
          sourceId: einformaId,
          cnae: body.extra.cnae || undefined,
          cnaeCode: cnaeParts.code,
          cnaeText: cnaeParts.text,
          legalForm: body.extra.legalForm || undefined,
          status: body.extra.status || undefined,
          website: body.extra.website || undefined,
          capitalSocial: body.extra.capitalSocial ?? undefined,
          incorporationDate: body.extra.incorporationDate
            ? new Date(body.extra.incorporationDate)
            : undefined,
          address: body.extra.address || undefined,
          postalCode: cityParts.postalCode,
          city: cityParts.city || undefined,
          province: body.extra.province || undefined,
          country: body.extra.country || undefined,
          representative: body.extra.representative || undefined,
          einformaLastSyncAt: isEinforma ? new Date() : undefined,
          einformaTaxIdVerified: isEinforma ? true : undefined,
        },
      });
    }

    return { tenant, subscription };
  });

  return NextResponse.json({
    ok: true,
    action: 'CREATED',
    tenantId: result.tenant.id,
    trial: {
      status: result.subscription.status,
      trialEndsAt: result.subscription.trialEndsAt,
    },
  });
}
