/**
 * enqueueWebhookDelivery — schedule a webhook for every active endpoint of
 * a tenant that subscribes to the given event type.
 *
 * Best-effort: callers (the invoice issue flow, etc.) MUST NOT propagate
 * errors from this function. If the DB is down or no endpoint matches we
 * simply skip — the business event has already happened.
 *
 * One IsaakWebhookDelivery row is created per matching endpoint, in
 * status='pending', with the payload pre-built so the cron only has to
 * sign + POST.
 */
import { randomBytes } from 'crypto';
import { prisma } from '@/app/lib/prisma';

export type EnqueueInput = {
  tenantId: string;
  eventType: string;
  /** Domain payload — will be wrapped in the `data` field of the envelope. */
  data: Record<string, unknown>;
};

export type EnqueueResult = {
  eventId: string;
  enqueued: number;
};

/** Generate a stable event id surfaced to the client as `payload.id`. */
export function generateEventId(): string {
  return `evt_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/** Build the JSON envelope sent over the wire to the customer endpoint. */
export function buildEventPayload(eventId: string, eventType: string, data: Record<string, unknown>) {
  return {
    id: eventId,
    type: eventType,
    created_at: new Date().toISOString(),
    data,
  };
}

export async function enqueueWebhookDelivery(input: EnqueueInput): Promise<EnqueueResult> {
  const eventId = generateEventId();

  const endpoints = await prisma.isaakWebhookEndpoint.findMany({
    where: {
      tenantId: input.tenantId,
      active: true,
      events: { has: input.eventType },
    },
    select: { id: true },
  });

  if (endpoints.length === 0) {
    return { eventId, enqueued: 0 };
  }

  const payload = buildEventPayload(eventId, input.eventType, input.data);
  const now = new Date();

  // createMany doesn't support Json typing in some Prisma builds; we batch
  // with Promise.all of single creates so each row gets a fresh defaulted id.
  await Promise.all(
    endpoints.map((ep) =>
      prisma.isaakWebhookDelivery.create({
        data: {
          tenantId: input.tenantId,
          endpointId: ep.id,
          eventType: input.eventType,
          eventId,
          payload: payload as never,
          status: 'pending',
          attempts: 0,
          nextAttemptAt: now,
        },
      })
    )
  );

  return { eventId, enqueued: endpoints.length };
}
