import { NextResponse } from 'next/server';
import {
  buildConnectorEvent,
  buildConnectionStatusDto,
  buildDefaultAvailableActions,
  buildGovernanceFlags,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';

export const runtime = 'nodejs';

function normalizeChannel(value: string | null) {
  return value === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

export async function GET(request: Request) {
  const requestId = getConnectorRequestId({ headers: request.headers });
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    logConnectorEvent(
      'api/holded/status',
      'warn',
      buildConnectorEvent({ requestId, stage: 'auth', outcome: 'auth_required' })
    );
    return withConnectorRequestId(
      NextResponse.json({ error: 'Necesitas iniciar sesion para continuar.' }, { status: 401 }),
      requestId
    );
  }

  const channel = normalizeChannel(new URL(request.url).searchParams.get('channel'));
  const connection = await getHoldedConnection(session.tenantId, channel);
  const connectionDto = connection
    ? buildConnectionStatusDto({
        connectionId: `${session.tenantId}:${channel}`,
        tenantId: session.tenantId,
        status: connection.status,
        keyMasked: connection.keyMasked,
        providerAccountId: connection.providerAccountId,
        connectedAt: connection.connectedAt,
        lastValidatedAt: connection.lastValidatedAt,
        lastSyncAt: connection.lastSyncAt,
        lastError: null,
        originChannel: connection.originChannel ?? channel,
        supportedModules: connection.supportedModules,
      })
    : null;
  const governanceFlags = connection ? buildGovernanceFlags(connection) : null;
  const availableActions = buildDefaultAvailableActions({
    status: connection?.status,
    underClaimReview: governanceFlags?.underClaimReview,
    clientAdminGap: governanceFlags?.clientAdminGap,
    highGovernanceRisk: governanceFlags?.highGovernanceRisk,
  });

  logConnectorEvent(
    'api/holded/status',
    'info',
    buildConnectorEvent({
      requestId,
      tenantId: session.tenantId,
      entryChannel: channel,
      stage: 'lookup',
      outcome: 'success',
      connected: Boolean(connection),
      status: connectionDto?.status || 'disconnected',
    })
  );

  return withConnectorRequestId(
    NextResponse.json({
      connection: connectionDto,
      governanceFlags,
      availableActions,
      membershipsSummary: null,
      recipientsSummary: null,
      claimsSummary: null,
      channel,
      connected: Boolean(connection),
      status: connectionDto?.status || 'disconnected',
      keyMasked: connectionDto?.keyMasked || null,
      connectedAt: connectionDto?.connectedAt || null,
      lastValidatedAt: connectionDto?.lastValidatedAt || null,
      lastSyncAt: connectionDto?.lastSyncAt || null,
      supportedModules: connectionDto?.supportedModules || [],
      validationSummary: connection?.validationSummary || null,
      providerAccountId: connectionDto?.providerAccountId || null,
      tenantName: connection?.tenantName || null,
      legalName: connection?.legalName || null,
      taxId: connection?.taxId || null,
      tenantId: session.tenantId,
      requestId,
    }),
    requestId
  );
}
