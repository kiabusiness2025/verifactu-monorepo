import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { removeMembership, updateMembership } from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-membership-update' },
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

  try {
    const membership = await updateMembership({
      tenantId: auth.tenantId,
      membershipId: params.id,
      role: typeof body?.role === 'string' ? body.role : undefined,
      status: typeof body?.status === 'string' ? body.status : undefined,
    });

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        membership,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'membership_not_found'
        ? 'No se ha encontrado la membership.'
        : error instanceof Error
          ? error.message
          : 'No se pudo actualizar la membership.';

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status: 404 }),
      requestId
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-membership-delete' },
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

  try {
    await removeMembership({
      tenantId: auth.tenantId,
      membershipId: params.id,
    });

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        removed: true,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'membership_not_found'
        ? 'No se ha encontrado la membership.'
        : error instanceof Error && error.message === 'last_company_admin'
          ? 'No puedes eliminar el ultimo company_admin del lado cliente.'
          : error instanceof Error
            ? error.message
            : 'No se pudo eliminar la membership.';
    const status = error instanceof Error && error.message === 'last_company_admin' ? 409 : 404;

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
