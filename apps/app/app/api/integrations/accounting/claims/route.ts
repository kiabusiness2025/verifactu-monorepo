import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimCreatedEmails } from '@/lib/email/holdedGovernanceEmails';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  createClaim,
  getTenantHoldedContext,
  listClaims,
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
    metadata: { source: 'holded-claims-list' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/claims',
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
      'api/integrations/accounting/claims',
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

  const items = await listClaims({
    tenantId: auth.tenantId,
    channel: entryChannel,
  });
  const context = await getTenantHoldedContext(auth.tenantId, entryChannel);

  logConnectorEvent(
    'api/integrations/accounting/claims',
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
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-claim-create' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/claims',
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
      'api/integrations/accounting/claims',
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

  const body = await request.json().catch(() => ({}));
  if (typeof body?.reason !== 'string' || !body.reason.trim()) {
    logConnectorEvent(
      'api/integrations/accounting/claims',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'reason es obligatorio',
      })
    );
    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: 'reason es obligatorio', requestId }, { status: 400 }),
      requestId
    );
  }

  const currentContext = await getTenantHoldedContext(auth.tenantId, entryChannel);
  if (currentContext.availableActions.openClaim.blocked) {
    logConnectorEvent(
      'api/integrations/accounting/claims',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
        error: currentContext.availableActions.openClaim.reason,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          error:
            currentContext.availableActions.openClaim.reason ||
            'La gobernanza actual bloquea la apertura de reclamaciones.',
          governanceFlags: currentContext.governanceFlags,
          availableActions: currentContext.availableActions,
          requestId,
        },
        { status: 409 }
      ),
      requestId
    );
  }

  try {
    const claim = await createClaim({
      tenantId: auth.tenantId,
      actorUserId: auth.resolvedUserId ?? auth.session.uid ?? '',
      channel: entryChannel,
      claimType: body?.claimType === 'advisor_governance' ? 'advisor_governance' : 'control',
      reason: body.reason.trim(),
      scope: typeof body?.scope === 'string' ? body.scope.trim() || null : null,
    });
    const context = await getTenantHoldedContext(auth.tenantId, entryChannel);
    const notified = await sendClaimCreatedEmails({
      claimId: claim.claimId,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'notification_failed';
      logConnectorEvent(
        'api/integrations/accounting/claims',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'notify',
          outcome: 'notification_failed',
          claimId: claim.claimId,
          error: message,
        })
      );
      return false;
    });

    logConnectorEvent(
      'api/integrations/accounting/claims',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'create',
        outcome: 'success',
        claimId: claim.claimId,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        claim,
        governanceFlags: context.governanceFlags,
        notified,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'holded_connection_not_found'
        ? 'No existe una conexion Holded activa para este tenant.'
        : error instanceof Error
          ? error.message
          : 'No se pudo crear la reclamacion.';

    logConnectorEvent(
      'api/integrations/accounting/claims',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
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
