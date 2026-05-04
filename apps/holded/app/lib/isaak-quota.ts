// Simple in-process rate limiting while DB-backed quota is not yet deployed.
// FUTURE: DB-backed quota (see instructions below)
//
// Required Prisma migration for TenantSubscription:
// - Add field: queriesUsedToday Int @default(0) @map("queries_used_today")
// - Add field: dailyQueryLimit Int (per-plan, default 10 for connector) @map("daily_query_limit")
// - Add field: lastQueryResetAt DateTime @default(now()) @map("last_query_reset_at")
//
// Once migration is applied and released:
// 1. Uncomment checkIsaakQuotaFromDB() function at bottom of this file
// 2. Update export function checkIsaakQuota() to call checkIsaakQuotaFromDB()
// 3. Remove this in-memory RateBucket implementation
//
// This prepares quota checks for production multi-instance deployments where
// in-memory state would be inconsistent across redeployments or horizontal scaling.

export type QuotaCheckResult =
  | { allowed: true }
  | {
      allowed: false;
      message: string;
      cta: string;
    };

type RateBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateBucket>();

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h rolling window
const DEFAULT_DAILY_LIMIT = 10; // enough to evaluate value, preserves upgrade urgency

// Single source of truth for quota exhaustion messaging
function buildQuotaExhaustedResponse(): Extract<QuotaCheckResult, { allowed: false }> {
  return {
    allowed: false,
    message:
      'Has alcanzado el límite diario del conector. Para análisis continuo con historial y memoria de tu empresa, Isaak completo está disponible en isaak.verifactu.business',
    cta: 'https://isaak.verifactu.business',
  };
}

export function checkIsaakQuota(tenantId: string): QuotaCheckResult {
  const now = Date.now();
  const bucket = buckets.get(tenantId);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(tenantId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= DEFAULT_DAILY_LIMIT) {
    return buildQuotaExhaustedResponse();
  }

  bucket.count += 1;
  return { allowed: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// DB-backed implementation stub (uncomment when TenantSubscription fields are added)
// ───────────────────────────────────────────────────────────────────────────────
//
// import { prisma } from '@/app/lib/prisma';
//
// async function checkIsaakQuotaFromDB(tenantId: string): Promise<QuotaCheckResult> {
//   const sub = await prisma.tenantSubscription.findFirst({
//     where: { tenantId },
//     select: {
//       id: true,
//       dailyQueryLimit: true,
//       queriesUsedToday: true,
//       lastQueryResetAt: true,
//     },
//   });
//
//   if (!sub) {
//     // No subscription: use free tier limit (10 queries/day)
//     return { allowed: true };
//   }
//
//   const now = new Date();
//   const resetTime = new Date(sub.lastQueryResetAt);
//   const isDayPassed =
//     now.getUTCDate() !== resetTime.getUTCDate() ||
//     now.getUTCMonth() !== resetTime.getUTCMonth() ||
//     now.getUTCFullYear() !== resetTime.getUTCFullYear();
//
//   if (isDayPassed) {
//     // Reset counter for new day
//     await prisma.tenantSubscription.update({
//       where: { id: sub.id },
//       data: { queriesUsedToday: 1, lastQueryResetAt: now },
//     });
//     return { allowed: true };
//   }
//
//   if (sub.queriesUsedToday >= sub.dailyQueryLimit) {
//     return buildQuotaExhaustedResponse();
//   }
//
//   // Increment counter
//   await prisma.tenantSubscription.update({
//     where: { id: sub.id },
//     data: { queriesUsedToday: { increment: 1 } },
//   });
//
//   return { allowed: true };
// }
