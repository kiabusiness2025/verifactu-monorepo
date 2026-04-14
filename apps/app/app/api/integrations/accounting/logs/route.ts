import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { listSyncLogs } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-sync-logs' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/logs',
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

  const cursor = request.nextUrl.searchParams.get('cursor');
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

  try {
    const rows = await listSyncLogs(auth.tenantId, limit, cursor);
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

    logConnectorEvent(
      'api/integrations/accounting/logs',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'list',
        outcome: 'success',
        count: rows.length,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        items: rows,
        nextCursor,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/logs',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'list',
        outcome: 'exception',
        error: message,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { error: 'No se pudieron cargar los logs de sincronizacion.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
