import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canUseAccountingIntegration } from '@/lib/billing/tenantPlan';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  appendSyncLog,
  getPendingOutbox,
  markOutboxDone,
  markOutboxError,
  setIntegrationError,
  touchIntegrationSyncOk,
} from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function POST(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: {
      source: entryChannel === 'chatgpt' ? 'accounting-sync-run' : 'requireTenantContext',
    },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/sync/run',
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
  const enabled = await canUseAccountingIntegration(auth.tenantId);
  if (!enabled) {
    logConnectorEvent(
      'api/integrations/accounting/sync/run',
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
            'La sincronización con programa contable vía API está disponible en Empresa y PRO.',
          requestId,
        },
        { status: 403 }
      ),
      requestId
    );
  }

  try {
    const runId = `sync_${Date.now()}`;
    const pending = await getPendingOutbox(auth.tenantId, 50);

    let processed = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        // Placeholder push: en Sprint 2 se reemplaza por adapter real del programa contable API.
        await markOutboxDone(item.id);
        await appendSyncLog({
          tenantId: auth.tenantId,
          outboxId: item.id,
          level: 'info',
          message: `SYNC_OK ${item.entity_type}:${item.entity_id}`,
          data: { runId, action: item.action },
        });
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido en sync';
        await markOutboxError(item.id, message);
        await appendSyncLog({
          tenantId: auth.tenantId,
          outboxId: item.id,
          level: 'error',
          message: `SYNC_ERROR ${item.entity_type}:${item.entity_id}`,
          data: { runId, error: message },
        });
        failed += 1;
      }
    }

    if (failed > 0) {
      await setIntegrationError(
        auth.tenantId,
        `${failed} elementos en error durante sync manual`,
        entryChannel
      );
    } else {
      await touchIntegrationSyncOk(auth.tenantId, entryChannel);
    }

    logConnectorEvent(
      'api/integrations/accounting/sync/run',
      failed > 0 ? 'warn' : 'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'run',
        outcome: failed > 0 ? 'completed_with_errors' : 'success',
        runId,
        queued: pending.length,
        processed,
        failed,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: failed === 0,
        runId,
        counts: {
          queued: pending.length,
          processed,
          failed,
        },
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/sync/run',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'run',
        outcome: 'exception',
        error: message,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { error: 'No se pudo ejecutar la sincronizacion manual.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
