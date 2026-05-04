// DB-backed rate limiting for connector quota.
// Reads and increments TenantSubscription.queriesUsedToday atomically.
// Resets the counter when the calendar day (UTC) changes.
//
// Fields required in TenantSubscription (migration 20260504210000_add_quota_fields):
//   queriesUsedToday  Int      @default(0)
//   dailyQueryLimit   Int      @default(10)
//   lastQueryResetAt  DateTime @default(now())

import { prisma } from '@/app/lib/prisma';

export type QuotaCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      message: string;
      cta: string;
    };

// Single source of truth for quota exhaustion messaging
function buildQuotaExhaustedResponse(): Extract<QuotaCheckResult, { allowed: false }> {
  return {
    allowed: false,
    message:
      'Has alcanzado el límite diario del conector. Para análisis continuo con historial y memoria de tu empresa, Isaak completo está disponible en isaak.verifactu.business',
    cta: 'https://isaak.verifactu.business',
  };
}

export async function checkIsaakQuota(tenantId: string): Promise<QuotaCheckResult> {
  const sub = await prisma.tenantSubscription.findFirst({
    where: { tenantId },
    select: {
      id: true,
      dailyQueryLimit: true,
      queriesUsedToday: true,
      lastQueryResetAt: true,
    },
  });

  if (!sub) {
    // No subscription record — allow (tenant still onboarding) with free-tier cap
    // handled by in-process fallback below
    return { allowed: true };
  }

  const now = new Date();
  const resetAt = new Date(sub.lastQueryResetAt);
  const newDay =
    now.getUTCFullYear() !== resetAt.getUTCFullYear() ||
    now.getUTCMonth() !== resetAt.getUTCMonth() ||
    now.getUTCDate() !== resetAt.getUTCDate();

  if (newDay) {
    // Reset counter for new UTC day
    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { queriesUsedToday: 1, lastQueryResetAt: now },
    });
    return { allowed: true };
  }

  if (sub.queriesUsedToday >= sub.dailyQueryLimit) {
    return buildQuotaExhaustedResponse();
  }

  // Atomic increment
  await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { queriesUsedToday: { increment: 1 } },
  });

  return { allowed: true };
}
