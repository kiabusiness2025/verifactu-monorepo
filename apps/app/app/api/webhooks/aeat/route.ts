import { NextRequest, NextResponse } from 'next/server';
import { Prisma, prisma } from '@verifactu/db';
import { z } from 'zod';

const aeatWebhookSchema = z
  .object({
    id: z.string().optional(),
    reference: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export async function POST(req: NextRequest) {
  const payload: unknown = await req.json();
  const body = aeatWebhookSchema.parse(payload);

  console.log('AEAT webhook received:', body);

  // TODO: Implement AEAT signature verification when available
  
  // Create webhook event
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: 'AEAT',
      externalId: body.id || body.reference,
      eventType: body.type || 'aeat_event',
      payload: body as Prisma.InputJsonValue,
      signatureOk: true, // TODO: Verify when AEAT provides signature
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
    await processAEATWebhook(body);
    
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

    console.log('AEAT webhook processed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AEAT webhook processing error';
    console.error('AEAT webhook processing failed:', message);
    
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'FAILED', lastError: message }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: false, error: message, finishedAt: new Date() }
      })
    ]);
  }

  return NextResponse.json({ received: true });
}

async function processAEATWebhook(body: unknown) {
  // TODO: Implement AEAT webhook processing logic
  console.log('Processing AEAT webhook:', body);
  
  // Example: Update invoice status, store certificate, etc.
}
