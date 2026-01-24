import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireAdminSession();

  const webhook = await prisma.webhookEvent.findUnique({
    where: { id: params.id },
    include: { attempts: true }
  });

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const attemptNumber = webhook.attempts.length + 1;
  if (attemptNumber > 5) {
    return NextResponse.json({ error: 'Max retries reached (5)' }, { status: 400 });
  }

  // Update status to processing
  await prisma.webhookEvent.update({
    where: { id: params.id },
    data: { status: 'PROCESSING' }
  });

  // Create new attempt
  const attempt = await prisma.webhookAttempt.create({
    data: {
      webhookEventId: webhook.id,
      attemptNumber,
      startedAt: new Date()
    }
  });

  try {
    // TODO: Call actual webhook processor based on provider
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));

    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhook.id },
        data: { status: 'PROCESSED', processedAt: new Date(), lastError: null }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: true, finishedAt: new Date() }
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: session.userId!,
          action: 'WEBHOOK_RETRY',
          targetUserId: webhook.userId || undefined,
          metadata: { webhookId: webhook.id, provider: webhook.provider, attemptNumber }
        }
      })
    ]);

    return NextResponse.json({ success: true, attemptNumber });
  } catch (error: any) {
    await prisma.$transaction([
      prisma.webhookEvent.update({
        where: { id: webhook.id },
        data: { status: 'FAILED', lastError: error.message }
      }),
      prisma.webhookAttempt.update({
        where: { id: attempt.id },
        data: { ok: false, error: error.message, finishedAt: new Date() }
      })
    ]);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
