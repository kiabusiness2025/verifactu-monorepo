import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  createSyncOutbox,
  getSyncConflictById,
  resolveSyncConflict,
} from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { quoteFindFirst, quoteUpdateMany } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const enabled = await canBidirectionalQuotes(auth.tenantId);
  if (!enabled) {
    return NextResponse.json(
      { error: 'La resolución de conflictos de presupuestos está disponible en Empresa y PRO.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const resolution =
    body?.resolution === 'use_local' || body?.resolution === 'use_remote'
      ? body.resolution
      : null;
  if (!resolution) {
    return NextResponse.json(
      { error: 'resolution must be use_local or use_remote' },
      { status: 400 }
    );
  }

  const conflict = await getSyncConflictById(auth.tenantId, id);
  if (!conflict) return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
  if (conflict.status !== 'open') {
    return NextResponse.json({ error: 'Conflict already resolved' }, { status: 409 });
  }
  if (conflict.entity_type !== 'quote') {
    return NextResponse.json({ error: 'Unsupported entity type' }, { status: 400 });
  }

  if (resolution === 'use_local' && conflict.local_id) {
    const local = await quoteFindFirst({
      where: { id: conflict.local_id, tenantId: auth.tenantId },
      include: { customer: true },
    });
    if (local) {
      await createSyncOutbox({
        tenantId: auth.tenantId,
        entityType: 'quote',
        entityId: local.id,
        action: 'upsert',
        payload: {
          number: local.number,
          status: local.status,
          issueDate: local.issueDate,
          validUntil: local.validUntil,
          customerId: local.customerId,
          currency: local.currency,
          lines: local.lines,
          totals: local.totals,
          notes: local.notes,
        },
      });
    }
  }

  if (resolution === 'use_remote' && conflict.local_id) {
    const remote = asObject(conflict.remote_data);
    await quoteUpdateMany({
      where: { id: conflict.local_id, tenantId: auth.tenantId },
      data: {
        number: typeof remote.number === 'string' ? remote.number : undefined,
        status: typeof remote.status === 'string' ? remote.status : undefined,
        issueDate:
          typeof remote.issueDate === 'string' ? new Date(remote.issueDate) : undefined,
        validUntil:
          typeof remote.validUntil === 'string'
            ? new Date(remote.validUntil)
            : remote.validUntil === null
            ? null
            : undefined,
        customerId: typeof remote.customerId === 'string' ? remote.customerId : undefined,
        currency:
          typeof remote.currency === 'string' ? remote.currency.toUpperCase() : undefined,
        lines: remote.lines ?? undefined,
        totals: remote.totals ?? undefined,
        notes: typeof remote.notes === 'string' ? remote.notes : remote.notes === null ? null : undefined,
        source: 'remote',
      },
    });
  }

  const resolved = await resolveSyncConflict({
    tenantId: auth.tenantId,
    id,
    resolution,
    resolvedBy: auth.session.uid || 'system',
  });
  if (!resolved) return NextResponse.json({ error: 'Conflict not open' }, { status: 409 });

  return NextResponse.json({ ok: true, conflict: resolved });
}
