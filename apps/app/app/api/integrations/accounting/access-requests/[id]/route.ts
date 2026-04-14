import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { sendAccessRequestResolvedEmails } from '@/lib/email/holdedGovernanceEmails';
import { resolveAccessRequest } from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-access-request-resolve' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/access-requests/[id]',
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
      NextResponse.json({ ok: false, error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { force: true });
  } catch {
    logConnectorEvent(
      'api/integrations/accounting/access-requests/[id]',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'auth',
        outcome: 'admin_access_required',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: getHoldedConnectorAdminNotice(), requestId },
        { status: 403 }
      ),
      requestId
    );
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const status =
    body?.status === 'approved' ? 'approved' : body?.status === 'rejected' ? 'rejected' : null;

  if (!status) {
    logConnectorEvent(
      'api/integrations/accounting/access-requests/[id]',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'status debe ser approved o rejected',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: 'status debe ser approved o rejected', requestId },
        { status: 400 }
      ),
      requestId
    );
  }

  try {
    const result = await resolveAccessRequest({
      tenantId: auth.tenantId,
      actorUserId: auth.resolvedUserId ?? null,
      accessRequestId: params.id,
      status,
    });
    const notified = await sendAccessRequestResolvedEmails({
      accessRequestId: result.accessRequest.requestId,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'notification_failed';
      logConnectorEvent(
        'api/integrations/accounting/access-requests/[id]',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          stage: 'notify',
          outcome: 'notification_failed',
          accessRequestId: result.accessRequest.requestId,
          error: message,
        })
      );
      return false;
    });

    logConnectorEvent(
      'api/integrations/accounting/access-requests/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'resolve',
        outcome: 'success',
        accessRequestId: result.accessRequest.requestId,
        status: result.accessRequest.status,
        notified,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        accessRequest: result.accessRequest,
        membership: result.membership,
        notified,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'access_request_not_found';
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = isNotFound
      ? 'No se ha encontrado la solicitud de acceso.'
      : 'No se pudo resolver la solicitud de acceso.';

    logConnectorEvent(
      'api/integrations/accounting/access-requests/[id]',
      isNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'resolve',
        outcome: isNotFound ? 'not_found' : 'exception',
        accessRequestId: params.id,
        error: rawMessage,
      })
    );

    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: message, requestId },
        { status: isNotFound ? 404 : 500 }
      ),
      requestId
    );
  }
}
