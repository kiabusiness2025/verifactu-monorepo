import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createPublicAccessRequest } from '@/app/lib/holded-governance';
import { sendPublicAccessRequestCreatedEmails } from '@/app/lib/communications/holded-governance-emails';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    logConnectorEvent(
      'api/holded/access-requests',
      'warn',
      buildConnectorEvent({ requestId, stage: 'auth', outcome: 'auth_required' })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: 'Necesitas iniciar sesion para solicitar acceso.' },
        { status: 401 }
      ),
      requestId
    );
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.connectionId !== 'string' || !body.connectionId.trim()) {
    logConnectorEvent(
      'api/holded/access-requests',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'connectionId es obligatorio',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: 'connectionId es obligatorio.', requestId },
        { status: 400 }
      ),
      requestId
    );
  }

  try {
    const accessRequest = await createPublicAccessRequest({
      requesterUserId: session.userId,
      connectionId: body.connectionId.trim(),
      requestedRole: body?.requestedRole === 'operator' ? 'operator' : 'viewer',
      message: typeof body?.message === 'string' ? body.message.trim() || null : null,
    });
    const notified = await sendPublicAccessRequestCreatedEmails({
      accessRequestId: accessRequest.requestId,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'notification_failed';
      logConnectorEvent(
        'api/holded/access-requests',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          stage: 'notify',
          outcome: 'notification_failed',
          accessRequestId: accessRequest.requestId,
          error: message,
        })
      );
      return false;
    });

    logConnectorEvent(
      'api/holded/access-requests',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'create',
        outcome: 'success',
        accessRequestId: accessRequest.requestId,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        accessRequest,
        notified,
        nextStep: 'request_submitted',
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'connection_not_found'
        ? 'No se ha encontrado la conexion a la que intentas solicitar acceso.'
        : error instanceof Error
          ? error.message
          : 'No se pudo enviar la solicitud de acceso.';

    logConnectorEvent(
      'api/holded/access-requests',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'create',
        outcome: 'exception',
        error: message,
      })
    );
    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 400 }),
      requestId
    );
  }
}
