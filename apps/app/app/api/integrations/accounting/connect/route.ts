import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import {
  sendHoldedConnectionLifecycleEmails,
  sendWelcomeLifecycleEmails,
} from '@/lib/email/holdedConnectionEmails';
import {
  resolveHoldedSecurityAlertRecipients,
  sendHoldedSecurityAlertEmails,
} from '@/lib/email/holdedSecurityAlerts';
import {
  encryptIntegrationSecret,
  maskSecret,
  probeAccountingApiConnection,
} from '@/lib/integrations/accounting';
import {
  getConnectorRequestId,
  logConnectorEvent,
  withConnectorRequestId,
} from '@/lib/integrations/connectorObservability';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import {
  getHoldedOnboardingTokenFromHeaders,
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { verifyHoldedValidationToken } from '@/lib/integrations/holdedValidationToken';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const HOLDED_CONNECTION_LEGAL_VERSION =
  process.env.HOLDED_CONNECTION_LEGAL_VERSION?.trim() || 'holded_connection_v1';

function describeConnectError(error: unknown) {
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
      'Unknown Holded connection error'
    );
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable Holded connection error object';
    }
  }

  return String(error || 'Unknown Holded connection error');
}

function getEntryChannel(request: NextRequest) {
  const header = request.headers.get('x-isaak-entry-channel')?.trim().toLowerCase();
  return header === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function getTenantIdHint(request: NextRequest) {
  return (
    request.headers.get('x-isaak-tenant-id')?.trim() ||
    request.nextUrl.searchParams.get('tenant_id')?.trim() ||
    null
  );
}

export async function POST(request: NextRequest) {
  const entryChannel = getEntryChannel(request);
  const requestId = getConnectorRequestId(request);
  const tenantIdHint = getTenantIdHint(request);
  const onboardingToken = getHoldedOnboardingTokenFromHeaders(request.headers);
  const onboardingSession = onboardingToken
    ? await resolveHoldedOnboardingSessionFromHeaders(request.headers)
    : null;
  let stage: 'auth' | 'access' | 'body' | 'encrypt' | 'verify' | 'probe' | 'persist' = 'auth';
  let tenantId: string | null = null;
  let resolvedUserId: string | null = null;
  let sessionUid: string | null = null;

  try {
    if (onboardingSession && !isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
      return withConnectorRequestId(
        NextResponse.json(
          {
            error: 'Debes verificar tu identidad antes de conectar Holded.',
            requestId,
            stage,
            reason: 'identity_verification_required',
          },
          { status: 403 }
        ),
        requestId
      );
    }

    const auth = await requireTenantContext({
      channelType: entryChannel,
      metadata: {
        source: entryChannel === 'chatgpt' ? 'holded-first-onboarding' : 'requireTenantContext',
      },
      tenantIdHint,
      onboardingToken,
    });
    if ('error' in auth) {
      return withConnectorRequestId(
        NextResponse.json(
          { error: auth.error, requestId, stage, reason: 'auth_error' },
          { status: auth.status }
        ),
        requestId
      );
    }

    tenantId = auth.tenantId;
    resolvedUserId = auth.resolvedUserId ?? null;
    sessionUid = auth.session.uid ?? null;

    stage = 'access';
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });
    if (!access.canConnect) {
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

    stage = 'body';
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? normalizeHoldedApiKey(body.apiKey) : '';
    const validationToken = typeof body?.validationToken === 'string' ? body.validationToken : '';
    const acceptedTerms = body?.acceptedTerms === true;
    const acceptedPrivacy = body?.acceptedPrivacy === true;

    if (!apiKey) {
      return withConnectorRequestId(
        NextResponse.json(
          { error: 'apiKey es obligatorio', requestId, stage, reason: 'invalid_input' },
          { status: 400 }
        ),
        requestId
      );
    }
    if (!acceptedTerms || !acceptedPrivacy) {
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

    stage = 'encrypt';
    const encrypted = encryptIntegrationSecret(apiKey);

    stage = 'verify';
    const validated = validationToken
      ? await verifyHoldedValidationToken({
          token: validationToken,
          tenantId: auth.tenantId,
          subjectUid: auth.session.uid ?? null,
          channel: entryChannel,
          apiKey,
        })
      : null;

    stage = 'probe';
    const probe =
      validated?.probe ?? (await probeAccountingApiConnection(apiKey, { profile: entryChannel }));
    const status = probe.ok ? 'connected' : 'error';
    const normalizedError = probe.ok
      ? null
      : probe.error || 'Error de validacion de integracion Holded';

    stage = 'persist';
    const legalAcceptedAt = new Date();
    const saved = await upsertAccountingIntegration({
      tenantId: auth.tenantId,
      apiKeyEnc: encrypted,
      status,
      lastError: normalizedError,
      connectedByUserId: auth.resolvedUserId ?? null,
      channelKey: entryChannel,
      legalTermsAcceptedAt: legalAcceptedAt,
      legalPrivacyAcceptedAt: legalAcceptedAt,
      legalAcceptanceVersion: HOLDED_CONNECTION_LEGAL_VERSION,
    });

    if (probe.ok) {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: auth.tenantId },
          select: {
            name: true,
            legalName: true,
            profile: {
              select: {
                legalName: true,
                tradeName: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        const emailContext = {
          userEmail: auth.session.email ?? null,
          userName: auth.session.name ?? null,
          tenantName: tenant?.profile?.tradeName || tenant?.name || 'tu empresa',
          tenantLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
          contactName: auth.session.name ?? null,
          contactEmail: auth.session.email ?? null,
          companyEmail: tenant?.profile?.email || null,
          contactPhone: tenant?.profile?.phone || null,
        };
        const securityRecipients = await resolveHoldedSecurityAlertRecipients({
          tenantId: auth.tenantId,
          actorEmail: auth.session.email ?? null,
          actorName: auth.session.name ?? null,
        });

        if (entryChannel === 'chatgpt' && onboardingSession) {
          await sendWelcomeLifecycleEmails(emailContext);
        } else {
          await sendHoldedConnectionLifecycleEmails({
            ...emailContext,
            action: 'connected',
            channel: entryChannel,
          });
        }

        await sendHoldedSecurityAlertEmails({
          recipients: securityRecipients,
          tenantName: emailContext.tenantName,
          tenantLegalName: emailContext.tenantLegalName,
          actorEmail: auth.session.email ?? null,
          actorName: auth.session.name ?? null,
          action: 'connected',
          channel: entryChannel,
        });
      } catch (notificationError) {
        logConnectorEvent('api/integrations/accounting/connect', 'error', {
          requestId,
          stage: 'persist',
          tenantId: auth.tenantId,
          entryChannel,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
          reason: 'notification_failed',
        });
      }
    }

    return withConnectorRequestId(
      NextResponse.json({
        ok: probe.ok,
        provider: 'holded',
        status: saved?.status ?? status,
        lastSyncAt: saved?.last_sync_at ?? null,
        lastError: saved?.last_error ?? null,
        keyMasked: maskSecret(apiKey),
        probe,
        requestId,
      }),
      requestId
    );
  } catch (error) {
    const detail = describeConnectError(error);
    const genericError =
      stage === 'persist'
        ? 'No se pudo guardar la conexion de Holded'
        : 'No se pudo conectar Holded';

    logConnectorEvent('api/integrations/accounting/connect', 'error', {
      requestId,
      stage,
      entryChannel,
      tenantId,
      resolvedUserId,
      sessionUid,
      detail,
      reason: 'connect_failed',
    });

    return withConnectorRequestId(
      NextResponse.json(
        {
          error: genericError,
          detail,
          stage,
          requestId,
          reason: 'connect_failed',
          debug: `${genericError} [${stage}] ${detail}`,
        },
        { status: 500 }
      ),
      requestId
    );
  }
}
