import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectorEvent,
  buildDefaultDuplicateConflict,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { probeHoldedConnection } from '@/app/lib/holded-integration';
import { mintHoldedValidationToken } from '@/app/lib/holded-validation-token';

export const runtime = 'nodejs';

function normalizeChannel(value: unknown) {
  return value === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function hasBasicApiKeyShape(value: string) {
  return value.length >= 16 && value.length <= 128;
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    logConnectorEvent(
      'api/holded/validate',
      'warn',
      buildConnectorEvent({ requestId, stage: 'auth', outcome: 'auth_required' })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          probe: null,
          validationToken: null,
          detectedCompany: null,
          duplicateConflict: buildDefaultDuplicateConflict(),
          nextStep: null,
          error: 'Necesitas iniciar sesion para validar la API key.',
          reason: 'auth_required',
        },
        { status: 401 }
      ),
      requestId
    );
  }

  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body?.apiKey === 'string' ? normalizeApiKey(body.apiKey) : '';
  const channel = normalizeChannel(body?.channel);

  if (!apiKey) {
    logConnectorEvent(
      'api/holded/validate',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        entryChannel: channel,
        stage: 'body',
        outcome: 'invalid_api_key',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          probe: null,
          validationToken: null,
          detectedCompany: null,
          duplicateConflict: buildDefaultDuplicateConflict(),
          nextStep: null,
          error: 'Pega una API key valida de Holded.',
          reason: 'invalid_api_key',
        },
        { status: 400 }
      ),
      requestId
    );
  }

  if (!hasBasicApiKeyShape(apiKey)) {
    logConnectorEvent(
      'api/holded/validate',
      'warn',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        entryChannel: channel,
        stage: 'body',
        outcome: 'invalid_api_key',
      })
    );
    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          probe: null,
          validationToken: null,
          detectedCompany: null,
          duplicateConflict: buildDefaultDuplicateConflict(),
          nextStep: null,
          error: 'La API key parece incompleta. Revisala y vuelve a pegarla.',
          reason: 'invalid_api_key',
        },
        { status: 400 }
      ),
      requestId
    );
  }

  const probe = await probeHoldedConnection(apiKey);
  const detectedCompany = null;
  const duplicateConflict = buildDefaultDuplicateConflict();
  const validationToken = probe.ok
    ? await mintHoldedValidationToken({
        tenantId: session.tenantId,
        channel,
        apiKey,
        probe,
      })
    : null;

  logConnectorEvent(
    'api/holded/validate',
    probe.ok ? 'info' : 'warn',
    buildConnectorEvent({
      requestId,
      tenantId: session.tenantId,
      entryChannel: channel,
      stage: 'probe',
      outcome: probe.ok ? 'validated' : 'probe_failed',
      error: probe.ok ? null : probe.error || 'validation_failed',
      duplicateConflict: duplicateConflict.exists,
    })
  );

  return withConnectorRequestId(
    NextResponse.json({
      ok: probe.ok,
      probe,
      validationToken,
      detectedCompany,
      duplicateConflict,
      nextStep: probe.ok ? 'manual_completion_required' : null,
      error: probe.ok ? null : probe.error,
      reason: probe.ok ? null : 'validation_failed',
      suggestedAction: probe.ok ? null : 'Revisar la API key y volver a validar',
      requestId,
    }),
    requestId
  );
}
