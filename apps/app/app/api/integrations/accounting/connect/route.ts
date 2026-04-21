import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getAccountingIntegrationAccess } from '@/lib/billing/tenantPlan';
import {
  sendHoldedConnectionLifecycleEmails,
  sendWelcomeLifecycleEmails,
} from '@/lib/email/holdedConnectionEmails';
import { sendHighGovernanceRiskInternalAlertEmail } from '@/lib/email/holdedGovernanceEmails';
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
  buildConnectorEvent,
} from '@/lib/integrations/connectorObservability';
import { getConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';
import {
  getHoldedOnboardingTokenFromHeaders,
  isVerifiedHoldedOnboardingIdentity,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import {
  applyHoldedConnectorCompatibilityHeaders,
  resolveHoldedConnectorEntryChannel,
  resolveHoldedConnectorTenantIdHint,
} from '@/lib/integrations/holdedConnectorRequest';
import {
  assertHoldedConnectorAdminSessionAccess,
  getHoldedConnectorAdminNotice,
} from '@/lib/holdedConnectorAdmin';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { verifyHoldedValidationToken } from '@/lib/integrations/holdedValidationToken';
import { upsertAccountingIntegration } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectionStatusDto,
  buildDefaultAvailableActions,
  buildGovernanceFlags,
} from '@verifactu/integrations';

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

export async function POST(request: NextRequest) {
  const entryChannel = resolveHoldedConnectorEntryChannel(request);
  const requestId = getConnectorRequestId(request);
  const tenantIdHint = resolveHoldedConnectorTenantIdHint(request);
  const onboardingToken = getHoldedOnboardingTokenFromHeaders(request.headers);
  const onboardingSession = onboardingToken
    ? await resolveHoldedOnboardingSessionFromHeaders(request.headers)
    : null;
  let stage: 'auth' | 'access' | 'body' | 'encrypt' | 'verify' | 'probe' | 'persist' = 'auth';
  let tenantId: string | null = null;
  let resolvedUserId: string | null = null;
  let sessionUid: string | null = null;
  const respond = (response: NextResponse) =>
    applyHoldedConnectorCompatibilityHeaders(withConnectorRequestId(response, requestId), request);

  try {
    if (onboardingSession && !isVerifiedHoldedOnboardingIdentity(onboardingSession)) {
      logConnectorEvent(
        'api/integrations/accounting/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: tenantIdHint,
          entryChannel,
          stage,
          outcome: 'identity_verification_required',
        })
      );
      return respond(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            governanceFlags: null,
            availableActions: null,
            probe: null,
            warnings: [],
            requestId,
            error: 'Debes verificar tu identidad antes de conectar Holded.',
            stage,
            reason: 'identity_verification_required',
          },
          { status: 403 }
        )
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
      logConnectorEvent(
        'api/integrations/accounting/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: tenantIdHint,
          entryChannel,
          stage,
          outcome: 'auth_error',
          error: auth.error,
        })
      );
      return respond(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            governanceFlags: null,
            availableActions: null,
            probe: null,
            warnings: [],
            error: auth.error,
            requestId,
            stage,
            reason: 'auth_error',
          },
          { status: auth.status }
        )
      );
    }

    try {
      assertHoldedConnectorAdminSessionAccess(auth.session, { entryChannel });
    } catch {
      if (entryChannel !== 'chatgpt') {
        logConnectorEvent(
          'api/integrations/accounting/connect',
          'warn',
          buildConnectorEvent({
            requestId,
            tenantId: auth.tenantId,
            entryChannel,
            stage,
            outcome: 'admin_access_required',
          })
        );
        return respond(
          NextResponse.json(
            {
              ok: false,
              connection: null,
              governanceFlags: null,
              availableActions: null,
              probe: null,
              warnings: [],
              error: getHoldedConnectorAdminNotice(),
              requestId,
              stage,
              reason: 'admin_access_required',
            },
            { status: 403 }
          )
        );
      }
    }

    tenantId = auth.tenantId;
    resolvedUserId = auth.resolvedUserId ?? null;
    sessionUid = auth.session.uid ?? null;

    stage = 'access';
    const access = await getAccountingIntegrationAccess({ tenantId: auth.tenantId, entryChannel });
    if (!access.canConnect) {
      logConnectorEvent(
        'api/integrations/accounting/connect',
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
      return respond(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            governanceFlags: null,
            availableActions: null,
            probe: null,
            warnings: [],
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
        )
      );
    }

    stage = 'body';
    const body = await request.json().catch(() => ({}));
    const apiKey = typeof body?.apiKey === 'string' ? normalizeHoldedApiKey(body.apiKey) : '';
    const validationToken = typeof body?.validationToken === 'string' ? body.validationToken : '';
    const acceptedTerms = body?.acceptedTerms === true;
    const acceptedPrivacy = body?.acceptedPrivacy === true;
    const mode = body?.mode === 'reconnect' ? 'reconnect' : 'initial';

    if (!apiKey) {
      logConnectorEvent(
        'api/integrations/accounting/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage,
          outcome: 'invalid_input',
          error: 'apiKey es obligatorio',
        })
      );
      return respond(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            governanceFlags: null,
            availableActions: null,
            probe: null,
            warnings: [],
            error: 'apiKey es obligatorio',
            requestId,
            stage,
            reason: 'invalid_input',
          },
          { status: 400 }
        )
      );
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      logConnectorEvent(
        'api/integrations/accounting/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: auth.tenantId,
          entryChannel,
          stage,
          outcome: 'legal_acceptance_required',
        })
      );
      return respond(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            governanceFlags: null,
            availableActions: null,
            probe: null,
            warnings: [],
            error:
              'Debes aceptar los Terminos y la Politica de Privacidad de verifactu.business para continuar.',
            requestId,
            stage,
            reason: 'legal_acceptance_required',
          },
          { status: 400 }
        )
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

    const resolved = await resolveSharedHoldedConnectionStatusForTenant(
      auth.tenantId,
      entryChannel
    );
    const governanceFlags = buildGovernanceFlags(resolved);

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

        const confirmedCompanyEmail = await getConfirmedCompanyNotificationEmail(auth.tenantId);
        const emailContext = {
          userEmail: auth.session.email ?? null,
          userName: auth.session.name ?? null,
          tenantName: tenant?.profile?.tradeName || tenant?.name || 'tu empresa',
          tenantLegalName: tenant?.profile?.legalName || tenant?.legalName || null,
          contactName: auth.session.name ?? null,
          contactEmail: auth.session.email ?? null,
          companyEmail: confirmedCompanyEmail || tenant?.profile?.email || null,
          contactPhone: tenant?.profile?.phone || null,
        };
        const securityRecipients = await resolveHoldedSecurityAlertRecipients({
          tenantId: auth.tenantId,
          actorEmail: auth.session.email ?? null,
          actorName: auth.session.name ?? null,
          companyNotificationEmail: emailContext.companyEmail,
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

        if (governanceFlags.highGovernanceRisk) {
          await sendHighGovernanceRiskInternalAlertEmail({
            tenantName: emailContext.tenantName,
            tenantLegalName: emailContext.tenantLegalName,
            channel: entryChannel,
            actorEmail: auth.session.email ?? null,
            actorName: auth.session.name ?? null,
            companyEmail: emailContext.companyEmail,
            contactPhone: emailContext.contactPhone,
            ownershipStatus: governanceFlags.ownershipStatus,
            managedByThirdParty: governanceFlags.managedByThirdParty,
            clientAdminGap: governanceFlags.clientAdminGap,
            underClaimReview: governanceFlags.underClaimReview,
            detectedAt: legalAcceptedAt,
          });
        }
      } catch (notificationError) {
        logConnectorEvent('api/integrations/accounting/connect', 'error', {
          requestId,
          stage: 'persist',
          tenantId: auth.tenantId,
          entryChannel,
          outcome: 'notification_failed',
          message:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
          reason: 'notification_failed',
        });
      }
    }
    const connection = buildConnectionStatusDto({
      connectionId: resolved?.id ?? `${auth.tenantId}:${entryChannel}`,
      tenantId: auth.tenantId,
      status: resolved?.status ?? saved?.status ?? status,
      keyMasked: maskSecret(apiKey),
      providerAccountId: resolved?.providerAccountId ?? null,
      connectedAt: resolved?.connectedAt ?? null,
      lastValidatedAt: resolved?.lastValidatedAt ?? null,
      lastSyncAt: saved?.last_sync_at ?? resolved?.lastSyncAt ?? null,
      lastError: saved?.last_error ?? resolved?.lastError ?? normalizedError,
      originChannel: resolved?.originChannel ?? entryChannel,
      supportedModules: [],
    });
    const availableActions = buildDefaultAvailableActions({
      status: connection.status,
      underClaimReview: governanceFlags.underClaimReview,
      clientAdminGap: governanceFlags.clientAdminGap,
      highGovernanceRisk: governanceFlags.highGovernanceRisk,
    });
    const warnings = governanceFlags.clientAdminGap
      ? ['Falta responsable del cliente para cerrar la gobernanza inicial.']
      : [];

    logConnectorEvent(
      'api/integrations/accounting/connect',
      probe.ok ? 'info' : 'warn',
      buildConnectorEvent({
        requestId,
        tenantId: auth.tenantId,
        entryChannel,
        stage,
        outcome: probe.ok ? 'connected' : 'probe_failed',
        status: connection.status,
        mode,
        error: probe.ok ? null : normalizedError,
      })
    );

    return respond(
      NextResponse.json({
        ok: probe.ok,
        provider: 'holded',
        connection,
        governanceFlags,
        availableActions,
        probe,
        warnings,
        requestId,
        error: probe.ok ? null : normalizedError,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        lastError: connection.lastError,
        keyMasked: connection.keyMasked,
        mode,
      })
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
      outcome: 'exception',
      reason: 'connect_failed',
    });

    return respond(
      NextResponse.json(
        {
          ok: false,
          connection: null,
          governanceFlags: null,
          availableActions: null,
          probe: null,
          warnings: [],
          error: genericError,
          detail,
          stage,
          requestId,
          reason: 'connect_failed',
          debug: `${genericError} [${stage}] ${detail}`,
        },
        { status: 500 }
      )
    );
  }
}
