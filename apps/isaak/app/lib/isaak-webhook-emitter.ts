// D1: Outbound webhook emitter.
//
// Usage:
//   await emitWebhookEvent(tenantId, 'invoice.created', { invoiceId, ... });
//
// Flow per call:
//   1. Load active endpoints for this tenant that subscribe to the event.
//   2. For each endpoint, write an IsaakWebhookDelivery record (status=pending)
//      and attempt the first delivery inline (fire-and-forget, max 5s).
//   3. Failed first attempts are picked up by the webhook-retry cron with
//      exponential backoff (1m → 5m → dead after 3 total attempts).
//
// Signature: POST body receives:
//   { id, event, timestamp, data }
// Headers:
//   X-Isaak-Event:     <event-type>
//   X-Isaak-Timestamp: <unix-seconds>
//   X-Isaak-Signature: sha256=<hmac-hex>   (HMAC-SHA256 of `${timestamp}.${body}`)

import { createHmac, randomUUID } from 'crypto';
import { prisma } from './prisma';

// ─── Event catalogue ──────────────────────────────────────────────────────────

export const ISAAK_WEBHOOK_EVENTS = [
  'invoice.created',
  'invoice.updated',
  'invoice.sent',
  'payment.registered',
  'verifactu.submitted',
  'verifactu.registered',
  'tax_return.drafted',
  'tax_return.submitted',
  'chat.completed',
] as const;

export type IsaakWebhookEventType = (typeof ISAAK_WEBHOOK_EVENTS)[number];

export function isValidWebhookEventType(s: string): s is IsaakWebhookEventType {
  return (ISAAK_WEBHOOK_EVENTS as ReadonlyArray<string>).includes(s);
}

// ─── Retry policy ────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

function nextRetryDelay(attempts: number): number {
  // attempts=1 → 60s, attempts=2 → 300s, attempts≥3 → dead
  if (attempts === 1) return 60_000;
  if (attempts === 2) return 300_000;
  return 0; // dead
}

// ─── Signing ─────────────────────────────────────────────────────────────────

function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

// ─── Single delivery attempt ──────────────────────────────────────────────────

type DeliveryAttemptResult = {
  ok: boolean;
  statusCode?: number;
  error?: string;
};

async function attemptDelivery(
  url: string,
  secret: string,
  eventType: string,
  payload: object,
  timeoutMs = 5_000
): Promise<DeliveryAttemptResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  const sig = signPayload(secret, timestamp, body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Isaak-Event': eventType,
        'X-Isaak-Timestamp': String(timestamp),
        'X-Isaak-Signature': `sha256=${sig}`,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ok = res.status >= 200 && res.status < 300;
    return { ok, statusCode: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type EmitWebhookResult = {
  endpointsFired: number;
  delivered: number;
  queued: number;
};

export async function emitWebhookEvent(
  tenantId: string,
  eventType: IsaakWebhookEventType,
  data: unknown
): Promise<EmitWebhookResult> {
  const endpoints = await prisma.isaakWebhookEndpoint.findMany({
    where: { tenantId, active: true },
  });

  const subscribed = endpoints.filter(
    (ep) => ep.events.length === 0 || ep.events.includes(eventType)
  );

  if (subscribed.length === 0) return { endpointsFired: 0, delivered: 0, queued: 0 };

  const payloadBase = {
    id: randomUUID(),
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  let delivered = 0;
  let queued = 0;

  await Promise.all(
    subscribed.map(async (ep) => {
      // Create delivery record first so the retry cron can pick it up even
      // if the inline attempt below throws unexpectedly.
      const delivery = await prisma.isaakWebhookDelivery.create({
        data: {
          endpointId: ep.id,
          tenantId,
          eventType,
          payload: payloadBase,
          status: 'pending',
          attempts: 0,
        },
      });

      const result = await attemptDelivery(ep.url, ep.secret, eventType, payloadBase);

      if (result.ok) {
        await prisma.isaakWebhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'delivered',
            attempts: 1,
            lastStatusCode: result.statusCode,
            deliveredAt: new Date(),
            nextRetryAt: null,
          },
        });
        delivered += 1;
      } else {
        const nextDelay = nextRetryDelay(1);
        await prisma.isaakWebhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: nextDelay > 0 ? 'failed' : 'dead',
            attempts: 1,
            lastStatusCode: result.statusCode ?? null,
            lastError: result.error ?? null,
            nextRetryAt: nextDelay > 0 ? new Date(Date.now() + nextDelay) : null,
          },
        });
        queued += 1;
      }
    })
  );

  return { endpointsFired: subscribed.length, delivered, queued };
}

// ─── Retry worker (called by the cron) ───────────────────────────────────────

export type RetryWebhooksResult = {
  processed: number;
  delivered: number;
  dead: number;
  errors: number;
};

export async function retryPendingWebhooks(): Promise<RetryWebhooksResult> {
  const due = await prisma.isaakWebhookDelivery.findMany({
    where: {
      status: 'failed',
      nextRetryAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: { endpoint: true },
    take: 50, // cap per cron run to stay within Vercel timeout
  });

  let delivered = 0;
  let dead = 0;
  let errors = 0;

  for (const delivery of due) {
    const ep = delivery.endpoint;
    if (!ep.active) {
      await prisma.isaakWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'dead', nextRetryAt: null },
      });
      dead += 1;
      continue;
    }

    const payload = delivery.payload as object;
    const result = await attemptDelivery(ep.url, ep.secret, delivery.eventType, payload);
    const newAttempts = delivery.attempts + 1;

    if (result.ok) {
      await prisma.isaakWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'delivered',
          attempts: newAttempts,
          lastStatusCode: result.statusCode,
          deliveredAt: new Date(),
          nextRetryAt: null,
        },
      });
      delivered += 1;
    } else {
      const nextDelay = nextRetryDelay(newAttempts);
      const isDead = nextDelay === 0 || newAttempts >= MAX_ATTEMPTS;
      await prisma.isaakWebhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: isDead ? 'dead' : 'failed',
          attempts: newAttempts,
          lastStatusCode: result.statusCode ?? null,
          lastError: result.error ?? null,
          nextRetryAt: isDead ? null : new Date(Date.now() + nextDelay),
        },
      });
      if (isDead) dead += 1;
      else errors += 1;
    }
  }

  return { processed: due.length, delivered, dead, errors };
}
