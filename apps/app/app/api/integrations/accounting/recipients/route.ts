import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
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
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
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
    return withConnectorRequestId(
      NextResponse.json({ error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { force: true });
  } catch {
    return withConnectorRequestId(
      NextResponse.json({ error: getHoldedConnectorAdminNotice(), requestId }, { status: 403 }),
      requestId
    );
  }

  const { items } = await listRecipients({
    tenantId: auth.tenantId,
    userId: auth.resolvedUserId ?? null,
    channel: entryChannel,
  });
  const context = await getTenantHoldedContext(auth.tenantId, entryChannel);

  return withConnectorRequestId(
    NextResponse.json({
      items,
      availableActions: context.availableActions,
      requestId,
    }),
    requestId
  );
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-recipient-create' },
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
      error instanceof Error && error.message === 'holded_connection_not_found'
        ? 'No existe una conexion Holded activa para este tenant.'
        : error instanceof Error && error.message === 'invalid_email'
          ? 'Indica un correo valido.'
          : error instanceof Error
            ? error.message
            : 'No se pudo crear el destinatario.';

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 400 }),
      requestId
    );
  }
}
