import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  getTenantHoldedContext,
  removeRecipient,
  updateRecipient,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function getManageRecipientsBlockedResponse(tenantId: string, requestId: string) {
  const governanceContext = await getTenantHoldedContext(tenantId, 'dashboard');
  const manageRecipients = governanceContext.availableActions.manageRecipients;

  if (!manageRecipients.blocked) {
    return null;
  }

  return withConnectorRequestId(
    NextResponse.json(
      {
        ok: false,
        error:
          manageRecipients.reason || 'La gobernanza actual bloquea la gestion de destinatarios.',
        availableActions: governanceContext.availableActions,
        requestId,
      },
      { status: 409 }
    ),
    requestId
  );
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-recipient-update' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
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
      'api/integrations/accounting/recipients/[id]',
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

  const blockedResponse = await getManageRecipientsBlockedResponse(auth.tenantId, requestId);
  if (blockedResponse) {
    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
      })
    );
    return blockedResponse;
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

    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: 'success',
        recipientId: params.id,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        recipient,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'recipient_not_found';
    const message =
      error instanceof Error && error.message === 'recipient_not_found'
        ? 'No se ha encontrado el destinatario.'
        : 'No se pudo actualizar el destinatario.';

    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      isNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: isNotFound ? 'not_found' : 'exception',
        recipientId: params.id,
        error: error instanceof Error ? error.message : String(error),
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-recipient-delete' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
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
      'api/integrations/accounting/recipients/[id]',
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

  const blockedResponse = await getManageRecipientsBlockedResponse(auth.tenantId, requestId);
  if (blockedResponse) {
    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
      })
    );
    return blockedResponse;
  }

  const params = await context.params;

  try {
    await removeRecipient({
      tenantId: auth.tenantId,
      recipientId: params.id,
    });

    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'remove',
        outcome: 'success',
        recipientId: params.id,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        removed: true,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'recipient_not_found';
    const isMandatoryGuard = error instanceof Error && error.message === 'last_mandatory_recipient';
    const message = isNotFound
      ? 'No se ha encontrado el destinatario.'
      : isMandatoryGuard
        ? 'No puedes eliminar el ultimo destinatario obligatorio.'
        : 'No se pudo eliminar el destinatario.';
    const status = isMandatoryGuard ? 409 : isNotFound ? 404 : 500;

    logConnectorEvent(
      'api/integrations/accounting/recipients/[id]',
      isNotFound || isMandatoryGuard ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'remove',
        outcome: isNotFound ? 'not_found' : isMandatoryGuard ? 'blocked' : 'exception',
        recipientId: params.id,
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
