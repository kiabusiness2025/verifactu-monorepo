import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { listSyncConflicts, listSyncLogs } from '@/lib/integrations/accountingStore';
import {
  getTenantHoldedContext,
  listAccessRequests,
  listClaims,
} from '@/lib/integrations/holdedGovernanceService';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OPEN_CLAIM_STATUSES = new Set(['submitted', 'in_review']);

function getSummaryLimit(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get('summaryLimit') || 100);
  return Number.isFinite(raw) ? Math.min(Math.max(raw, 10), 500) : 100;
}

function getBlockedActions(availableActions: Record<string, unknown> | null | undefined) {
  if (!availableActions || typeof availableActions !== 'object') {
    return [] as Array<{ action: string; reason: string | null }>;
  }

  return Object.entries(availableActions)
    .filter(([, value]) => {
      if (!value || typeof value !== 'object') return false;
      return (value as { blocked?: boolean }).blocked === true;
    })
    .map(([action, value]) => ({
      action,
      reason:
        value &&
        typeof value === 'object' &&
        typeof (value as { reason?: unknown }).reason === 'string'
          ? ((value as { reason: string }).reason ?? null)
          : null,
    }));
}

function extractLogRequestId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const value = (data as { requestId?: unknown }).requestId;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function buildObservabilitySummary(tenantId: string, request: NextRequest) {
  const summaryLimit = getSummaryLimit(request);
  const [logs, conflicts, claims, accessRequests, context] = await Promise.all([
    listSyncLogs(tenantId, summaryLimit, null),
    listSyncConflicts(tenantId, 'quote'),
    listClaims({ tenantId, channel: 'dashboard' }),
    listAccessRequests({ tenantId, channel: 'dashboard' }),
    getTenantHoldedContext(tenantId, 'dashboard'),
  ]);

  const warnLogs = logs.filter((row) => row.level === 'warn');
  const errorLogs = logs.filter((row) => row.level === 'error');
  const incidents = logs
    .filter((row) => row.level === 'warn' || row.level === 'error')
    .slice(0, 15)
    .map((row) => ({
      source: 'sync_log',
      severity: row.level,
      message: row.message,
      createdAt: row.created_at,
      outboxId: row.outbox_id,
      requestId: extractLogRequestId(row.data),
    }));

  const openClaims = claims.filter((claim) => OPEN_CLAIM_STATUSES.has(claim.status)).length;
  const pendingAccessRequests = accessRequests.filter((item) => item.status === 'submitted').length;
  const blockedActions = getBlockedActions(
    (context.availableActions as unknown as Record<string, unknown>) ?? null
  );

  return {
    tenantId,
    summaryLimit,
    summary: {
      sync: {
        total: logs.length,
        warnings: warnLogs.length,
        errors: errorLogs.length,
      },
      conflicts: {
        quotes: conflicts.length,
      },
      claims: {
        total: claims.length,
        open: openClaims,
      },
      accessRequests: {
        total: accessRequests.length,
        pending: pendingAccessRequests,
      },
      governance: {
        flags: context.governanceFlags,
        blockedActions,
      },
    },
    incidents,
  };
}

export async function GET(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = 'dashboard';
  const mode = request.nextUrl.searchParams.get('mode')?.trim().toLowerCase() || 'list';
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-sync-logs' },
  });
  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/logs',
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
      NextResponse.json({ error: auth.error, requestId }, { status: auth.status }),
      requestId
    );
  }

  if (mode === 'summary') {
    try {
      const summary = await buildObservabilitySummary(auth.tenantId, request);

      logConnectorEvent(
        'api/integrations/accounting/logs',
        'info',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'summary',
          outcome: 'success',
          count: summary.incidents.length,
        })
      );

      return withConnectorRequestId(
        NextResponse.json({
          mode: 'summary',
          ...summary,
          requestId,
        }),
        requestId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logConnectorEvent(
        'api/integrations/accounting/logs',
        'error',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage: 'summary',
          outcome: 'exception',
          error: message,
        })
      );
      return withConnectorRequestId(
        NextResponse.json(
          { error: 'No se pudo cargar el resumen de observabilidad.', requestId },
          { status: 500 }
        ),
        requestId
      );
    }
  }

  const cursor = request.nextUrl.searchParams.get('cursor');
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

  try {
    const rows = await listSyncLogs(auth.tenantId, limit, cursor);
    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;

    logConnectorEvent(
      'api/integrations/accounting/logs',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'list',
        outcome: 'success',
        count: rows.length,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        items: rows,
        nextCursor,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logConnectorEvent(
      'api/integrations/accounting/logs',
      'error',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'list',
        outcome: 'exception',
        error: message,
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        { error: 'No se pudieron cargar los logs de sincronizacion.', requestId },
        { status: 500 }
      ),
      requestId
    );
  }
}
