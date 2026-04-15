import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  createRecipient,
  getTenantHoldedContext,
  listRecipients,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const header = (
    request.headers.get('x-holded-entry-channel') || request.headers.get('x-isaak-entry-channel')
  )
    ?.trim()
    .toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-recipients-list' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/recipients',
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

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { force: true });
  } catch {
    logConnectorEvent(
      'api/integrations/accounting/recipients',
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
      NextResponse.json({ error: getHoldedConnectorAdminNotice(), requestId }, { status: 403 }),
      requestId
    );
  }

  try {
    const { items } = await listRecipients({
      tenantId: auth.tenantId,
      userId: auth.resolvedUserId ?? null,
      channel: entryChannel,
    });
    const context = await getTenantHoldedContext(auth.tenantId, entryChannel);

    logConnectorEvent(
      'api/integrations/accounting/recipients',
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

    return withConnectorRequestId(
      NextResponse.json({
        items,
        availableActions: context.availableActions,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/recipients',
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
        { error: 'No se pudo cargar la lista de destinatarios.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-recipient-create' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/recipients',
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
      'api/integrations/accounting/recipients',
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

  const governanceContext = await getTenantHoldedContext(auth.tenantId, entryChannel);
  if (governanceContext.availableActions.manageRecipients.blocked) {
    logConnectorEvent(
      'api/integrations/accounting/recipients',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
        error: governanceContext.availableActions.manageRecipients.reason,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          error:
            governanceContext.availableActions.manageRecipients.reason ||
            'La gobernanza actual bloquea la gestion de destinatarios.',
          availableActions: governanceContext.availableActions,
          requestId,
        },
        { status: 409 }
      ),
      requestId
    );
  }

  const body = await request.json().catch(() => ({}));
  try {
    const recipient = await createRecipient({
      tenantId: auth.tenantId,
      userId: auth.resolvedUserId ?? null,
      channel: entryChannel,
      email: typeof body?.email === 'string' ? body.email : '',
      recipientType:
        typeof body?.recipientType === 'string' ? body.recipientType : 'client_contact',
      isMandatory: body?.isMandatory === true,
      isClientSide: body?.isClientSide === true,
    });

    logConnectorEvent(
      'api/integrations/accounting/recipients',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'create',
        outcome: 'success',
        recipientId: recipient.recipientId,
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
    const isKnownBusinessError =
      error instanceof Error &&
      (error.message === 'holded_connection_not_found' || error.message === 'invalid_email');
    const message =
      error instanceof Error && error.message === 'holded_connection_not_found'
        ? 'No existe una conexion Holded activa para este tenant.'
        : error instanceof Error && error.message === 'invalid_email'
          ? 'Indica un correo valido.'
          : 'No se pudo crear el destinatario.';

    logConnectorEvent(
      'api/integrations/accounting/recipients',
      isKnownBusinessError ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'create',
        outcome: isKnownBusinessError ? 'validation_error' : 'exception',
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: message, requestId },
        { status: isKnownBusinessError ? 400 : 500 }
      ),
      requestId
    );
  }
}
