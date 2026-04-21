import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  applyHoldedConnectorCompatibilityHeaders,
  resolveHoldedConnectorEntryChannel,
} from '@/lib/integrations/holdedConnectorRequest';
import {
  appendSyncLog,
  createSyncConflict,
  createSyncOutbox,
  getIntegrationMapByLocal,
  upsertIntegrationMap,
} from '@/lib/integrations/accountingStore';
import { buildPayloadHash } from '@/lib/integrations/syncHash';
import { quoteFindFirst } from '@/lib/quotes/repo';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-sync-push' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/sync/push',
      'warn',
      buildConnectorEvent({
        requestId,
        entryChannel,
        stage: 'auth',
        outcome: 'auth_error',
        error: auth.error,
      })
    );
    return respond(NextResponse.json({ error: auth.error, requestId }, { status: auth.status }));
  }
  try {
    const enabled = await canBidirectionalQuotes(auth.tenantId);
    if (!enabled) {
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'access',
          outcome: 'plan_access_denied',
        })
      );
      return respond(
        NextResponse.json(
          {
            error:
              'La sincronizaciÃ³n bidireccional de presupuestos estÃ¡ disponible en Empresa y PRO.',
            requestId,
          },
          { status: 403 }
        )
      );
    }

    const entity = request.nextUrl.searchParams.get('entity');
    const id = request.nextUrl.searchParams.get('id');
    if (entity !== 'quotes') {
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
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
      return respond(
        NextResponse.json({ error: 'entity must be quotes', requestId }, { status: 400 })
      );
    }
    if (!id) {
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'query',
          outcome: 'invalid_input',
          error: 'id is required',
        })
      );
      return respond(NextResponse.json({ error: 'id is required', requestId }, { status: 400 }));
    }

    const quote = await quoteFindFirst({
      where: { id, tenantId: auth.tenantId },
      include: { customer: true },
    });
    if (!quote) {
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'lookup',
          outcome: 'not_found',
          error: 'Quote not found',
        })
      );
      return respond(NextResponse.json({ error: 'Quote not found', requestId }, { status: 404 }));
    }
    if (!quote.customer) {
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'lookup',
          outcome: 'blocked',
          error: 'Quote customer not found',
        })
      );
      return respond(
        NextResponse.json({ error: 'Quote customer not found', requestId }, { status: 409 })
      );
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
      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'info',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'push',
          outcome: 'hash_unchanged',
          quoteId: quote.id,
        })
      );
      return respond(
        NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'hash_unchanged',
          quoteId: quote.id,
          remoteId: existingMap.remote_id,
          requestId,
        })
      );
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
        data: { conflictId: conflict?.id ?? null, reason: 'both_modified', requestId },
      });

      logConnectorEvent(
        'api/integrations/accounting/sync/push',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'push',
          outcome: 'conflict',
          quoteId: quote.id,
        })
      );

      return respond(
        NextResponse.json(
          { ok: false, conflictId: conflict?.id ?? null, reason: 'both_modified', requestId },
          { status: 409 }
        )
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

    logConnectorEvent(
      'api/integrations/accounting/sync/push',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'push',
        outcome: 'success',
        quoteId: quote.id,
      })
    );

    return respond(
      NextResponse.json({
        ok: true,
        quoteId: quote.id,
        queued: true,
        hash,
        requestId,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/sync/push',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'push',
        outcome: 'exception',
        error: message,
      })
    );
    return respond(
      NextResponse.json(
        { error: 'No se pudo ejecutar la sincronizacion push.', requestId },
        { status: 500 }
      )
    );
  }
}
