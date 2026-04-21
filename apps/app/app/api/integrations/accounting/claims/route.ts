import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimCreatedEmails } from '@/lib/email/holdedGovernanceEmails';
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

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
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
    return respond(NextResponse.json({ error: auth.error, requestId }, { status: auth.status }));
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
    return respond(
      NextResponse.json({ error: getHoldedConnectorAdminNotice(), requestId }, { status: 403 })
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

  return respond(
    NextResponse.json({
      items,
      availableActions: context.availableActions,
      requestId,
    })
  );
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
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
    return respond(
      NextResponse.json({ ok: false, error: auth.error, requestId }, { status: auth.status })
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
    return respond(
      NextResponse.json(
        { ok: false, error: getHoldedConnectorAdminNotice(), requestId },
        { status: 403 }
      )
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
    return respond(
      NextResponse.json({ ok: false, error: 'reason es obligatorio', requestId }, { status: 400 })
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
    return respond(
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
      )
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

    return respond(
      NextResponse.json({
        ok: true,
        claim,
        governanceFlags: context.governanceFlags,
        notified,
        requestId,
      })
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

    return respond(NextResponse.json({ ok: false, error: message, requestId }, { status: 400 }));
  }
}
