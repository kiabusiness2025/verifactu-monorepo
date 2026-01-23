import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@verifactu/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    
    // Still log the failed webhook
    await prisma.webhookEvent.create({
      data: {
        provider: 'STRIPE',
        eventType: 'unknown',
        payload: { error: err.message },
        signatureOk: false,
        status: 'FAILED',
        lastError: err.message
      }
    });

    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Check for duplicate by externalId (idempotency)
  const existing = await prisma.webhookEvent.findFirst({
    where: { externalId: event.id, provider: 'STRIPE' }
  });

  if (existing) {
    console.log('Duplicate Stripe webhook, ignoring:', event.id);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Create webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'STRIPE',
      externalId: event.id,
      eventType: event.type,
      payload: event as any,
      signatureOk: true,
      status: 'RECEIVED'
    }
  });

  // Create first attempt
  const attempt = await prisma.webhookAttempt.create({
    data: {
      webhookEventId: webhookEvent.id,
      attemptNumber: 1,
      startedAt: new Date()
    }
  });

  // Process webhook
  try {
    await processStripeWebhook(event);
    
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'PROCESSED', processedAt: new Date() }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: true, finishedAt: new Date() }
      })
    ]);

    console.log('Stripe webhook processed:', event.type);
  } catch (error: any) {
    console.error('Stripe webhook processing failed:', error.message);
    
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'FAILED', lastError: error.message }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: false, error: error.message, finishedAt: new Date() }
      })
    ]);
  }

  return NextResponse.json({ received: true });
}

async function processStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription event:', subscription.id, subscription.status);
      // TODO: Update subscription in database
      break;

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice event:', invoice.id, invoice.status);
      // TODO: Handle invoice payment
      break;

    default:
      console.log('Unhandled Stripe event:', event.type);
  }
}
