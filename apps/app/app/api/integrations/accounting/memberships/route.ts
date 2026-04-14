import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import {
  getTenantHoldedContext,
  listMemberships,
} from '@/lib/integrations/holdedGovernanceService';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'holded-memberships-list' },
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

  const items = await listMemberships(auth.tenantId);
  const context = await getTenantHoldedContext(auth.tenantId, 'dashboard');

  return withConnectorRequestId(
    NextResponse.json({
      items,
      availableActions: context.availableActions,
      requestId,
    }),
    requestId
  );
}
