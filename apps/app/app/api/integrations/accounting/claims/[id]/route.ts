import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendClaimResolvedEmails } from '@/lib/email/holdedGovernanceEmails';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
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

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-claim-details' },
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

  const params = await context.params;

  try {
    const details = await getClaimDetails({
      tenantId: auth.tenantId,
      claimId: params.id,
    });
    const holdedContext = await getTenantHoldedContext(auth.tenantId, entryChannel);

    return withConnectorRequestId(
      NextResponse.json({
        claim: details.claim,
        timeline: details.timeline,
        availableActions: holdedContext.availableActions,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'claim_not_found'
        ? 'No se ha encontrado la reclamacion.'
        : error instanceof Error
          ? error.message
          : 'No se pudo cargar la reclamacion.';

    return withConnectorRequestId(
      NextResponse.json({ error: message, requestId }, { status: 404 }),
      requestId
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = getEntryChannel(request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-claim-update' },
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
  if (typeof body?.status !== 'string' || !body.status.trim()) {
    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: 'status es obligatorio', requestId }, { status: 400 }),
      requestId
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

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        claim,
        governanceFlags: holdedContext.governanceFlags,
        notified,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'claim_not_found'
        ? 'No se ha encontrado la reclamacion.'
        : error instanceof Error
          ? error.message
          : 'No se pudo actualizar la reclamacion.';

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 404 }),
      requestId
    );
  }
}
