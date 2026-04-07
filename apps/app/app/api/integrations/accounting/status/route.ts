import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { NextRequest, NextResponse } from 'next/server';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { getHoldedOnboardingTokenFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';

export const runtime = 'nodejs';

function getEntryChannel(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('channel')?.trim().toLowerCase();
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return query === 'chatgpt' || header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function getTenantIdHint(request: NextRequest) {
  return (
    request.headers.get('x-isaak-tenant-id')?.trim() ||
    request.nextUrl.searchParams.get('tenant_id')?.trim() ||
    null
  );
}

export async function GET(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const requestId = getConnectorRequestId(request);
  const tenantIdHint = getTenantIdHint(request);
  const onboardingToken = getHoldedOnboardingTokenFromHeaders(request.headers);
  let stage: 'auth' | 'access' | 'lookup' = 'auth';

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
      if (entryChannel === 'chatgpt') {
        return withConnectorRequestId(
          NextResponse.json({
            provider: 'holded',
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
          }),
          requestId
        );
      }

      return withConnectorRequestId(
        NextResponse.json({ error: auth.error, requestId, stage: 'auth' }, { status: auth.status }),
        requestId
      );
    }

    stage = 'access';
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });
    stage = 'lookup';
    const connection = await resolveSharedHoldedConnectionStatusForTenant(
      auth.tenantId,
      entryChannel
    );
    const connected = connection?.status === 'connected';
    const status = connection?.status ?? 'disconnected';
    const lastSyncAt = connection?.lastSyncAt ?? null;
    const lastError = connection?.lastError ?? null;
    const degraded = false;

    return withConnectorRequestId(
      NextResponse.json({
        provider: 'holded',
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
      }),
      requestId
    );
  } catch (error) {
    logConnectorEvent('api/integrations/accounting/status', 'error', {
      requestId,
      stage,
      entryChannel,
      message: error instanceof Error ? error.message : String(error),
    });

    if (entryChannel === 'chatgpt') {
      return withConnectorRequestId(
        NextResponse.json({
          provider: 'holded',
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
        }),
        requestId
      );
    }

    return withConnectorRequestId(
      NextResponse.json(
        {
          error: 'No se pudo cargar el estado de Holded',
          requestId,
          stage,
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
