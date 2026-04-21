import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { NextRequest, NextResponse } from 'next/server';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
  buildConnectorEvent,
} from '@/lib/integrations/connectorObservability';
import {
  applyHoldedConnectorCompatibilityHeaders,
  resolveHoldedConnectorEntryChannel,
  resolveHoldedConnectorTenantIdHint,
} from '@/lib/integrations/holdedConnectorRequest';
import { getHoldedOnboardingTokenFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { buildHoldedSummaries } from '@/lib/integrations/holdedGovernanceService';
import {
  buildConnectionStatusDto,
  buildDefaultAvailableActions,
  buildGovernanceFlags,
} from '@verifactu/integrations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const entryChannel = resolveHoldedConnectorEntryChannel(request, { allowQueryChannel: true });
  const requestId = getConnectorRequestId(request);
  const tenantIdHint = resolveHoldedConnectorTenantIdHint(request);
  const onboardingToken = getHoldedOnboardingTokenFromHeaders(request.headers);
  let stage: 'auth' | 'access' | 'lookup' = 'auth';
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);

  try {
    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: {
        source: entryChannel === 'chatgpt' ? 'holded-first-onboarding' : 'requireTenantContext',
      },
      tenantIdHint,
      onboardingToken,
    });
    if ('error' in auth) {
      logConnectorEvent(
        'api/integrations/accounting/status',
        'warn',
        buildConnectorEvent({
          requestId,
          entryChannel,
          tenantId: tenantIdHint,
          stage,
          outcome: 'auth_error',
          error: auth.error,
        })
      );
      if (entryChannel === 'chatgpt') {
        return respond(
          NextResponse.json({
            provider: 'holded',
            connection: null,
            governanceFlags: null,
            availableActions: buildDefaultAvailableActions({ status: 'disconnected' }),
            status: 'disconnected',
            lastSyncAt: null,
            lastError: null,
            connected: false,
            plan: null,
            canConnect: true,
            canExportAeatBooks: true,
            canUseAccountingApiIntegration: true,
            canBidirectionalQuotes: false,
            connectionMode: 'holded_first',
            degraded: true,
            requestId,
            failureStage: 'auth',
            failureReason: auth.status === 401 ? 'auth_required' : 'tenant_context_missing',
          })
        );
      }

      return respond(
        NextResponse.json({ error: auth.error, requestId, stage: 'auth' }, { status: auth.status })
      );
    }

    stage = 'access';
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });
    stage = 'lookup';
    const resolved = await resolveSharedHoldedConnectionStatusForTenant(
      auth.tenantId,
      entryChannel
    );
    const summaries = await buildHoldedSummaries({
      tenantId: auth.tenantId,
      channel: entryChannel,
    });
    const connection = resolved
      ? buildConnectionStatusDto({
          connectionId: resolved.id,
          tenantId: auth.tenantId,
          status: resolved.status,
          keyMasked: null,
          providerAccountId: resolved.providerAccountId,
          connectedAt: resolved.connectedAt,
          lastValidatedAt: resolved.lastValidatedAt,
          lastSyncAt: resolved.lastSyncAt,
          lastError: resolved.lastError,
          originChannel: resolved.originChannel,
          supportedModules: [],
        })
      : null;
    const governanceFlags = resolved ? buildGovernanceFlags(resolved) : null;
    const availableActions = buildDefaultAvailableActions({
      status: connection?.status,
      underClaimReview: governanceFlags?.underClaimReview,
      clientAdminGap: governanceFlags?.clientAdminGap,
      highGovernanceRisk: governanceFlags?.highGovernanceRisk,
    });
    const connected = connection?.status === 'connected';
    const status = connection?.status ?? 'disconnected';
    const lastSyncAt = connection?.lastSyncAt ?? null;
    const lastError = connection?.lastError ?? null;
    const degraded = false;

    logConnectorEvent(
      'api/integrations/accounting/status',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage,
        outcome: 'success',
        status,
        connected,
      })
    );

    return respond(
      NextResponse.json({
        provider: 'holded',
        connection,
        governanceFlags,
        availableActions,
        membershipsSummary: summaries.membershipsSummary,
        recipientsSummary: summaries.recipientsSummary,
        claimsSummary: summaries.claimsSummary,
        status,
        lastSyncAt,
        lastError,
        connected,
        plan: access.planCode,
        canConnect: access.canConnect,
        canExportAeatBooks: access.canExportAeatBooks,
        canUseAccountingApiIntegration: access.canConnect,
        canBidirectionalQuotes: access.canBidirectionalQuotes,
        connectionMode: access.connectionMode,
        degraded,
        requestId,
      })
    );
  } catch (error) {
    logConnectorEvent('api/integrations/accounting/status', 'error', {
      requestId,
      stage,
      entryChannel,
      outcome: 'exception',
      message: error instanceof Error ? error.message : String(error),
    });

    if (entryChannel === 'chatgpt') {
      return respond(
        NextResponse.json({
          provider: 'holded',
          connection: null,
          governanceFlags: null,
          availableActions: buildDefaultAvailableActions({ status: 'disconnected' }),
          status: 'disconnected',
          lastSyncAt: null,
          lastError: null,
          connected: false,
          plan: null,
          canConnect: true,
          canExportAeatBooks: true,
          canUseAccountingApiIntegration: true,
          canBidirectionalQuotes: false,
          connectionMode: 'holded_first',
          degraded: true,
          requestId,
          failureStage: stage,
          failureReason:
            stage === 'auth'
              ? 'tenant_context_unavailable'
              : stage === 'access'
                ? 'plan_access_lookup_failed'
                : 'connection_status_lookup_failed',
        })
      );
    }

    return respond(
      NextResponse.json(
        {
          error: 'No se pudo cargar el estado de Holded',
          requestId,
          stage,
        },
        { status: 500 }
      )
    );
  }
}
