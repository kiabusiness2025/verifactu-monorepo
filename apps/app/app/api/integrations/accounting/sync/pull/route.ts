import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
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

function getEntryChannel(request: NextRequest) {
  const header = (
    request.headers.get('x-holded-entry-channel') || request.headers.get('x-isaak-entry-channel')
  )
    ?.trim()
    .toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

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
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-sync-pull' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/sync/pull',
      'warn',
      buildConnectorEvent({
        requestId,
        entryChannel,
        stage: 'auth',
        outcome: 'auth_error',
        error: auth.error,
      })
    );
    return withConnectorRequestId(
      NextResponse.json({ error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }
  try {
    const enabled = await canBidirectionalQuotes(auth.tenantId);
    if (!enabled) {
      logConnectorEvent(
        'api/integrations/accounting/sync/pull',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'access',
          outcome: 'plan_access_denied',
        })
      );
      return withConnectorRequestId(
        NextResponse.json(
          {
            error:
              'La sincronización bidireccional de presupuestos está disponible en Empresa y PRO.',
            requestId,
          },
          { status: 403 }
        ),
        requestId
      );
    }

    const entity = request.nextUrl.searchParams.get('entity');
    if (entity !== 'quotes') {
      logConnectorEvent(
        'api/integrations/accounting/sync/pull',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'query',
          outcome: 'invalid_input',
          error: 'entity must be quotes',
        })
      );
      return withConnectorRequestId(
        NextResponse.json({ error: 'entity must be quotes', requestId }, { status: 400 }),
        requestId
      );
    }

    const body = await request.json().catch(() => ({}));
    const items = parseItems(body?.items);
    const from = request.nextUrl.searchParams.get('from') || null;

    if (items.length === 0) {
      await appendSyncLog({
        tenantId: auth.tenantId,
        level: 'info',
        message: 'QUOTE_PULL_EMPTY',
        data: { from, requestId },
      });
      logConnectorEvent(
        'api/integrations/accounting/sync/pull',
        'info',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'pull',
          outcome: 'success',
          pulled: 0,
          conflicts: 0,
        })
      );
      return withConnectorRequestId(
        NextResponse.json({ ok: true, pulled: 0, conflicts: 0, from, requestId }),
        requestId
      );
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
      data: { pulled, conflicts, from, requestId },
    });

    logConnectorEvent(
      'api/integrations/accounting/sync/pull',
      conflicts > 0 ? 'warn' : 'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'pull',
        outcome: conflicts > 0 ? 'completed_with_conflicts' : 'success',
        pulled,
        conflicts,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({ ok: true, pulled, conflicts, from, requestId }),
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/sync/pull',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'pull',
        outcome: 'exception',
        error: message,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { error: 'No se pudo ejecutar la sincronizacion pull.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
