import { requireTenantContext } from '@/lib/api/tenantAuth';
import { runTenantReconciliationAutoMatch } from '@/lib/banking/reconciliationAutomation';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    from?: string;
    to?: string;
    accountId?: string;
    limit?: number;
    dryRun?: boolean;
  };

  const parsedLimit = Number(body.limit ?? 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;
  const run = await runTenantReconciliationAutoMatch({
    tenantId: auth.tenantId,
    from: body.from,
    to: body.to,
    accountId: body.accountId,
    limit,
    dryRun: body.dryRun,
    persistSuggestions: true,
  });

  return NextResponse.json({
    ok: true,
    tenantId: run.tenantId,
    dryRun: run.dryRun,
    config: run.config,
    summary: run.summary,
    results: run.results,
  });
}
