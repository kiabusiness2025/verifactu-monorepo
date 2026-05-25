/**
 * GET /api/cron/aeat-weekly-summary
 *
 * Cron semanal (lunes 08:00 UTC) que genera un resumen IA del buzón AEAT
 * de la última semana por tenant y lo envía por email.
 *
 * Solo se ejecuta para tenants con cert digital activo y >=1 notificación
 * o cambio censal en la ventana.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { generateWeeklySummary } from '@/app/lib/aeat-weekly-summary';
import { createAlert } from '@/app/lib/isaak-alert-service';

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

  const now = new Date();
  const certs = await prisma.tenantCertificate.findMany({
    where: { validTo: { gt: now } },
    select: { tenantId: true },
    distinct: ['tenantId'],
  });

  const summary = {
    tenantsScanned: certs.length,
    summariesGenerated: 0,
    emailsSent: 0,
    skipped: 0,
    errors: [] as Array<{ tenantId: string; reason: string }>,
  };

  for (const { tenantId } of certs) {
    try {
      const result = await generateWeeklySummary({ tenantId, windowDays: 7, now });
      if (!result.generated || !result.summary) {
        summary.skipped++;
        continue;
      }
      summary.summariesGenerated++;
      try {
        await createAlert({
          tenantId,
          type: 'aeat_weekly_summary',
          title: 'Resumen semanal AEAT',
          body: result.summary,
          channel: 'email',
          metadata: {
            notificationsConsidered: result.notificationsConsidered,
            censusChangesConsidered: result.censusChangesConsidered,
            windowDays: 7,
          },
        });
        summary.emailsSent++;
      } catch (err) {
        summary.errors.push({
          tenantId,
          reason: `email: ${err instanceof Error ? err.message : String(err)}`,
        });
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
