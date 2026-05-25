// F11 fase 3 — endpoint del Inspector AEAT (auditoría).
//
// POST /api/isaak/audit
//   { periodFrom: 'YYYY-MM-DD', periodTo: 'YYYY-MM-DD', scope?: '...' }
//   → { snapshot, report }
//
// El periodo se interpreta inclusivo en ambos extremos. tenantId se
// toma SIEMPRE de la sesión, nunca del body (aislamiento estricto).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadAuditInputsForTenant } from '@/app/lib/isaak-audit-loader';
import { runAudit } from '@/app/lib/inspector-aeat-audit';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SCOPES = new Set([
  'monthly_close',
  'quarterly_close',
  'annual_close',
  'on_demand',
]);

type Scope = 'monthly_close' | 'quarterly_close' | 'annual_close' | 'on_demand';

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { periodFrom?: string; periodTo?: string; scope?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const periodFrom = body.periodFrom ?? '';
  const periodTo = body.periodTo ?? '';
  if (!ISO_DATE_REGEX.test(periodFrom) || !ISO_DATE_REGEX.test(periodTo)) {
    return NextResponse.json(
      { error: 'invalid_period', message: 'periodFrom y periodTo deben ser YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (periodTo < periodFrom) {
    return NextResponse.json(
      { error: 'invalid_period', message: 'periodTo no puede ser anterior a periodFrom' },
      { status: 400 }
    );
  }

  const scopeRaw = body.scope ?? 'on_demand';
  if (!VALID_SCOPES.has(scopeRaw)) {
    return NextResponse.json(
      { error: 'invalid_scope', allowed: [...VALID_SCOPES] },
      { status: 400 }
    );
  }
  const scope = scopeRaw as Scope;

  try {
    const { snapshot, profile } = await loadAuditInputsForTenant({
      tenantId: session.tenantId,
      periodFrom,
      periodTo,
    });
    const report = runAudit({ scope, snapshot, profile });
    return NextResponse.json({ snapshot, profile, report });
  } catch (err) {
    console.error('[Isaak Audit] failed', err);
    return NextResponse.json(
      { error: 'audit_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
