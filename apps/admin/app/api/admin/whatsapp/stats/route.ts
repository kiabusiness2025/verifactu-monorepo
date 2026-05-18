import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const since30d = new Date(Date.now() - 30 * 86400 * 1000);

  const [totalThreads, openThreads, humanThreads, msgStats, msgLast30] = await Promise.all([
    prisma.whatsAppThread.count(),
    prisma.whatsAppThread.count({ where: { status: 'open' } }),
    prisma.whatsAppThread.count({ where: { mode: 'human' } }),
    prisma.whatsAppEvent.groupBy({
      by: ['direction'],
      _count: { id: true },
    }),
    prisma.whatsAppEvent.count({ where: { occurredAt: { gte: since30d } } }),
  ]);

  const inbound = msgStats.find((r) => r.direction === 'inbound')?._count.id ?? 0;
  const outbound = msgStats.find((r) => r.direction === 'outbound')?._count.id ?? 0;

  return NextResponse.json({
    threads: { total: totalThreads, open: openThreads, human: humanThreads },
    messages: { total: inbound + outbound, inbound, outbound, last_30_days: msgLast30 },
  });
}
