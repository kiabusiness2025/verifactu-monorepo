import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { getUpcomingDeadlines } from '@/app/lib/fiscal-calendar';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [alerts, rawDeadlines] = await Promise.all([
    prisma.isaakAlert.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        dueDate: true,
        channel: true,
        status: true,
        sentAt: true,
        createdAt: true,
        metadata: true,
      },
    }),
    Promise.resolve(getUpcomingDeadlines(120)),
  ]);

  const deadlines = rawDeadlines.slice(0, 8).map((d) => ({
    id: d.id,
    title: d.title,
    modelo: d.modelo,
    date: d.date.toISOString(),
    daysUntil: Math.max(0, Math.ceil((d.date.getTime() - Date.now()) / 86_400_000)),
    category: d.category,
    description: d.description,
  }));

  return NextResponse.json({
    deadlines,
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      body: a.body,
      dueDate: a.dueDate?.toISOString() ?? null,
      channel: a.channel,
      status: a.status,
      sentAt: a.sentAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      daysLeft:
        a.metadata && typeof a.metadata === 'object' && 'daysLeft' in a.metadata
          ? (a.metadata as Record<string, unknown>).daysLeft
          : null,
    })),
  });
}
