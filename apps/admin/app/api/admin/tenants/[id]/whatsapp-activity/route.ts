import { NextRequest, NextResponse } from 'next/server';
import { requireAdminContext } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminContext(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const { id: tenantId } = await params;

  const [threads, msgStats, last30Stats] = await Promise.all([
    // All threads for this tenant
    prisma.whatsAppThread.findMany({
      where: { tenantId },
      select: { id: true, phoneNumber: true, status: true, lastMessageAt: true, createdAt: true },
      orderBy: { lastMessageAt: 'desc' },
    }),

    // Total message counts by direction
    prisma.whatsAppEvent.groupBy({
      by: ['direction'],
      where: { tenantId },
      _count: { id: true },
    }),

    // Messages in last 30 days
    prisma.whatsAppEvent.count({
      where: {
        tenantId,
        occurredAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) },
      },
    }),
  ]);

  const inbound = msgStats.find((r) => r.direction === 'inbound')?._count.id ?? 0;
  const outbound = msgStats.find((r) => r.direction === 'outbound')?._count.id ?? 0;

  const activeThreads = threads.filter((t) => t.status === 'open');
  const optedOutThreads = threads.filter((t) => t.status === 'opted_out');
  const lastActivity =
    threads.reduce<Date | null>((acc, t) => {
      if (!t.lastMessageAt) return acc;
      return !acc || t.lastMessageAt > acc ? t.lastMessageAt : acc;
    }, null) ?? null;

  return NextResponse.json({
    threads: {
      total: threads.length,
      active: activeThreads.length,
      opted_out: optedOutThreads.length,
      phone_numbers: [...new Set(threads.map((t) => t.phoneNumber))],
    },
    messages: {
      total: inbound + outbound,
      inbound,
      outbound,
      last_30_days: last30Stats,
    },
    last_activity: lastActivity,
  });
}
