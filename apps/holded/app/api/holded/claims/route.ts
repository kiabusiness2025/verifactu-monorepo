import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectorEvent,
  buildDefaultAvailableActions,
  buildGovernanceFlags,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createPublicClaim } from '@/app/lib/holded-governance';
import { prisma } from '@/app/lib/prisma';
import { sendPublicClaimCreatedEmails } from '@/app/lib/communications/holded-governance-emails';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    logConnectorEvent(
      'api/holded/claims',
      'warn',
      buildConnectorEvent({ requestId, stage: 'auth', outcome: 'auth_required' })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { ok: false, error: 'Necesitas iniciar sesion para abrir una reclamacion.' },
        { status: 401 }
      ),
      requestId
    );
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.connectionId !== 'string' || !body.connectionId.trim()) {
    logConnectorEvent(
      'api/holded/claims',
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
  if (typeof body?.reason !== 'string' || !body.reason.trim()) {
    logConnectorEvent(
      'api/holded/claims',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'reason es obligatorio',
      })
    );
    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: 'reason es obligatorio.', requestId }, { status: 400 }),
      requestId
    );
  }

  const currentConnection = await prisma.externalConnection.findUnique({
    where: { id: body.connectionId.trim() },
  });
  const currentGovernanceFlags = buildGovernanceFlags(currentConnection);
  const currentAvailableActions = buildDefaultAvailableActions({
    status: currentConnection?.connectionStatus ?? 'disconnected',
    underClaimReview: currentGovernanceFlags.underClaimReview,
    clientAdminGap: currentGovernanceFlags.clientAdminGap,
    highGovernanceRisk: currentGovernanceFlags.highGovernanceRisk,
  });

  if (currentConnection && currentAvailableActions.openClaim.blocked) {
    logConnectorEvent(
      'api/holded/claims',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'guards',
        outcome: 'blocked',
        error: currentAvailableActions.openClaim.reason,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          error:
            currentAvailableActions.openClaim.reason ||
            'La gobernanza actual bloquea la apertura de reclamaciones.',
          governanceFlags: currentGovernanceFlags,
          availableActions: currentAvailableActions,
          requestId,
        },
        { status: 409 }
      ),
      requestId
    );
  }

  try {
    const claim = await createPublicClaim({
      requesterUserId: session.userId,
      connectionId: body.connectionId.trim(),
      claimType: body?.claimType === 'advisor_governance' ? 'advisor_governance' : 'control',
      reason: body.reason.trim(),
      scope: typeof body?.scope === 'string' ? body.scope.trim() || null : null,
    });
    const notified = await sendPublicClaimCreatedEmails({
      claimId: claim.claimId,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'notification_failed';
      logConnectorEvent(
        'api/holded/claims',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          stage: 'notify',
          outcome: 'notification_failed',
          claimId: claim.claimId,
          error: message,
        })
      );
      return false;
    });

    const connection = await prisma.externalConnection.findUnique({
      where: { id: claim.connectionId },
    });
    const governanceFlags = buildGovernanceFlags(connection);

    logConnectorEvent(
      'api/holded/claims',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        stage: 'create',
        outcome: 'success',
        claimId: claim.claimId,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        claim,
        governanceFlags,
        notified,
        nextStep: 'claim_submitted',
        availableActions: buildDefaultAvailableActions({
          status: connection?.connectionStatus ?? 'disconnected',
          underClaimReview: governanceFlags.underClaimReview,
          clientAdminGap: governanceFlags.clientAdminGap,
          highGovernanceRisk: governanceFlags.highGovernanceRisk,
        }),
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'connection_not_found'
        ? 'No se ha encontrado la conexion a la que intentas reclamar acceso.'
        : error instanceof Error
          ? error.message
          : 'No se pudo crear la reclamacion.';

    logConnectorEvent(
      'api/holded/claims',
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
