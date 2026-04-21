import { requireTenantContext } from '@/lib/api/tenantAuth';
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
import { listAccessRequests } from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-access-requests-list' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/access-requests',
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
    assertHoldedConnectorAdminSessionAccess(auth.session, { force: true });
  } catch {
    logConnectorEvent(
      'api/integrations/accounting/access-requests',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'auth',
        outcome: 'admin_access_required',
      })
    );
    return respond(
      NextResponse.json({ error: getHoldedConnectorAdminNotice(), requestId }, { status: 403 })
    );
  }

  try {
    const items = await listAccessRequests({
      tenantId: auth.tenantId,
      channel: entryChannel,
    });

    logConnectorEvent(
      'api/integrations/accounting/access-requests',
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

    return respond(
      NextResponse.json({
        items,
        requestId,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/access-requests',
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
    return respond(
      NextResponse.json(
        { error: 'No se pudo cargar la lista de solicitudes de acceso.', requestId },
        { status: 500 }
      )
    );
  }
}
