import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  getTenantHoldedContext,
  removeMembership,
  updateMembership,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function getManageMembersBlockedResponse(tenantId: string, requestId: string) {
  const governanceContext = await getTenantHoldedContext(tenantId, 'dashboard');
  const manageMembers = governanceContext.availableActions.manageMembers;

  if (!manageMembers.blocked) {
    return null;
  }

  return withConnectorRequestId(
    NextResponse.json(
      {
        ok: false,
        error: manageMembers.reason || 'La gobernanza actual bloquea la gestion de miembros.',
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
    metadata: { source: 'holded-membership-update' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
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
      'api/integrations/accounting/memberships/[id]',
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

  const blockedResponse = await getManageMembersBlockedResponse(auth.tenantId, requestId);
  if (blockedResponse) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
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
    const membership = await updateMembership({
      tenantId: auth.tenantId,
      membershipId: params.id,
      role: typeof body?.role === 'string' ? body.role : undefined,
      status: typeof body?.status === 'string' ? body.status : undefined,
    });

    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: 'success',
        membershipId: params.id,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        membership,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const isNotFound = error instanceof Error && error.message === 'membership_not_found';
    const message =
      error instanceof Error && error.message === 'membership_not_found'
        ? 'No se ha encontrado la membership.'
        : 'No se pudo actualizar la membership.';

    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
      isNotFound ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'update',
        outcome: isNotFound ? 'not_found' : 'exception',
        membershipId: params.id,
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
    metadata: { source: 'holded-membership-delete' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
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
      'api/integrations/accounting/memberships/[id]',
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

  const blockedResponse = await getManageMembersBlockedResponse(auth.tenantId, requestId);
  if (blockedResponse) {
    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
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
    await removeMembership({
      tenantId: auth.tenantId,
      membershipId: params.id,
    });

    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'remove',
        outcome: 'success',
        membershipId: params.id,
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
    const isNotFound = error instanceof Error && error.message === 'membership_not_found';
    const isLastAdmin = error instanceof Error && error.message === 'last_company_admin';
    const message = isNotFound
      ? 'No se ha encontrado la membership.'
      : isLastAdmin
        ? 'No puedes eliminar el ultimo company_admin del lado cliente.'
        : 'No se pudo eliminar la membership.';
    const status = isLastAdmin ? 409 : isNotFound ? 404 : 500;

    logConnectorEvent(
      'api/integrations/accounting/memberships/[id]',
      isNotFound || isLastAdmin ? 'warn' : 'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'remove',
        outcome: isNotFound ? 'not_found' : isLastAdmin ? 'blocked' : 'exception',
        membershipId: params.id,
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
