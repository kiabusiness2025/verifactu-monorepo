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
    incorporationDate?: string;
    address?: string;
    city?: string;
    province?: string;
    representative?: string;
  };
};

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
      await tx.tenantProfile.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          source,
          sourceId: einformaId,
          cnae: body.extra.cnae || undefined,
          incorporationDate: body.extra.incorporationDate
            ? new Date(body.extra.incorporationDate)
            : undefined,
          address: body.extra.address || undefined,
          city: body.extra.city || undefined,
          province: body.extra.province || undefined,
          representative: body.extra.representative || undefined,
          einformaLastSyncAt: isEinforma ? new Date() : undefined,
          einformaTaxIdVerified: isEinforma ? true : undefined,
        },
        update: {
          source,
          sourceId: einformaId,
          cnae: body.extra.cnae || undefined,
          incorporationDate: body.extra.incorporationDate
            ? new Date(body.extra.incorporationDate)
            : undefined,
          address: body.extra.address || undefined,
          city: body.extra.city || undefined,
          province: body.extra.province || undefined,
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
