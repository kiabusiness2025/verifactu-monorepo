import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';
import { sendWeeklyDigest } from '@/app/lib/communications/weekly-digest-email';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
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

      await sendWeeklyDigest({
        userEmail: recipientEmail,
        userName,
        tenantName: tenant.name,
        conversationsThisWeek,
        alertsThisWeek,
        upcomingDeadlines: upcoming,
      });

      sent++;
    } catch (err) {
      console.error('[weekly-digest] error', { tenantId: tenant.id, err });
      errors++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}
