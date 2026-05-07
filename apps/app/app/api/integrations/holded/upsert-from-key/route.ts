/**
 * POST /api/integrations/holded/upsert-from-key
 *
 * Endpoint común F1.1 de la arquitectura unificada de conectores Holded.
 * A diferencia de `/api/integrations/accounting/connect`, este endpoint NO
 * exige una sesión Firebase ni un tenant context preexistente: recibe el email
 * personal + la API key + el canal y se encarga de crear (o reutilizar) toda
 * la jerarquía User -> Tenant -> Membership -> ExternalConnection.
 *
 * Body:
 * {
 *   personalEmail: string,        // requerido
 *   personalName?: string,
 *   holdedApiKey: string,         // requerido
 *   channel: 'chatgpt' | 'mobile' | 'claude' | 'dashboard',
 *   acceptedTerms: true,
 *   acceptedPrivacy: true,
 *   source?: string,
 *   companyName?: string,
 *   companyLegalName?: string,
 *   companyTaxId?: string,
 *   companyEmail?: string,
 *   companyPhone?: string
 * }
 *
 * Devuelve:
 * 200 { ok: true, userId, tenantId, connectionId, status, probe, legalAcceptedAt }
 * 400 { ok: false, stage: 'input', reason: ... }
 * 422 { ok: false, stage: 'probe',  reason: ... }
 * 500 { ok: false, stage: 'persist'|'notify', reason: ... }
 *
 * Este endpoint NO mintea sesión: el wrapper de F2 (`/api/auth/holded-direct`)
 * lo usa para luego setear la cookie `.verifactu.business` propia. La consent
 * screen del MCP de Claude (F3) lo usa para luego emitir su authorization code.
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  upsertHoldedConnectionFromApiKey,
  type HoldedConnectionUpsertChannel,
} from '@/lib/integrations/holdedConnectionUpsert';
import {
  buildConnectorEvent,
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';

export const runtime = 'nodejs';

const VALID_CHANNELS: HoldedConnectionUpsertChannel[] = [
  'dashboard',
  'chatgpt',
  'mobile',
  'claude',
];

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readChannel(value: unknown): HoldedConnectionUpsertChannel | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase() as HoldedConnectionUpsertChannel;
  return VALID_CHANNELS.includes(normalized) ? normalized : null;
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  const respond = (response: NextResponse) => withConnectorRequestId(response, requestId);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logConnectorEvent(
      'api/integrations/holded/upsert-from-key',
      'warn',
      buildConnectorEvent({
        requestId,
        outcome: 'invalid_json',
        stage: 'input',
      })
    );
    return respond(
      NextResponse.json(
        {
          ok: false,
          stage: 'input',
          reason: 'invalid_json',
          detail: 'Request body must be valid JSON',
          requestId,
        },
        { status: 400 }
      )
    );
  }

  const channel = readChannel(body.channel);
  if (!channel) {
    return respond(
      NextResponse.json(
        {
          ok: false,
          stage: 'input',
          reason: 'invalid_channel',
          detail: `channel must be one of: ${VALID_CHANNELS.join(', ')}`,
          requestId,
        },
        { status: 400 }
      )
    );
  }

  const result = await upsertHoldedConnectionFromApiKey({
    personalEmail: readString(body.personalEmail) ?? '',
    personalName: readString(body.personalName) ?? null,
    holdedApiKey: readString(body.holdedApiKey) ?? '',
    channel,
    acceptedTerms: body.acceptedTerms === true,
    acceptedPrivacy: body.acceptedPrivacy === true,
    source: readString(body.source) ?? null,
    companyName: readString(body.companyName) ?? null,
    companyLegalName: readString(body.companyLegalName) ?? null,
    companyTaxId: readString(body.companyTaxId) ?? null,
    companyEmail: readString(body.companyEmail) ?? null,
    companyPhone: readString(body.companyPhone) ?? null,
  });

  if (!result.ok) {
    const status = result.stage === 'input' ? 400 : result.stage === 'probe' ? 422 : 500;

    logConnectorEvent(
      'api/integrations/holded/upsert-from-key',
      'warn',
      buildConnectorEvent({
        requestId,
        entryChannel: channel,
        stage: result.stage,
        outcome: result.reason,
        error: result.detail ?? null,
      })
    );

    return respond(
      NextResponse.json(
        {
          ok: false,
          stage: result.stage,
          reason: result.reason,
          detail: result.detail,
          probe: result.probe ?? null,
          requestId,
        },
        { status }
      )
    );
  }

  logConnectorEvent(
    'api/integrations/holded/upsert-from-key',
    'info',
    buildConnectorEvent({
      requestId,
      entryChannel: channel,
      tenantId: result.tenantId,
      stage: 'persist',
      outcome: 'connected',
      status: result.status,
    })
  );

  return respond(
    NextResponse.json(
      {
        ok: true,
        userId: result.userId,
        tenantId: result.tenantId,
        connectionId: result.connectionId,
        status: result.status,
        probe: result.probe,
        legalAcceptedAt: result.legalAcceptedAt,
        created: result.created,
        requestId,
      },
      { status: 200 }
    )
  );
}
