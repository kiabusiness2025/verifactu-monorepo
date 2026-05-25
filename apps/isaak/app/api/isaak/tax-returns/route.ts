// F11 fase 4 — REST endpoint para IsaakTaxReturn.
//
// POST /api/isaak/tax-returns
//   body: { model, period, status?, amountDeclared, ... }
//   → { id, isNew }
//
// GET /api/isaak/tax-returns?model=303&fiscalYear=2026&status=presented
//   → { taxReturns: [...] }
//
// DELETE /api/isaak/tax-returns?id=<uuid>
//   → { deleted: 0|1 }
//
// tenantId desde sesión, nunca del body.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  TAX_RETURN_MODELS,
  TAX_RETURN_STATUSES,
  deleteTaxReturn,
  listTaxReturns,
  upsertTaxReturn,
  type TaxReturnModel,
  type TaxReturnStatus,
} from '@/app/lib/isaak-tax-returns';

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

const MODELS_SET = new Set<string>(TAX_RETURN_MODELS);
const STATUSES_SET = new Set<string>(TAX_RETURN_STATUSES);

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const result = await upsertTaxReturn({
      tenantId: session.tenantId,
      model: body.model as TaxReturnModel,
      period: String(body.period ?? ''),
      status: body.status as TaxReturnStatus | undefined,
      amountDeclared: String(body.amountDeclared ?? ''),
      amountToPay: (body.amountToPay as string | null | undefined) ?? null,
      amountToRefund: (body.amountToRefund as string | null | undefined) ?? null,
      presentedAt: (body.presentedAt as string | null | undefined) ?? null,
      dueDate: (body.dueDate as string | null | undefined) ?? null,
      referenceNumber: (body.referenceNumber as string | null | undefined) ?? null,
      attachmentUrl: (body.attachmentUrl as string | null | undefined) ?? null,
      notes: (body.notes as string | null | undefined) ?? null,
      createdBy: session.userId ?? 'unknown',
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_input', message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const fiscalYearParam = url.searchParams.get('fiscalYear');
  const model = url.searchParams.get('model');
  const status = url.searchParams.get('status');

  if (model && !MODELS_SET.has(model)) {
    return NextResponse.json(
      { error: 'invalid_model', allowed: [...TAX_RETURN_MODELS] },
      { status: 400 }
    );
  }
  if (status && !STATUSES_SET.has(status)) {
    return NextResponse.json(
      { error: 'invalid_status', allowed: [...TAX_RETURN_STATUSES] },
      { status: 400 }
    );
  }
  const fiscalYear =
    fiscalYearParam !== null && /^\d{4}$/.test(fiscalYearParam)
      ? Number.parseInt(fiscalYearParam, 10)
      : undefined;

  try {
    const taxReturns = await listTaxReturns({
      tenantId: session.tenantId,
      fiscalYear,
      model: (model as TaxReturnModel) ?? undefined,
      status: (status as TaxReturnStatus) ?? undefined,
    });
    return NextResponse.json({ taxReturns });
  } catch (err) {
    return NextResponse.json(
      { error: 'list_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }
  const result = await deleteTaxReturn({ tenantId: session.tenantId, id });
  return NextResponse.json(result);
}
