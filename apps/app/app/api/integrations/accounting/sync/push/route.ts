import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  appendSyncLog,
  createSyncConflict,
  createSyncOutbox,
  getIntegrationMapByLocal,
  upsertIntegrationMap,
} from '@/lib/integrations/accountingStore';
import { buildPayloadHash } from '@/lib/integrations/syncHash';
import prisma from '@/lib/prisma';
import { quoteFindFirst } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const enabled = await canBidirectionalQuotes(auth.tenantId);
  if (!enabled) {
    return NextResponse.json(
      { error: 'La sincronización bidireccional de presupuestos está disponible en Empresa y PRO.' },
      { status: 403 }
    );
  }

  const entity = request.nextUrl.searchParams.get('entity');
  const id = request.nextUrl.searchParams.get('id');
  if (entity !== 'quotes') {
    return NextResponse.json({ error: 'entity must be quotes' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const quote = await quoteFindFirst({
    where: { id, tenantId: auth.tenantId },
    include: { customer: true },
  });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (!quote.customer) {
    return NextResponse.json({ error: 'Quote customer not found' }, { status: 409 });
  }

  const payload = {
    number: quote.number,
    status: quote.status,
    issueDate: quote.issueDate.toISOString(),
    validUntil: quote.validUntil?.toISOString() ?? null,
    customer: {
      id: quote.customerId,
      name: quote.customer.name,
      nif: quote.customer.nif,
      email: quote.customer.email,
    },
    currency: quote.currency,
    lines: quote.lines,
    totals: quote.totals,
    notes: quote.notes,
  };
  const hash = buildPayloadHash(payload);

  const existingMap = await getIntegrationMapByLocal(auth.tenantId, 'quote', quote.id);
  if (existingMap?.hash === hash) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'hash_unchanged',
      quoteId: quote.id,
      remoteId: existingMap.remote_id,
    });
  }

  const lastPulledAt = existingMap?.last_pulled_at ? new Date(existingMap.last_pulled_at) : null;
  const lastPushedAt = existingMap?.last_pushed_at ? new Date(existingMap.last_pushed_at) : null;
  const lastRemoteUpdatedAt = existingMap?.last_remote_updated_at
    ? new Date(existingMap.last_remote_updated_at)
    : null;

  const localChangedSincePull = !lastPulledAt || quote.updatedAt > lastPulledAt;
  const remoteChangedSincePush = !!(
    lastRemoteUpdatedAt &&
    (!lastPushedAt || lastRemoteUpdatedAt > lastPushedAt)
  );

  if (localChangedSincePull && remoteChangedSincePush) {
    const conflict = await createSyncConflict({
      tenantId: auth.tenantId,
      entityType: 'quote',
      localId: quote.id,
      remoteId: existingMap?.remote_id ?? null,
      reason: 'both_modified',
      localData: payload,
      remoteData: {
        remoteId: existingMap?.remote_id ?? null,
        lastRemoteUpdatedAt: existingMap?.last_remote_updated_at ?? null,
      },
    });

    await appendSyncLog({
      tenantId: auth.tenantId,
      level: 'warn',
      message: `QUOTE_CONFLICT ${quote.id}`,
      data: { conflictId: conflict?.id ?? null, reason: 'both_modified' },
    });

    return NextResponse.json(
      { ok: false, conflictId: conflict?.id ?? null, reason: 'both_modified' },
      { status: 409 }
    );
  }

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'quote',
    entityId: quote.id,
    action: 'upsert',
    payload,
  });

  const now = new Date();
  await upsertIntegrationMap({
    tenantId: auth.tenantId,
    entityType: 'quote',
    localId: quote.id,
    remoteId: existingMap?.remote_id ?? `pending:${quote.id}`,
    hash,
    lastPushedAt: now,
  });

  return NextResponse.json({
    ok: true,
    quoteId: quote.id,
    queued: true,
    hash,
  });
}
