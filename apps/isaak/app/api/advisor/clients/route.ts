import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/advisor/clients
 *
 * Returns all tenants where the logged-in user has MembershipSide = 'advisor'.
 * Includes subscription status and last Isaak activity per tenant.
 */
export async function GET() {
  const session = await getHoldedSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.userId,
      side: 'advisor',
      status: 'active',
    },
    select: {
      tenantId: true,
      role: true,
      createdAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          legalName: true,
          createdAt: true,
          tenantSubscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              status: true,
              trialEndsAt: true,
              plan: { select: { name: true, code: true } },
            },
          },
          isaakConversations: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { id: true, title: true, updatedAt: true },
          },
          isaakAlerts: {
            where: { status: 'pending' },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const clients = memberships.map((m) => {
    const t = m.tenant;
    const sub = t.tenantSubscriptions[0];
    const lastConv = t.isaakConversations[0];
    return {
      tenantId: t.id,
      name: t.name,
      legalName: t.legalName,
      memberRole: m.role,
      subscription: sub
        ? {
            status: sub.status,
            planName: sub.plan.name,
            planCode: sub.plan.code,
            trialEndsAt: sub.trialEndsAt,
          }
        : null,
      lastActivity: lastConv ? { title: lastConv.title, updatedAt: lastConv.updatedAt } : null,
      pendingAlertsCount: t.isaakAlerts.length,
    };
  });

  return NextResponse.json({ ok: true, clients });
}
