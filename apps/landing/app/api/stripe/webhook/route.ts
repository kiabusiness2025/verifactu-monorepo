import { prisma, SubscriptionStatus } from '@verifactu/db';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const devProcessedWebhookEvents = new Set<string>();

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /can't reach database server|prismaclientinitializationerror/i.test(error.message);
}

async function withDevDatabaseFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && isDatabaseUnavailable(error)) {
      console.warn('[stripe-webhook] Database unavailable in development, using fallback mode');
      return await fallback();
    }
    throw error;
  }
}

function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return SubscriptionStatus.TRIAL;
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.PAST_DUE;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.NONE;
  }
}

function fromUnix(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

async function findUserIdByHint(input: {
  uidHint?: string | null;
  emailHint?: string | null;
}): Promise<string | null> {
  if (input.uidHint) {
    const uidHint = input.uidHint;
    const user = await withDevDatabaseFallback(
      () =>
        prisma.user.findUnique({
          where: { id: uidHint },
          select: { id: true },
        }),
      () => null
    );
    if (user?.id) return user.id;
  }

  if (input.emailHint) {
    const emailHint = input.emailHint;
    const user = await withDevDatabaseFallback(
      () =>
        prisma.user.findUnique({
          where: { email: emailHint },
          select: { id: true },
        }),
      () => null
    );
    if (user?.id) return user.id;
  }

  return null;
}

async function upsertSubscriptionRecord(input: {
  userId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}) {
  const existing = await withDevDatabaseFallback(
    () =>
      prisma.subscription.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: input.stripeSubscriptionId },
            input.stripeCustomerId ? { stripeCustomerId: input.stripeCustomerId } : undefined,
          ].filter(Boolean) as any,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    () => null
  );

  const data = {
    userId: input.userId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    stripePriceId: input.stripePriceId,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  };

  if (existing) {
    return withDevDatabaseFallback(
      () => prisma.subscription.update({ where: { id: existing.id }, data }),
      () => existing
    );
  }

  return withDevDatabaseFallback(() => prisma.subscription.create({ data }), () => ({ id: 'dev-subscription' }));
}

async function findExistingWebhookEvent(externalId: string) {
  return withDevDatabaseFallback(
    () =>
      prisma.webhookEvent.findFirst({
        where: { provider: 'STRIPE', externalId },
        select: { id: true },
      }),
    () => (devProcessedWebhookEvents.has(externalId) ? { id: externalId } : null)
  );
}

async function createWebhookEventRecord(event: Stripe.Event) {
  return withDevDatabaseFallback(
    () =>
      prisma.webhookEvent.create({
        data: {
          provider: 'STRIPE',
          externalId: event.id,
          eventType: event.type,
          payload: event as any,
          signatureOk: true,
          status: 'RECEIVED',
        },
      }),
    () => {
      devProcessedWebhookEvents.add(event.id);
      return { id: event.id };
    }
  );
}

async function createWebhookAttemptRecord(webhookEventId: string) {
  return withDevDatabaseFallback(
    () =>
      prisma.webhookAttempt.create({
        data: {
          webhookEventId,
          attemptNumber: 1,
          startedAt: new Date(),
        },
      }),
    () => ({ id: `dev-attempt:${webhookEventId}` })
  );
}

async function markWebhookProcessed(webhookEventId: string, attemptId: string, eventId: string) {
  await withDevDatabaseFallback<void>(
    async () => {
      await prisma.$transaction([
        prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        }),
        prisma.webhookAttempt.update({
          where: { id: attemptId },
          data: { ok: true, finishedAt: new Date() },
        }),
      ]);
    },
    () => {
      devProcessedWebhookEvents.add(eventId);
    }
  );
}

async function markWebhookFailed(webhookEventId: string, attemptId: string, errorMessage: string) {
  await withDevDatabaseFallback<void>(
    async () => {
      await prisma.$transaction([
        prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'FAILED', lastError: errorMessage },
        }),
        prisma.webhookAttempt.update({
          where: { id: attemptId },
          data: {
            ok: false,
            error: errorMessage,
            finishedAt: new Date(),
          },
        }),
      ]);
    },
    () => undefined
  );
}

async function processStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

export async function POST(req: Request) {
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (err: any) {
    await withDevDatabaseFallback(
      () =>
        prisma.webhookEvent.create({
          data: {
            provider: 'STRIPE',
            eventType: 'unknown',
            payload: { error: String(err?.message || 'invalid signature') },
            signatureOk: false,
            status: 'FAILED',
            lastError: String(err?.message || 'Invalid signature'),
          },
        }),
      () => null
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const existing = await findExistingWebhookEvent(event.id);

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const webhookEvent = await createWebhookEventRecord(event);
  const attempt = await createWebhookAttemptRecord(webhookEvent.id);

  try {
    await processStripeWebhook(event);
    await markWebhookProcessed(webhookEvent.id, attempt.id, event.id);
  } catch (error: any) {
    await markWebhookFailed(
      webhookEvent.id,
      attempt.id,
      String(error?.message || 'processing failed')
    );
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null;
  const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null;
  const uidHint = session.metadata?.uid || session.client_reference_id || null;
  const emailHint = session.customer_details?.email || session.customer_email || null;
  const userId = await findUserIdByHint({ uidHint, emailHint });

  if (!stripeSubscriptionId) {
    return;
  }

  await upsertSubscriptionRecord({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: null,
    status: SubscriptionStatus.TRIAL,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  const stripePriceId = subscription.items.data[0]?.price?.id ?? null;
  const uidHint = subscription.metadata?.uid ?? null;
  const userId = await findUserIdByHint({ uidHint });

  await upsertSubscriptionRecord({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    status: toSubscriptionStatus(subscription.status),
    currentPeriodEnd: fromUnix(subscription.current_period_end),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await withDevDatabaseFallback(
    () =>
      prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: fromUnix(subscription.ended_at),
        },
      }),
    () => ({ count: 0 })
  );
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : null;
  if (!stripeSubscriptionId) return;

  await withDevDatabaseFallback(
    () =>
      prisma.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
        },
      }),
    () => ({ count: 0 })
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : null;
  if (!stripeSubscriptionId) return;

  await withDevDatabaseFallback(
    () =>
      prisma.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      }),
    () => ({ count: 0 })
  );
}
