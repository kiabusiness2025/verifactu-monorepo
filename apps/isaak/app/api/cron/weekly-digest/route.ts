import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';
import { sendWeeklyDigest } from '@/app/lib/communications/weekly-digest-email';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { fetchHoldedSnapshot } from '@/app/lib/holded-integration';
import { buildRangeSummary } from '@/app/lib/holded-analytics';
import { holdedListTreasuryAccounts } from '@/app/lib/holded-api';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 86_400_000);

  // Upcoming deadlines in the next 14 days
  const in14Days = new Date(now.getTime() + 14 * 86_400_000);
  const year = now.getFullYear();
  const allDeadlines = [
    ...getFiscalDeadlines(year),
    ...getFiscalDeadlines(year + 1).filter((d) => d.date <= in14Days),
  ];
  const upcoming = allDeadlines
    .filter((d) => d.date >= now && d.date <= in14Days)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const tenants = await prisma.tenant.findMany({
    where: { tenantSubscriptions: { some: { status: { in: ['trial', 'active'] } } } },
    include: {
      users: {
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: { user: { select: { email: true, firstName: true, name: true } } },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    const membership = tenant.users[0];
    const recipientEmail = membership?.user?.email;
    if (!recipientEmail) {
      skipped++;
      continue;
    }

    try {
      const [conversationsThisWeek, alertsThisWeek] = await Promise.all([
        prisma.isaakConversation.count({
          where: { tenantId: tenant.id, createdAt: { gte: weekStart } },
        }),
        prisma.isaakAlert.count({
          where: { tenantId: tenant.id, createdAt: { gte: weekStart }, status: 'sent' },
        }),
      ]);

      const userName = membership.user?.firstName || membership.user?.name?.split(' ')[0] || null;

      // Enrich with Holded financial data if connected
      let pnl: { sales: number; expenses: number | null; margin: number | null } | null = null;
      let bankBalance: number | null = null;
      try {
        const connection = await getHoldedConnection(tenant.id);
        if (connection?.apiKey) {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const [snapshot, accounts] = await Promise.allSettled([
            fetchHoldedSnapshot(connection.apiKey),
            holdedListTreasuryAccounts(connection.apiKey),
          ]);
          if (snapshot.status === 'fulfilled' && snapshot.value) {
            const range = buildRangeSummary(snapshot.value, monthStart, monthEnd);
            if (range.sales > 0 || range.expenseSignals > 0) {
              pnl = { sales: range.sales, expenses: range.expenses, margin: range.margin };
            }
          }
          if (accounts.status === 'fulfilled' && Array.isArray(accounts.value)) {
            const total = accounts.value.reduce((sum: number, acc: Record<string, unknown>) => {
              const bal =
                typeof acc.balance === 'number'
                  ? acc.balance
                  : typeof acc.amount === 'number'
                    ? acc.amount
                    : 0;
              return sum + bal;
            }, 0);
            if (total !== 0) bankBalance = total;
          }
        }
      } catch {
        // Non-critical: digest still sends without financial data
      }

      await sendWeeklyDigest({
        userEmail: recipientEmail,
        userName,
        tenantName: tenant.name,
        conversationsThisWeek,
        alertsThisWeek,
        upcomingDeadlines: upcoming,
        pnl,
        bankBalance,
      });

      sent++;
    } catch (err) {
      console.error('[weekly-digest] error', { tenantId: tenant.id, err });
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
