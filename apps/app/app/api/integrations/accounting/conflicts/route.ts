import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { listSyncConflicts } from '@/lib/integrations/accountingStore';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-sync-conflicts' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/conflicts',
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
  const enabled = await canBidirectionalQuotes(auth.tenantId);
  if (!enabled) {
    logConnectorEvent(
      'api/integrations/accounting/conflicts',
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
          error: 'La gestión de conflictos de presupuestos está disponible en Empresa y PRO.',
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
      'api/integrations/accounting/conflicts',
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

  try {
    const items = await listSyncConflicts(auth.tenantId, 'quote');
    logConnectorEvent(
      'api/integrations/accounting/conflicts',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'list',
        outcome: 'success',
        count: items.length,
      })
    );
    return withConnectorRequestId(NextResponse.json({ items, requestId }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/conflicts',
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
        { error: 'No se pudieron cargar los conflictos de sincronizacion.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
