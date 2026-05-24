/**
 * Cron: daily onboarding nudge sequence
 * Schedule: 0 10 * * * (10:00 UTC = 12:00 Madrid)
 *
 * Sends one email per tenant per step — deduped via IsaakOnboardingEmail unique(tenantId, emailType):
 *   connect_erp  — D+1..3:  tenant has no Holded connection
 *   first_steps  — D+3..6:  tenant has < 3 conversations
 *   upgrade_cta  — D+7..14: Free plan, has had conversations
 */
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  sendConnectErpNudge,
  sendFirstStepsNudge,
  sendUpgradeCtaNudge,
} from '@/app/lib/communications/onboarding-emails';

export const runtime = 'nodejs';
export const maxDuration = 120;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

async function getOwner(tenantId: string) {
  const membership = await prisma.membership.findFirst({
    where: { tenantId, role: 'owner', status: 'active' },
    include: { user: { select: { email: true, name: true } } },
  });
  return membership?.user ?? null;
}

async function alreadySent(tenantId: string, emailType: string): Promise<boolean> {
  const existing = await prisma.isaakOnboardingEmail.findUnique({
    where: { tenantId_emailType: { tenantId, emailType } },
  });
  return !!existing;
}

async function markSent(tenantId: string, emailType: string) {
  await prisma.isaakOnboardingEmail
    .create({ data: { tenantId, emailType } })
    .catch(() => undefined); // ignore duplicate on race
}

// ─── Step handlers ────────────────────────────────────────────────────────────

async function runConnectErp(): Promise<number> {
  // Tenants created 1-3 days ago with no Holded/ERP external connection
  const tenants = await prisma.tenant.findMany({
    where: {
      createdAt: { gte: daysAgo(3), lte: daysAgo(1) },
      isDemo: false,
      externalConnections: { none: {} },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const { id: tenantId } of tenants) {
    if (await alreadySent(tenantId, 'connect_erp')) continue;
    const owner = await getOwner(tenantId);
    if (!owner?.email) continue;

    try {
      await sendConnectErpNudge({ userEmail: owner.email, userName: owner.name });
      await markSent(tenantId, 'connect_erp');
      sent++;
    } catch (err) {
      console.error('[onboarding-nudge] connect_erp error', { tenantId, err });
    }
  }
  return sent;
}

async function runFirstSteps(): Promise<number> {
  // Tenants created 3-6 days ago with fewer than 3 conversations
  const tenants = await prisma.tenant.findMany({
    where: {
      createdAt: { gte: daysAgo(6), lte: daysAgo(3) },
      isDemo: false,
    },
    select: {
      id: true,
      _count: { select: { isaakConversations: true } },
    },
  });

  let sent = 0;
  for (const tenant of tenants) {
    if (tenant._count.isaakConversations >= 3) continue;
    if (await alreadySent(tenant.id, 'first_steps')) continue;
    const owner = await getOwner(tenant.id);
    if (!owner?.email) continue;

    try {
      await sendFirstStepsNudge({ userEmail: owner.email, userName: owner.name });
      await markSent(tenant.id, 'first_steps');
      sent++;
    } catch (err) {
      console.error('[onboarding-nudge] first_steps error', { tenantId: tenant.id, err });
    }
  }
  return sent;
}

async function runUpgradeCta(): Promise<number> {
  // Free-plan tenants created 7-14 days ago with at least 1 conversation
  const tenants = await prisma.tenant.findMany({
    where: {
      createdAt: { gte: daysAgo(14), lte: daysAgo(7) },
      isDemo: false,
      tenantSubscriptions: {
        some: {
          status: 'active',
          plan: { code: 'free' },
        },
      },
    },
    select: {
      id: true,
      _count: { select: { isaakConversations: true } },
      tenantSubscriptions: {
        where: { status: 'active' },
        select: { queriesUsedToday: true },
        take: 1,
      },
    },
  });

  let sent = 0;
  for (const tenant of tenants) {
    if (tenant._count.isaakConversations < 1) continue;
    if (await alreadySent(tenant.id, 'upgrade_cta')) continue;
    const owner = await getOwner(tenant.id);
    if (!owner?.email) continue;

    const queriesUsed = tenant.tenantSubscriptions[0]?.queriesUsedToday ?? 0;
    try {
      await sendUpgradeCtaNudge({
        userEmail: owner.email,
        userName: owner.name,
        queriesUsed,
      });
      await markSent(tenant.id, 'upgrade_cta');
      sent++;
    } catch (err) {
      console.error('[onboarding-nudge] upgrade_cta error', { tenantId: tenant.id, err });
    }
  }
  return sent;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [connectErp, firstSteps, upgradeCta] = await Promise.all([
    runConnectErp(),
    runFirstSteps(),
    runUpgradeCta(),
  ]);

  return NextResponse.json({ ok: true, sent: { connectErp, firstSteps, upgradeCta } });
}
