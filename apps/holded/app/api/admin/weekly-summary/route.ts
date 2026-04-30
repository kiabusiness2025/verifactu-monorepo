import { sendHoldedWeeklySummaryAdminEmail } from '@/app/lib/communications/holded-email-service';
import { prisma } from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

function countDistinctTenants(rows: Array<{ tenantId: string }>) {
  return new Set(rows.map((row) => row.tenantId)).size;
}

function countDistinctTenantsByChannel(
  rows: Array<{ tenantId: string; channelKey: string | null }>,
  channel: 'chatgpt' | 'claude' | 'dashboard'
) {
  return new Set(rows.filter((row) => row.channelKey === channel).map((row) => row.tenantId)).size;
}

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

  const [newConnectionRows, disconnectionRows, totalActiveRows] = await Promise.all([
    prisma.externalConnection.findMany({
      where: {
        provider: 'holded',
        connectionStatus: 'connected',
        connectedAt: { gte: weekStart },
      },
      select: { tenantId: true, channelKey: true },
    }),
    prisma.externalConnection.findMany({
      where: {
        provider: 'holded',
        connectionStatus: 'disconnected',
        disconnectedAt: { gte: weekStart },
      },
      select: { tenantId: true },
    }),
    prisma.externalConnection.findMany({
      where: { provider: 'holded', connectionStatus: 'connected' },
      select: { tenantId: true },
    }),
  ]);

  const newConnections = countDistinctTenants(newConnectionRows);
  const disconnections = countDistinctTenants(disconnectionRows);
  const totalActive = countDistinctTenants(totalActiveRows);
  const newConnectionsByChannel = {
    chatgpt: countDistinctTenantsByChannel(newConnectionRows, 'chatgpt'),
    claude: countDistinctTenantsByChannel(newConnectionRows, 'claude'),
    dashboard: countDistinctTenantsByChannel(newConnectionRows, 'dashboard'),
  };

  const label = weekLabel(weekStart, now);

  const emailResult = await sendHoldedWeeklySummaryAdminEmail({
    weekLabel: label,
    newConnections,
    newConnectionsByChannel,
    disconnections,
    totalActive,
  });

  return NextResponse.json({
    ok: emailResult.success,
    weekLabel: label,
    newConnections,
    newConnectionsByChannel,
    disconnections,
    totalActive,
    recipients: emailResult.recipients,
    messageId: emailResult.messageId,
    error: emailResult.error,
  });
}
