import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimResolvedEmails } from '@/lib/email/holdedGovernanceEmails';
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
  getClaimDetails,
  getTenantHoldedContext,
  updateClaim,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-claim-details' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
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
      'api/integrations/accounting/claims/[id]',
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

  const params = await context.params;

  try {
    const details = await getClaimDetails({
      tenantId: auth.tenantId,
      claimId: params.id,
    });
    const holdedContext = await getTenantHoldedContext(auth.tenantId, entryChannel);

    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'details',
        outcome: 'success',
        claimId: details.claim.claimId,
        status: details.claim.status,
      })
    );

    return respond(
      NextResponse.json({
        claim: details.claim,
        timeline: details.timeline,
        availableActions: holdedContext.availableActions,
        requestId,
      })
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'claim_not_found';
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = isNotFound
      ? 'No se ha encontrado la reclamacion.'
      : 'No se pudo cargar la reclamacion.';

    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
      isNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'details',
        outcome: isNotFound ? 'not_found' : 'exception',
        claimId: params.id,
        error: rawMessage,
      })
    );

    return respond(
      NextResponse.json({ error: message, requestId }, { status: isNotFound ? 404 : 500 })
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-claim-update' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
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
      'api/integrations/accounting/claims/[id]',
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

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  if (typeof body?.status !== 'string' || !body.status.trim()) {
    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'status es obligatorio',
      })
    );
    return respond(
      NextResponse.json({ ok: false, error: 'status es obligatorio', requestId }, { status: 400 })
    );
  }

  try {
    const claim = await updateClaim({
      tenantId: auth.tenantId,
      actorUserId: auth.resolvedUserId ?? auth.session.uid ?? null,
      claimId: params.id,
      status: body.status.trim(),
      resolutionNotes:
        typeof body?.resolutionNotes === 'string' ? body.resolutionNotes.trim() || null : null,
      outcome: typeof body?.outcome === 'string' ? body.outcome.trim() || null : null,
    });
    const holdedContext = await getTenantHoldedContext(auth.tenantId, entryChannel);
    const notified = await sendClaimResolvedEmails({
      claimId: claim.claimId,
      resolutionNotes:
        typeof body?.resolutionNotes === 'string' ? body.resolutionNotes.trim() || null : null,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'notification_failed';
      logConnectorEvent(
        'api/integrations/accounting/claims/[id]',
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
      'api/integrations/accounting/claims/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: 'success',
        claimId: claim.claimId,
        status: claim.status,
        notified,
      })
    );

    return respond(
      NextResponse.json({
        ok: true,
        claim,
        governanceFlags: holdedContext.governanceFlags,
        notified,
        requestId,
      })
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'claim_not_found';
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = isNotFound
      ? 'No se ha encontrado la reclamacion.'
      : 'No se pudo actualizar la reclamacion.';

    logConnectorEvent(
      'api/integrations/accounting/claims/[id]',
      isNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: isNotFound ? 'not_found' : 'exception',
        claimId: params.id,
        error: rawMessage,
      })
    );

    return respond(
      NextResponse.json(
        { ok: false, error: message, requestId },
        { status: isNotFound ? 404 : 500 }
      )
    );
  }
}
