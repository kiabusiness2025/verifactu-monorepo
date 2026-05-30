// V1.5.3 — Estado de la cuota diaria del chat para el tenant actual.
//
// GET /api/isaak/quota/status
//
// Devuelve { unlimited, used, limit, remaining, percentage, resetsAtUtc }.
// Si dailyQueryLimit < 0 → unlimited=true y los demás campos no aplican.
// El front decide si mostrar banner según percentage (≥70% amarillo,
// ≥90% rojo).

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function nextMidnightUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0),
  ).toISOString();
}

export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sub = await prisma.tenantSubscription
    .findFirst({
      where: { tenantId: session.tenantId },
      select: {
        dailyQueryLimit: true,
        queriesUsedToday: true,
        lastQueryResetAt: true,
        status: true,
        plan: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    .catch(() => null);

  if (!sub) {
    return NextResponse.json({ unlimited: true });
  }

  if (sub.dailyQueryLimit < 0) {
    return NextResponse.json({
      unlimited: true,
      planCode: sub.plan?.code ?? null,
      planStatus: sub.status,
    });
  }

  // Si el último reset NO es de hoy, el counter efectivo es 0.
  const now = new Date();
  const used =
    sub.lastQueryResetAt && isSameUtcDay(sub.lastQueryResetAt, now)
      ? sub.queriesUsedToday
      : 0;
  const remaining = Math.max(0, sub.dailyQueryLimit - used);
  const percentage = Math.min(100, Math.round((used / sub.dailyQueryLimit) * 100));

  return NextResponse.json({
    unlimited: false,
    used,
    limit: sub.dailyQueryLimit,
    remaining,
    percentage,
    resetsAtUtc: nextMidnightUtc(),
    planCode: sub.plan?.code ?? null,
    planStatus: sub.status,
  });
}
