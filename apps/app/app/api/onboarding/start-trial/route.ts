import { NextResponse } from "next/server";
import { getSessionPayload, requireUserId } from "../../../../lib/session";
import { ensureRole } from "../../../../lib/authz";
import { Roles } from "../../../../lib/roles";
import { prisma } from "../../../../lib/prisma";
import { upsertUser } from "../../../../lib/tenants";
import { Prisma } from "@prisma/client";

type TrialPayload = {
  name: string;
  legalName?: string;
  nif?: string;
};

async function resolvePlanId(): Promise<number> {
  const preferredCodes = ["base", "pro", "trial"];
  const plan =
    (await prisma.plan.findFirst({
      where: { code: { in: preferredCodes } },
      orderBy: { id: "asc" },
    })) ||
    (await prisma.plan.findFirst({ orderBy: { id: "asc" } }));

  if (plan) return plan.id;

  const created = await prisma.plan.create({
    data: {
      code: "trial",
      name: "Plan Trial",
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
  const body = (await req.json().catch(() => null)) as TrialPayload | null;

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const legalName = typeof body?.legalName === "string" ? body.legalName.trim() : "";
  const nif = typeof body?.nif === "string" ? body.nif.trim() : "";

  if (!name) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }

  await upsertUser({
    id: uid,
    email: session?.email as string | undefined,
    name: session?.name as string | undefined,
  });

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const planId = await resolvePlanId();

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name,
        legalName: legalName || undefined,
        nif: nif || undefined,
      },
    });

    await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: uid,
        role: "owner",
        status: "active",
      },
    });

    await tx.userPreference.upsert({
      where: { userId: uid },
      create: { userId: uid, preferredTenantId: tenant.id },
      update: { preferredTenantId: tenant.id },
    });

    await tx.userOnboarding.upsert({
      where: { userId: uid },
      create: { userId: uid, demoTenantId: tenant.id },
      update: { demoTenantId: tenant.id },
    });

    const subscription = await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId,
        status: "trial",
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });

    return { tenant, subscription };
  });

  return NextResponse.json({
    ok: true,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      legalName: result.tenant.legalName,
      nif: result.tenant.nif,
    },
    trialEndsAt: result.subscription.trialEndsAt,
  });
}
