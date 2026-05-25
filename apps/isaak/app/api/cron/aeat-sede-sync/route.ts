/**
 * GET /api/cron/aeat-sede-sync
 *
 * Cron diario que sincroniza la sede AEAT de cada tenant con cert digital
 * cargado. Por cada tenant:
 *   * Pull de notificaciones DEH → persistencia con dedupe por externalId
 *   * Pull del censo 036/037 → snapshot si cambia + diff vs anterior
 *   * Alertas in-app/email cuando hay notificaciones críticas o cambios
 *     censales
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * Schedule (vercel.json): diario a 06:00 UTC (antes del fiscal-alerts cron).
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { syncAeatSedeForTenant } from '@/app/lib/aeat-sede-sync';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Tenants con al menos un cert digital vigente (no expirado).
  const now = new Date();
  const certs = await prisma.tenantCertificate.findMany({
    where: { validTo: { gt: now } },
    select: { tenantId: true },
    distinct: ['tenantId'],
  });

  const summary = {
    tenantsScanned: certs.length,
    notifications: {
      totalPulled: 0,
      totalNew: 0,
      criticalCount: 0,
      alertsCreated: 0,
      justificantesLinked: 0,
    },
    census: {
      snapshotsInserted: 0,
      changesDetected: 0,
      alertsCreated: 0,
    },
    errors: [] as Array<{ tenantId: string; reason: string }>,
  };

  for (const { tenantId } of certs) {
    try {
      const r = await syncAeatSedeForTenant(tenantId);
      summary.notifications.totalPulled += r.notifications.pulled;
      summary.notifications.totalNew += r.notifications.persisted;
      summary.notifications.criticalCount += r.notifications.criticalCount;
      summary.notifications.alertsCreated += r.notifications.alertsCreated;
      summary.notifications.justificantesLinked += r.notifications.justificantesLinked;
      if (r.census.snapshotInserted) summary.census.snapshotsInserted++;
      summary.census.changesDetected += r.census.changesDetected;
      summary.census.alertsCreated += r.census.alertsCreated;
      for (const e of r.errors) {
        summary.errors.push({ tenantId, reason: e });
      }
    } catch (err) {
      summary.errors.push({
        tenantId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(summary);
}
