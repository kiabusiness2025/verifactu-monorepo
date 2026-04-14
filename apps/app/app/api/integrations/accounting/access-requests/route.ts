import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getConnectorRequestId,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { listAccessRequests } from '@/lib/integrations/holdedGovernanceService';
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
    metadata: { source: 'holded-access-requests-list' },
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

  const items = await listAccessRequests({
    tenantId: auth.tenantId,
    channel: entryChannel,
  });

  return withConnectorRequestId(
    NextResponse.json({
      items,
      requestId,
    }),
    requestId
  );
}
