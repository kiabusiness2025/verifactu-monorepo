import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureRole } from "@/lib/authz";
import { Roles } from "@/lib/roles";
import { getSessionPayload, requireUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionPayload();
  const guard = ensureRole({ session, minRole: Roles.default });
  if (guard) return guard;

  const uid = requireUserId(session);

  const memberships = await prisma.membership.findMany({
    where: { userId: uid, status: "active" },
    select: { tenantId: true },
  });

  const pref = await prisma.userPreference.findUnique({
    where: { userId: uid },
    select: { preferredTenantId: true },
  });

  const preferredTenantId = pref?.preferredTenantId ?? null;
  const hasAnyTenant = memberships.length > 0;

  let trial: { status: string; trialEndsAt: string | null } | null = null;
  if (preferredTenantId) {
    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId: preferredTenantId },
      orderBy: { createdAt: "desc" },
    });
    if (subscription) {
      trial = {
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt
          ? subscription.trialEndsAt.toISOString()
          : null,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    hasAnyTenant,
    preferredTenantId,
    trial,
  });
}
