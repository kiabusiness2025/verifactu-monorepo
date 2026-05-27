/**
 * GET /api/cron/audit-monthly
 *
 * Runs the Inspector AEAT audit over the previous month for every tenant
 * with at least one Isaak Ledger entry. For each tenant:
 *   * Builds AuditLedgerSnapshot (loader)
 *   * Runs runAudit(snapshot)
 *   * If errors > 0 → creates an isaakAlert ('audit_errors') deduplicated
 *     by (tenantId, period) to avoid daily noise if the cron retries.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}
 *
 * Schedule (vercel.json): first day of each month at 03:00 UTC.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { loadAuditInputsForTenant } from '@/app/lib/isaak-audit-loader';
import { runAudit } from '@/app/lib/inspector-aeat-audit';
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

function previousMonthRange(now: Date): { periodFrom: string; periodTo: string; label: string } {
  // First day of previous month → last day of previous month, both UTC.
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0..11; previous month = m-1 (con rollover)
  const firstPrev = new Date(Date.UTC(y, m - 1, 1));
  const lastPrev = new Date(Date.UTC(y, m, 0)); // day 0 of current month = last day of previous
  return {
    periodFrom: firstPrev.toISOString().slice(0, 10),
    periodTo: lastPrev.toISOString().slice(0, 10),
    label: `${firstPrev.getUTCFullYear()}-${String(firstPrev.getUTCMonth() + 1).padStart(2, '0')}`,
  };
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const { periodFrom, periodTo, label } = previousMonthRange(now);

  // Tenants with at least one ledger entry in the period.
  const rows = await prisma.$queryRawUnsafe<Array<{ tenantId: string }>>(
    `SELECT DISTINCT tenant_id AS "tenantId"
     FROM isaak_ledger_entries
     WHERE entry_date >= $1::date AND entry_date <= $2::date`,
    periodFrom,
    periodTo
  );

  const summary = {
    period: label,
    tenantsScanned: rows.length,
    tenantsWithErrors: 0,
    tenantsWithWarnings: 0,
    tenantsSkipped: 0,
    alertsCreated: 0,
    errors: [] as Array<{ tenantId: string; reason: string }>,
  };

  for (const { tenantId } of rows) {
    try {
      const { snapshot, profile } = await loadAuditInputsForTenant({
        tenantId,
        periodFrom,
        periodTo,
      });
      const report = runAudit({ scope: 'monthly_close', snapshot, profile });

      if (report.errors.length > 0) summary.tenantsWithErrors++;
      if (report.warnings.length > 0) summary.tenantsWithWarnings++;

      // Notify only on errors. Warnings/infos quedan en métricas internas.
      if (report.errors.length === 0) continue;

      // Dedupe: una alerta por (tenant, period). Si ya existe del mes
      // anterior, no creamos otra (puede haber retries del cron).
      const existing = await prisma.isaakAlert.findFirst({
        where: {
          tenantId,
          type: 'audit_errors',
          metadata: { path: ['period'], equals: label },
        },
      });
      if (existing) continue;

      const top = report.errors.slice(0, 5).map((e) => `• ${e.ruleId} ${e.message} (${e.citation})`).join('\n');
      const body = [
        `El Inspector AEAT ha detectado ${report.errors.length} errores en tu contabilidad del mes ${label}.`,
        '',
        'Resumen de los más relevantes:',
        top,
        '',
        report.errors.length > 5
          ? `Y ${report.errors.length - 5} más. Entra en Isaak para verlos todos.`
          : '',
      ].filter(Boolean).join('\n');

      await createAlert({
        tenantId,
        type: 'audit_errors',
        title: `Inspector AEAT: ${report.errors.length} errores en ${label}`,
        body,
        channel: 'email',
        metadata: {
          period: label,
          periodFrom,
          periodTo,
          errorCount: report.errors.length,
          warningCount: report.warnings.length,
        },
      });
      summary.alertsCreated++;
    } catch (err) {
      summary.tenantsSkipped++;
      summary.errors.push({
        tenantId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(summary);
}
