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
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-access-request-resolve' },
  });

  if ('error' in auth) {
    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { force: true });
  } catch {
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
    const message =
      error instanceof Error && error.message === 'access_request_not_found'
        ? 'No se ha encontrado la solicitud de acceso.'
        : error instanceof Error
          ? error.message
          : 'No se pudo resolver la solicitud de acceso.';

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 404 }),
      requestId
    );
  }
}
