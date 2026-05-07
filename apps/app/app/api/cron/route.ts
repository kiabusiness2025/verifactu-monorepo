import { runGlobalReconciliationReevaluation } from '@/lib/banking/reconciliationAutomation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function resolveCronSecret(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const direct = request.headers.get('x-cron-secret')?.trim() || '';
  return bearer || direct;
}

function isCronAuthorized(request: NextRequest) {
  const requiredSecret = process.env.CRON_SECRET?.trim() || '';
  if (!requiredSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const received = resolveCronSecret(request);
  return Boolean(received) && received === requiredSecret;
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runGlobalReconciliationReevaluation({
      limitPerTenant: Number(process.env.BANK_RECONCILIATION_CRON_LIMIT_PER_TENANT || 100),
      maxTenants: Number(process.env.BANK_RECONCILIATION_CRON_MAX_TENANTS || 50),
      alertDays: Number(process.env.BANK_RECONCILIATION_ALERT_DAYS || 7),
      minUnmatchedForAlert: Number(process.env.BANK_RECONCILIATION_ALERT_MIN_UNMATCHED || 5),
    });

    return NextResponse.json({
      ok: result.errors.length === 0,
      kind: 'bank_reconciliation_reevaluation',
      executedAt: new Date().toISOString(),
      summary: {
        tenantCount: result.tenantCount,
        scanned: result.scanned,
        autoMatched: result.autoMatched,
        suggestedOnly: result.suggestedOnly,
        alertsCreated: result.alertsCreated,
        errors: result.errors.length,
      },
      tenantResults: result.tenantResults,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[cron] reconciliation reevaluation failed', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Bank reconciliation cron failed',
      },
      { status: 500 }
    );
  }
}
