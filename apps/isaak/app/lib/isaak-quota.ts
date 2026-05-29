/**
 * DB-backed quota for Isaak chat.
 * Uses TenantSubscription.queriesUsedToday / dailyQueryLimit / lastQueryResetAt.
 *
 * dailyQueryLimit = -1 → unlimited (default for all plans, including Free).
 * Paid plans gate integrations (Holded, VeriFactu signing, banking), not query volume.
 *
 * Also handles unauthenticated (public) chat with an in-process IP counter as
 * a lightweight anti-abuse guard — not a hard paywall for public visitors.
 */

import { prisma } from './prisma';

export type QuotaCheckResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; message: string; resetsAt: string | null };

function nextMidnightUTC(): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
  );
  return next.toISOString();
}

function isNewDay(lastReset: Date): boolean {
  const now = new Date();
  return (
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate()
  );
}

export async function checkIsaakChatQuota(tenantId: string): Promise<QuotaCheckResult> {
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
    // No subscription row yet (user onboarding / not yet in Stripe).
    // Fall through to the in-process tenant store below.
    return checkInProcessTenantQuota(tenantId);
  }

  // Unlimited plan
  if (sub.dailyQueryLimit < 0) {
    return { allowed: true, remaining: null };
  }

  const now = new Date();
  const resetAt = new Date(sub.lastQueryResetAt);

  if (isNewDay(resetAt)) {
    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { queriesUsedToday: 1, lastQueryResetAt: now },
    });
    return { allowed: true, remaining: sub.dailyQueryLimit - 1 };
  }

  if (sub.queriesUsedToday >= sub.dailyQueryLimit) {
    return {
      allowed: false,
      message: `Has llegado a tus ${sub.dailyQueryLimit} mensajes de hoy. Activa Isaak Pro por 29 €/mes para continuar ahora, o vuelve mañana.`,
      resetsAt: nextMidnightUTC(),
    };
  }

  await prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { queriesUsedToday: { increment: 1 } },
  });

  return { allowed: true, remaining: sub.dailyQueryLimit - sub.queriesUsedToday - 1 };
}

// In-process store used for:
// 1. Authenticated tenants with no TenantSubscription row yet (onboarding)
// 2. Unauthenticated (public) visitors — keyed by IP
type InProcessEntry = { count: number; resetAt: number };
const inProcessStore = new Map<string, InProcessEntry>();
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function checkInProcessQuota(
  key: string,
  limit: number,
  exhaustedMessage: string
): QuotaCheckResult {
  const now = Date.now();
  const entry = inProcessStore.get(key);

  if (!entry || entry.resetAt <= now) {
    inProcessStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      message: exhaustedMessage,
      resetsAt: new Date(entry.resetAt).toISOString(),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

// For authenticated tenants with no DB subscription row yet — allow unlimited
function checkInProcessTenantQuota(_tenantId: string): QuotaCheckResult {
  return { allowed: true, remaining: null };
}

// Lightweight guard for unauthenticated (public) visitors — anti-abuse, not a hard paywall
const PUBLIC_LIMIT = 15;

export function checkPublicChatQuota(ip: string): QuotaCheckResult {
  return checkInProcessQuota(
    `ip:${ip}`,
    PUBLIC_LIMIT,
    'Has alcanzado el límite de mensajes del chat público. Crea tu cuenta gratuita en Isaak para continuar.'
  );
}
