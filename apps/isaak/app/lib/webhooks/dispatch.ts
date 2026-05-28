/**
 * dispatchPendingDeliveries — drain the outbound webhook queue.
 *
 * Reads up to `batchSize` rows from isaak_webhook_deliveries in
 * status='pending' with nextAttemptAt <= now (or null), signs the payload
 * with HMAC-SHA256, POSTs to the registered endpoint with a 5 s timeout,
 * and updates the row according to the response:
 *
 *   2xx         → delivered (deliveredAt = now)
 *   non-2xx /
 *   network err → pending + nextAttemptAt = now + backoff(attempts)
 *                 unless attempts ≥ MAX_ATTEMPTS, then → dead.
 *
 * Backoff schedule (seconds): 60, 300, 1800, 7200, 43200, 86400
 * (1 m, 5 m, 30 m, 2 h, 12 h, 24 h).
 *
 * The cron at /api/cron/webhooks-dispatch invokes this every minute.
 */
import { prisma } from '@/app/lib/prisma';
import { signPayload } from './signer';

export const MAX_ATTEMPTS = 6;
export const FETCH_TIMEOUT_MS = 5000;

/**
 * Lease length for an in-flight claim. If a dispatcher crashes between
 * claiming a row and writing the final result, the row stays in 'pending'
 * but with nextAttemptAt = now + LEASE_MS. Once the lease expires another
 * dispatcher will retry it. Must be > FETCH_TIMEOUT_MS by a safe margin.
 */
export const DISPATCHER_LEASE_MS = 120_000;

/** Seconds to wait before the next retry, indexed by *new* attempt number (1..6). */
const BACKOFF_SECONDS = [60, 300, 1800, 7200, 43_200, 86_400];

export function backoffSeconds(newAttemptNumber: number): number {
  // newAttemptNumber=1 → 60s, ..., =6 → 86_400s. Clamp out-of-range.
  if (newAttemptNumber < 1) return BACKOFF_SECONDS[0];
  if (newAttemptNumber > BACKOFF_SECONDS.length) {
    return BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1];
  }
  return BACKOFF_SECONDS[newAttemptNumber - 1];
}

export type DispatchOptions = { batchSize?: number };

export type DispatchSummary = {
  processed: number;
  delivered: number;
  failed: number;
  dead: number;
};

type DeliveryRow = {
  id: string;
  endpointId: string;
  eventId: string;
  payload: unknown;
  attempts: number;
  endpoint: { url: string; secret: string; active: boolean } | null;
};

export async function dispatchPendingDeliveries(
  options: DispatchOptions = {}
): Promise<DispatchSummary> {
  const batchSize = options.batchSize ?? 50;
  const now = new Date();

  const rows = (await prisma.isaakWebhookDelivery.findMany({
    where: {
      status: 'pending',
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
    include: {
      endpoint: { select: { url: true, secret: true, active: true } },
    },
  })) as unknown as DeliveryRow[];

  const summary: DispatchSummary = {
    processed: rows.length,
    delivered: 0,
    failed: 0,
    dead: 0,
  };

  for (const row of rows) {
    // Endpoint was deleted (FK SET NULL) or deactivated after the delivery
    // was queued. Mark as dead so we don't keep retrying. We still claim
    // atomically so two concurrent dispatchers don't double-count this row.
    if (!row.endpoint || row.endpoint.active === false) {
      const terminalClaim = await prisma.isaakWebhookDelivery.updateMany({
        where: { id: row.id, status: 'pending', attempts: row.attempts },
        data: {
          status: 'dead',
          lastError: !row.endpoint ? 'endpoint_deleted' : 'endpoint_inactive',
          nextAttemptAt: null,
        },
      });
      if (terminalClaim.count > 0) summary.dead++;
      continue;
    }

    // ATOMIC CLAIM (CAS): increment `attempts` only if the row is still
    // pending with the attempts value we saw. If another dispatcher already
    // bumped it, count is 0 and we skip — they own this row.
    //
    // The lease (nextAttemptAt = now + DISPATCHER_LEASE_MS) protects against
    // dispatcher crashes mid-flight: after the lease expires the row becomes
    // visible to the next dispatcher again, even if we never wrote a result.
    const claimedAttempts = row.attempts + 1;
    const claim = await prisma.isaakWebhookDelivery.updateMany({
      where: { id: row.id, status: 'pending', attempts: row.attempts },
      data: {
        attempts: claimedAttempts,
        nextAttemptAt: new Date(Date.now() + DISPATCHER_LEASE_MS),
      },
    });
    if (claim.count === 0) continue;

    const body = JSON.stringify(row.payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload(row.endpoint.secret, timestamp, body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let networkError: string | null = null;

    try {
      const res = await fetch(row.endpoint.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Isaak-Webhooks/1.0',
          'x-isaak-event-id': row.eventId,
          'x-isaak-timestamp': timestamp,
          'x-isaak-signature': signature,
        },
        body,
        signal: controller.signal,
        cache: 'no-store',
      });
      statusCode = res.status;
      // Cap the response body we persist to 1024 chars (DB column limit).
      const text = await res.text().catch(() => '');
      responseBody = text.slice(0, 1024) || null;
    } catch (err: unknown) {
      networkError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }

    const succeeded = statusCode !== null && statusCode >= 200 && statusCode < 300;

    // attempts has already been incremented to claimedAttempts in the CAS
    // claim above — do not increment it again in any branch below.
    if (succeeded) {
      await prisma.isaakWebhookDelivery.update({
        where: { id: row.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          lastStatusCode: statusCode,
          lastResponseBody: responseBody,
          lastError: null,
          nextAttemptAt: null,
        },
      });
      summary.delivered++;
      continue;
    }

    const lastError = (networkError ?? `http_${statusCode ?? 'unknown'}`).slice(0, 1000);

    if (claimedAttempts >= MAX_ATTEMPTS) {
      await prisma.isaakWebhookDelivery.update({
        where: { id: row.id },
        data: {
          status: 'dead',
          lastError,
          lastStatusCode: statusCode,
          lastResponseBody: responseBody,
          nextAttemptAt: null,
        },
      });
      summary.dead++;
      continue;
    }

    const nextAttemptAt = new Date(Date.now() + backoffSeconds(claimedAttempts) * 1000);

    await prisma.isaakWebhookDelivery.update({
      where: { id: row.id },
      data: {
        status: 'pending',
        lastError,
        lastStatusCode: statusCode,
        lastResponseBody: responseBody,
        nextAttemptAt,
      },
    });
    summary.failed++;
  }

  return summary;
}
