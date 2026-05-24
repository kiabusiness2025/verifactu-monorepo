import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/whatsapp/history — recent WhatsApp events for this tenant */
export async function GET() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [thread, events, profile] = await Promise.all([
    prisma.whatsAppThread.findFirst({
      where: { tenantId: session.tenantId, status: { not: 'opted_out' } },
      orderBy: { lastMessageAt: 'desc' },
      select: { id: true, phoneNumber: true, status: true, lastMessageAt: true, language: true },
    }),
    prisma.whatsAppEvent.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      select: {
        id: true,
        direction: true,
        eventType: true,
        body: true,
        occurredAt: true,
      },
    }),
    prisma.tenantProfile.findUnique({
      where: { tenantId: session.tenantId },
      select: { phone: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    thread: thread
      ? {
          phoneNumber: thread.phoneNumber,
          status: thread.status,
          lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
          language: thread.language,
        }
      : null,
    events: events.map((e) => ({
      id: e.id,
      direction: e.direction,
      eventType: e.eventType,
      body: e.body,
      occurredAt: e.occurredAt.toISOString(),
    })),
    profilePhone: profile?.phone ?? null,
    isaakPhone: process.env.WHATSAPP_DISPLAY_PHONE ?? null,
  });
}
