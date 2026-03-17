import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  appendSyncLog,
  createSyncConflict,
  getIntegrationMapByRemote,
  upsertIntegrationMap,
} from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { quoteCreate, quoteFindFirst, quoteUpdate } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RemoteQuote = {
  remoteId: string;
  number: string;
  status: string;
  issueDate: string;
  validUntil?: string | null;
  customerId: string;
  currency?: string;
  lines?: unknown;
  totals?: unknown;
  notes?: string | null;
  updatedAt?: string;
};

function parseItems(input: unknown): RemoteQuote[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is RemoteQuote => {
    return (
      !!item &&
      typeof item === 'object' &&
      typeof (item as RemoteQuote).remoteId === 'string' &&
      typeof (item as RemoteQuote).number === 'string' &&
      typeof (item as RemoteQuote).status === 'string' &&
      typeof (item as RemoteQuote).issueDate === 'string' &&
      typeof (item as RemoteQuote).customerId === 'string'
    );
  });
}

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
  if (entity !== 'quotes') {
    return NextResponse.json({ error: 'entity must be quotes' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const items = parseItems(body?.items);
  const from = request.nextUrl.searchParams.get('from') || null;

  if (items.length === 0) {
    await appendSyncLog({
      tenantId: auth.tenantId,
      level: 'info',
      message: 'QUOTE_PULL_EMPTY',
      data: { from },
    });
    return NextResponse.json({ ok: true, pulled: 0, conflicts: 0, from });
  }

  let pulled = 0;
  let conflicts = 0;
  const now = new Date();

  for (const remote of items) {
    const map = await getIntegrationMapByRemote(auth.tenantId, 'quote', remote.remoteId);
    const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt) : now;
    const customer = await prisma.customer.findFirst({
      where: { id: remote.customerId, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!customer) continue;

    if (map?.local_id) {
      const localQuote = await quoteFindFirst({
        where: { id: map.local_id, tenantId: auth.tenantId },
      });
      if (!localQuote) continue;

      const lastPulledAt = map.last_pulled_at ? new Date(map.last_pulled_at) : null;
      const lastPushedAt = map.last_pushed_at ? new Date(map.last_pushed_at) : null;
      const localChangedSincePull = !lastPulledAt || localQuote.updatedAt > lastPulledAt;
      const remoteChangedSincePush = !lastPushedAt || remoteUpdatedAt > lastPushedAt;

      if (localChangedSincePull && remoteChangedSincePush) {
        await createSyncConflict({
          tenantId: auth.tenantId,
          entityType: 'quote',
          localId: localQuote.id,
          remoteId: remote.remoteId,
          reason: 'both_modified',
          localData: {
            id: localQuote.id,
            number: localQuote.number,
            status: localQuote.status,
            issueDate: localQuote.issueDate,
            validUntil: localQuote.validUntil,
            customerId: localQuote.customerId,
            currency: localQuote.currency,
            lines: localQuote.lines,
            totals: localQuote.totals,
            notes: localQuote.notes,
          },
          remoteData: remote,
        });
        conflicts += 1;
        continue;
      }

      await quoteUpdate({
        where: { id: localQuote.id },
        data: {
          number: remote.number,
          status: remote.status,
          issueDate: new Date(remote.issueDate),
          validUntil: remote.validUntil ? new Date(remote.validUntil) : null,
          customerId: remote.customerId,
          currency: remote.currency?.toUpperCase() || 'EUR',
          lines: remote.lines ?? [],
          totals: remote.totals ?? {},
          notes: remote.notes ?? null,
          source: 'remote',
        },
      });

      await upsertIntegrationMap({
        tenantId: auth.tenantId,
        entityType: 'quote',
        localId: localQuote.id,
        remoteId: remote.remoteId,
        lastPulledAt: now,
        lastRemoteUpdatedAt: remoteUpdatedAt,
      });
      pulled += 1;
      continue;
    }

    const created = await quoteCreate({
      data: {
        tenantId: auth.tenantId,
        number: remote.number,
        status: remote.status,
        issueDate: new Date(remote.issueDate),
        validUntil: remote.validUntil ? new Date(remote.validUntil) : null,
        customerId: remote.customerId,
        currency: remote.currency?.toUpperCase() || 'EUR',
        lines: remote.lines ?? [],
        totals: remote.totals ?? {},
        notes: remote.notes ?? null,
        source: 'remote',
      },
    });

    await upsertIntegrationMap({
      tenantId: auth.tenantId,
      entityType: 'quote',
      localId: created.id,
      remoteId: remote.remoteId,
      lastPulledAt: now,
      lastRemoteUpdatedAt: remoteUpdatedAt,
    });
    pulled += 1;
  }

  await appendSyncLog({
    tenantId: auth.tenantId,
    level: conflicts > 0 ? 'warn' : 'info',
    message: 'QUOTE_PULL_DONE',
    data: { pulled, conflicts, from },
  });

  return NextResponse.json({ ok: true, pulled, conflicts, from });
}
