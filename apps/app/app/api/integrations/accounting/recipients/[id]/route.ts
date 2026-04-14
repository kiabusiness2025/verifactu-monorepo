import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { removeRecipient, updateRecipient } from '@/lib/integrations/holdedGovernanceService';
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
    metadata: { source: 'holded-recipient-update' },
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

  try {
    const recipient = await updateRecipient({
      tenantId: auth.tenantId,
      recipientId: params.id,
      recipientType: typeof body?.recipientType === 'string' ? body.recipientType : undefined,
      isMandatory: typeof body?.isMandatory === 'boolean' ? body.isMandatory : undefined,
      isClientSide: typeof body?.isClientSide === 'boolean' ? body.isClientSide : undefined,
      isConfirmed: typeof body?.isConfirmed === 'boolean' ? body.isConfirmed : undefined,
    });

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        recipient,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'recipient_not_found'
        ? 'No se ha encontrado el destinatario.'
        : error instanceof Error
          ? error.message
          : 'No se pudo actualizar el destinatario.';

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 404 }),
      requestId
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-recipient-delete' },
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

  try {
    await removeRecipient({
      tenantId: auth.tenantId,
      recipientId: params.id,
    });

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        removed: true,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'recipient_not_found'
        ? 'No se ha encontrado el destinatario.'
        : error instanceof Error && error.message === 'last_mandatory_recipient'
          ? 'No puedes eliminar el ultimo destinatario obligatorio.'
          : error instanceof Error
            ? error.message
            : 'No se pudo eliminar el destinatario.';
    const status =
      error instanceof Error && error.message === 'last_mandatory_recipient' ? 409 : 404;

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
