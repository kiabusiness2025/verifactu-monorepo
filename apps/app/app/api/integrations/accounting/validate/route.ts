import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import { maskSecret, probeAccountingApiConnection } from '@/lib/integrations/accounting';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
  buildConnectorEvent,
} from '@/lib/integrations/connectorObservability';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import {
  getHoldedOnboardingTokenFromHeaders,
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { mintHoldedValidationToken } from '@/lib/integrations/holdedValidationToken';
import { getSessionPayload } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function describeValidateError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
    };
    return (
      [candidate.message, candidate.code, candidate.detail, candidate.constraint, candidate.table]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' | ') ||
      candidate.name ||
      'Unknown Holded validation error'
    );
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable Holded validation error object';
    }
  }

  return String(error || 'Unknown Holded validation error');
}

function getEntryChannel(request: NextRequest) {
  const header = (
    request.headers.get('x-holded-entry-channel') || request.headers.get('x-isaak-entry-channel')
  )
    ?.trim()
    .toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function getTenantIdHint(request: NextRequest) {
  return (
    request.headers.get('x-holded-tenant-id')?.trim() ||
    request.headers.get('x-isaak-tenant-id')?.trim() ||
    request.nextUrl.searchParams.get('tenant_id')?.trim() ||
    null
  );
}

export async function POST(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const requestId = getConnectorRequestId(request);
  const onboardingToken = getHoldedOnboardingTokenFromHeaders(request.headers);
  const tenantIdHint = getTenantIdHint(request);
  let stage: 'auth' | 'access' | 'body' | 'probe' = 'auth';

  try {
    const signedSession = await getSessionPayload();
    const onboardingSession =
      entryChannel === 'chatgpt'
        ? await resolveHoldedOnboardingSessionFromHeaders(request.headers)
        : null;

    if (onboardingSession && !isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
      return withConnectorRequestId(
        NextResponse.json(
          {
            error: 'Debes verificar tu identidad antes de validar la API key de Holded.',
            requestId,
            stage,
            reason: 'identity_verification_required',
          },
          { status: 403 }
        ),
        requestId
      );
    }

    const auth =
      onboardingSession && !signedSession?.uid
        ? null
        : await requireTenantContext({
            channelType: entryChannel,
            metadata: {
              source: entryChannel === 'chatgpt' ? 'holded-validation' : 'requireTenantContext',
            },
            tenantIdHint,
            onboardingToken,
          });

    if (auth && 'error' in auth) {
      logConnectorEvent(
        'api/integrations/accounting/validate',
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
      return withConnectorRequestId(
        NextResponse.json(
          { error: auth.error, requestId, stage, reason: 'auth_error' },
          { status: auth.status }
        ),
        requestId
      );
    }

    if (auth) {
      stage = 'access';
      const access = await getAccountingIntegrationAccess({
        tenantId: auth.tenantId,
        entryChannel,
      });
      if (!access.canConnect) {
        logConnectorEvent(
          'api/integrations/accounting/validate',
          'warn',
          buildConnectorEvent({
            requestId,
            tenantId: auth.tenantId,
            entryChannel,
            stage,
            outcome: 'plan_access_denied',
            planCode: access.planCode ?? null,
          })
        );
        return withConnectorRequestId(
          NextResponse.json(
            {
              error:
                'La integracion con tu programa de contabilidad via API es opcional y esta disponible en planes Empresa y PRO.',
              plan: access.planCode ?? 'unknown',
              allowedPlans: ['empresa', 'pro'],
              connectionMode: access.connectionMode,
              requestId,
              stage,
              reason: 'plan_access_denied',
            },
            { status: 403 }
          ),
          requestId
        );
      }
    } else if (!onboardingSession) {
      return withConnectorRequestId(
        NextResponse.json(
          { error: 'Unauthorized', requestId, stage, reason: 'auth_error' },
          { status: 401 }
        ),
        requestId
      );
    }

    stage = 'body';
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? normalizeHoldedApiKey(body.apiKey) : '';
    const acceptedTerms = body?.acceptedTerms === true;
    const acceptedPrivacy = body?.acceptedPrivacy === true;

    if (!apiKey) {
      logConnectorEvent(
        'api/integrations/accounting/validate',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth && !('error' in auth) ? auth.tenantId : tenantIdHint,
          entryChannel,
          stage,
          outcome: 'invalid_input',
          error: 'apiKey es obligatorio',
        })
      );
      return withConnectorRequestId(
        NextResponse.json(
          { error: 'apiKey es obligatorio', requestId, stage, reason: 'invalid_input' },
          { status: 400 }
        ),
        requestId
      );
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      logConnectorEvent(
        'api/integrations/accounting/validate',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth && !('error' in auth) ? auth.tenantId : tenantIdHint,
          entryChannel,
          stage,
          outcome: 'legal_acceptance_required',
        })
      );
      return withConnectorRequestId(
        NextResponse.json(
          {
            error:
              'Debes aceptar los Terminos y la Politica de Privacidad de verifactu.business para continuar.',
            requestId,
            stage,
            reason: 'legal_acceptance_required',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    stage = 'probe';
    const probe = await probeAccountingApiConnection(apiKey, { profile: entryChannel });
    const validationToken = probe.ok
      ? await mintHoldedValidationToken({
          tenantId: auth?.tenantId ?? null,
          subjectUid: auth?.session.uid ?? onboardingSession?.uid ?? null,
          channel: entryChannel,
          apiKey,
          probe,
        })
      : null;

    logConnectorEvent(
      'api/integrations/accounting/validate',
      probe.ok ? 'info' : 'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth && !('error' in auth) ? auth.tenantId : tenantIdHint,
        entryChannel,
        stage,
        outcome: probe.ok ? 'validated' : 'probe_failed',
        error: probe.ok ? null : probe.error || 'validation_failed',
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: probe.ok,
        provider: 'holded',
        keyMasked: maskSecret(apiKey),
        probe,
        validationToken,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const detail = describeValidateError(error);

    logConnectorEvent('api/integrations/accounting/validate', 'error', {
      requestId,
      stage,
      entryChannel,
      outcome: 'exception',
      detail,
    });

    return withConnectorRequestId(
      NextResponse.json(
        {
          error: 'No se pudo validar la API key de Holded',
          detail,
          stage,
          requestId,
          reason: 'validate_failed',
          debug: `No se pudo validar la API key de Holded [${stage}] ${detail}`,
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
