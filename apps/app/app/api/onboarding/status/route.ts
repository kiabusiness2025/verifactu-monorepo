import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload, requireUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const uid = requireUserId(session);

  const memberships = await prisma.membership.findMany({
    where: { userId: uid, status: 'active' },
    select: {
      tenantId: true,
      tenant: {
        select: {
          isDemo: true,
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      },
    },
  });

  const pref = await prisma.userPreference.findUnique({
    where: { userId: uid },
    select: { preferredTenantId: true },
  });

  const preferredTenantId = pref?.preferredTenantId ?? null;
  const hasAnyTenant = memberships.length > 0;
  const hasRealTenant = memberships.some((membership) => !membership.tenant?.isDemo);
  const hasTrialLimitedRealTenant = memberships.some((membership) => {
    if (membership.tenant?.isDemo) return false;
    const latestSubscription = membership.tenant?.subscriptions?.[0];
    return latestSubscription?.status === 'trial';
  });

  let trial: { status: string; trialEndsAt: string | null } | null = null;
  if (preferredTenantId) {
    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId: preferredTenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (subscription) {
      trial = {
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    hasAnyTenant,
    hasRealTenant,
    hasTrialLimitedRealTenant,
    preferredTenantId,
    trial,
  });
}
