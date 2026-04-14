import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { inviteMembership } from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-membership-invite' },
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
    const membership = await inviteMembership({
      tenantId: auth.tenantId,
      actorUserId: auth.resolvedUserId ?? null,
      email: typeof body?.email === 'string' ? body.email : '',
      role: typeof body?.role === 'string' ? body.role : 'viewer',
      side: typeof body?.side === 'string' ? body.side : null,
    });

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
    const message =
      error instanceof Error && error.message === 'invalid_email'
        ? 'Indica un correo valido.'
        : error instanceof Error && error.message === 'user_not_found'
          ? 'No existe ningun usuario con ese correo en Verifactu todavia.'
          : error instanceof Error
            ? error.message
            : 'No se pudo invitar al usuario.';
    const status = error instanceof Error && error.message === 'user_not_found' ? 409 : 400;

    return withConnectorRequestId(
      NextResponse.json({ ok: false, error: message, requestId }, { status }),
      requestId
    );
  }
}
