import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendHoldedWeeklySummaryAdminEmail } from '@/app/lib/communications/holded-email-service';

export const runtime = 'nodejs';
export const maxDuration = 30;

function weekLabel(from: Date, to: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });
  return `${fmt(from)} – ${fmt(to)}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  const [newConnectionRows, disconnectionRows, totalActive] = await Promise.all([
    prisma.externalConnection.findMany({
      where: {
        provider: 'holded',
        connectionStatus: 'connected',
        connectedAt: { gte: weekStart },
      },
      select: { channelKey: true },
    }),
    prisma.externalConnection.count({
      where: {
        provider: 'holded',
        connectionStatus: 'disconnected',
        disconnectedAt: { gte: weekStart },
      },
    }),
    prisma.externalConnection.count({
      where: { provider: 'holded', connectionStatus: 'connected' },
    }),
  ]);

  const newConnections = newConnectionRows.length;
  const newConnectionsByChannel = {
    chatgpt: newConnectionRows.filter((r) => r.channelKey === 'chatgpt').length,
    dashboard: newConnectionRows.filter((r) => r.channelKey !== 'chatgpt').length,
  };

  const label = weekLabel(weekStart, now);

  const emailResult = await sendHoldedWeeklySummaryAdminEmail({
    weekLabel: label,
    newConnections,
    newConnectionsByChannel,
    disconnections: disconnectionRows,
    totalActive,
  });

  return NextResponse.json({
    ok: emailResult.success,
    weekLabel: label,
    newConnections,
    newConnectionsByChannel,
    disconnections: disconnectionRows,
    totalActive,
    recipients: emailResult.recipients,
    messageId: emailResult.messageId,
    error: emailResult.error,
  });
}
