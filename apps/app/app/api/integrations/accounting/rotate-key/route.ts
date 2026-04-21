import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  encryptIntegrationSecret,
  probeAccountingApiConnection,
} from '@/lib/integrations/accounting';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import {
  applyHoldedConnectorCompatibilityHeaders,
  resolveHoldedConnectorEntryChannel,
} from '@/lib/integrations/holdedConnectorRequest';
import { verifyHoldedValidationToken } from '@/lib/integrations/holdedValidationToken';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectionStatusDto,
  buildGovernanceFlags,
  type AccountingRotateKeyResponse,
} from '@verifactu/integrations';

export const runtime = 'nodejs';

const HOLDED_CONNECTION_LEGAL_VERSION =
  process.env.HOLDED_CONNECTION_LEGAL_VERSION?.trim() || 'holded_connection_v1';

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);
  const auth = await requireTenantContext({
    channelType: entryChannel,
    metadata: { source: 'holded-rotate-key' },
  });

  if ('error' in auth) {
    logConnectorEvent(
      'api/integrations/accounting/rotate-key',
      'warn',
      buildConnectorEvent({
        requestId,
        entryChannel,
        stage: 'auth',
        outcome: 'auth_error',
        error: auth.error,
      })
    );
    return respond(
      NextResponse.json({ ok: false, error: auth.error, requestId }, { status: auth.status })
    );
  }

  try {
    assertHoldedConnectorAdminSessionAccess(auth.session, { entryChannel });
  } catch {
    logConnectorEvent(
      'api/integrations/accounting/rotate-key',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'auth',
        outcome: 'admin_access_required',
      })
    );
    return respond(
      NextResponse.json(
        { ok: false, error: getHoldedConnectorAdminNotice(), requestId },
        { status: 403 }
      )
    );
  }

  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body?.apiKey === 'string' ? normalizeHoldedApiKey(body.apiKey) : '';
  const validationToken = typeof body?.validationToken === 'string' ? body.validationToken : '';
  const reauthConfirmed = body?.reauthConfirmed === true;

  if (!reauthConfirmed) {
    logConnectorEvent(
      'api/integrations/accounting/rotate-key',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'missing_reauth',
      })
    );
    return respond(
      NextResponse.json(
        { ok: false, error: 'Debes confirmar la accion antes de rotar la API key.', requestId },
        { status: 400 }
      )
    );
  }

  if (!apiKey) {
    logConnectorEvent(
      'api/integrations/accounting/rotate-key',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage: 'body',
        outcome: 'invalid_input',
        error: 'apiKey es obligatorio',
      })
    );
    return respond(
      NextResponse.json({ ok: false, error: 'apiKey es obligatorio', requestId }, { status: 400 })
    );
  }

  const validated = validationToken
    ? await verifyHoldedValidationToken({
        token: validationToken,
        tenantId: auth.tenantId,
        subjectUid: auth.session.uid ?? null,
        channel: entryChannel,
        apiKey,
      })
    : null;

  const probe =
    validated?.probe ?? (await probeAccountingApiConnection(apiKey, { profile: entryChannel }));
  const status = probe.ok ? 'connected' : 'error';
  const normalizedError = probe.ok ? null : probe.error || 'Error de validacion de Holded';

  await upsertAccountingIntegration({
    tenantId: auth.tenantId,
    apiKeyEnc: encryptIntegrationSecret(apiKey),
    status,
    lastError: normalizedError,
    connectedByUserId: auth.resolvedUserId ?? null,
    channelKey: entryChannel,
    legalTermsAcceptedAt: new Date(),
    legalPrivacyAcceptedAt: new Date(),
    legalAcceptanceVersion: HOLDED_CONNECTION_LEGAL_VERSION,
  });

  const resolved = await resolveSharedHoldedConnectionStatusForTenant(auth.tenantId, entryChannel);
  const connection = buildConnectionStatusDto({
    connectionId: resolved?.id ?? `${auth.tenantId}:${entryChannel}`,
    tenantId: auth.tenantId,
    status: resolved?.status ?? status,
    keyMasked: null,
    providerAccountId: resolved?.providerAccountId ?? null,
    connectedAt: resolved?.connectedAt ?? null,
    lastValidatedAt: resolved?.lastValidatedAt ?? null,
    lastSyncAt: resolved?.lastSyncAt ?? null,
    lastError: resolved?.lastError ?? normalizedError,
    originChannel: resolved?.originChannel ?? entryChannel,
    supportedModules: [],
  });
  const governanceFlags = buildGovernanceFlags(resolved);

  logConnectorEvent(
    'api/integrations/accounting/rotate-key',
    probe.ok ? 'info' : 'warn',
    buildConnectorEvent({
      requestId,
      tenantId: auth.tenantId,
      entryChannel,
      stage: 'persist',
      outcome: probe.ok ? 'rotated' : 'probe_failed',
      status: connection.status,
      error: probe.ok ? null : normalizedError,
    })
  );

  return respond(
    NextResponse.json({
      ok: probe.ok,
      connection,
      governanceFlags,
      event: 'api_rotated',
      requestId,
      error: probe.ok ? null : normalizedError,
    } satisfies AccountingRotateKeyResponse & { requestId: string; error: string | null })
  );
}
