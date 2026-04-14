import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  getTenantHoldedContext,
  inviteMembership,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-membership-invite' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/invite',
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
      'api/integrations/accounting/memberships/invite',
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

  const governanceContext = await getTenantHoldedContext(auth.tenantId, 'dashboard');
  if (governanceContext.availableActions.manageMembers.blocked) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/invite',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'guards',
        outcome: 'blocked',
        error: governanceContext.availableActions.manageMembers.reason,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          error:
            governanceContext.availableActions.manageMembers.reason ||
            'La gobernanza actual bloquea la gestion de miembros.',
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
    const membership = await inviteMembership({
      tenantId: auth.tenantId,
      actorUserId: auth.resolvedUserId ?? null,
      email: typeof body?.email === 'string' ? body.email : '',
      role: typeof body?.role === 'string' ? body.role : 'viewer',
      side: typeof body?.side === 'string' ? body.side : null,
    });

    logConnectorEvent(
      'api/integrations/accounting/memberships/invite',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'invite',
        outcome: 'success',
        membershipId: membership.membershipId,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        membership,
        invitationSent: false,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const isInvalidEmail = error instanceof Error && error.message === 'invalid_email';
    const isUserNotFound = error instanceof Error && error.message === 'user_not_found';
    const message = isInvalidEmail
      ? 'Indica un correo valido.'
      : isUserNotFound
        ? 'No existe ningun usuario con ese correo en Verifactu todavia.'
        : 'No se pudo invitar al usuario.';
    const status = isUserNotFound ? 409 : isInvalidEmail ? 400 : 500;

    logConnectorEvent(
      'api/integrations/accounting/memberships/invite',
      isInvalidEmail || isUserNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'invite',
        outcome: isUserNotFound ? 'not_found' : isInvalidEmail ? 'validation_error' : 'exception',
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
