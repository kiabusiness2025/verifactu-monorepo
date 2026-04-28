// Simple in-process rate limiting while IsaakSubscription table doesn't exist yet.
// Once the Prisma migration for Phase 1 models is applied, replace this with
// a real DB-backed quota check against IsaakSubscription.queriesUsed / queriesLimit.

type RateBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateBucket>();

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h rolling window
const DEFAULT_DAILY_LIMIT = 50; // generous limit while in beta

export function checkIsaakQuota(tenantId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(tenantId);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(tenantId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= DEFAULT_DAILY_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}
