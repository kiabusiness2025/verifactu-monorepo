import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { sendPublicHighGovernanceRiskInternalAlertEmail } from '@/app/lib/communications/holded-governance-emails';
import { createCompanyEmailVerificationToken } from '@/app/lib/company-email-verification';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import {
  disconnectHoldedConnection,
  getHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { buildProfileOnboardingUrl, HOLDED_PUBLIC_URL } from '@/app/lib/holded-navigation';
import { getHoldedSession } from '@/app/lib/holded-session';
import { verifyHoldedValidationToken } from '@/app/lib/holded-validation-token';
import { prisma } from '@/app/lib/prisma';
import {
  buildConnectionStatusDto,
  buildConnectorEvent,
  buildDefaultAvailableActions,
  buildDetectedCompany,
  buildGovernanceFlags,
  getConnectorRequestId,
  logConnectorEvent,
  recordUsageEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function normalizeChannel(value: unknown) {
  return value === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function isIntegrationStorageSchemaError(error: unknown) {
  const code = (error as { code?: string } | null)?.code ?? null;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (code === 'P2022') {
    return true;
  }

  return (
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('the column') ||
    message.includes('external_connections')
  );
}

function resolveCanonicalDisconnectEndpoint() {
  const appBaseUrl =
    process.env.APP_API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://app.verifactu.business';

  return new URL('/api/integrations/accounting/disconnect', appBaseUrl).toString();
}

async function tryCanonicalDisconnect(request: NextRequest, channel: 'chatgpt' | 'dashboard') {
  const cookieHeader = request.headers.get('cookie');

  try {
    const response = await fetch(resolveCanonicalDisconnectEndpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-isaak-entry-channel': channel,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ reauthConfirmed: true }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (payload?.ok !== true) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function hasBasicApiKeyShape(value: string) {
  return value.length >= 16 && value.length <= 128;
}

function normalizeOptionalEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed || null;
}

function normalizeOptionalUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function normalizeTaxId(value: unknown) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function isValidSpanishTaxId(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nifLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';

  if (/^[0-9]{8}[A-Z]$/.test(normalized)) {
    const number = Number.parseInt(normalized.slice(0, 8), 10);
    return nifLetters[number % 23] === normalized.slice(-1);
  }

  if (/^[XYZ][0-9]{7}[A-Z]$/.test(normalized)) {
    const prefix = normalized[0] === 'X' ? '0' : normalized[0] === 'Y' ? '1' : '2';
    const number = Number.parseInt(`${prefix}${normalized.slice(1, 8)}`, 10);
    return nifLetters[number % 23] === normalized.slice(-1);
  }

  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(normalized)) {
    const letter = normalized[0];
    const digits = normalized.slice(1, 8);
    const control = normalized.slice(-1);
    let sumEven = 0;
    let sumOdd = 0;

    for (let index = 0; index < digits.length; index += 1) {
      const digit = Number.parseInt(digits[index], 10);
      if ((index + 1) % 2 === 0) {
        sumEven += digit;
      } else {
        const doubled = digit * 2;
        sumOdd += Math.floor(doubled / 10) + (doubled % 10);
      }
    }

    const total = sumEven + sumOdd;
    const controlDigit = (10 - (total % 10)) % 10;
    const controlLetter = 'JABCDEFGHI'[controlDigit];

    if ('PQRSNW'.includes(letter)) {
      return control === controlLetter;
    }

    if ('ABEH'.includes(letter)) {
      return control === String(controlDigit);
    }

    return control === String(controlDigit) || control === controlLetter;
  }

  return false;
}

function isLikelySpanishPhone(value: string) {
  const normalized = value.replace(/[^\d+]/g, '');
  if (normalized.startsWith('+34')) {
    const national = normalized.slice(3);
    return /^[6789]\d{8}$/.test(national);
  }
  if (normalized.startsWith('0034')) {
    const national = normalized.slice(4);
    return /^[6789]\d{8}$/.test(national);
  }
  return /^[6789]\d{8}$/.test(normalized);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitNameParts(value: string | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

function buildFullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

async function readExistingIdentity(tenantId: string) {
  const buildIdentity = (
    tenant: {
      name?: string | null;
      legalName?: string | null;
      nif?: string | null;
      profile?: {
        tradeName?: string | null;
        legalName?: string | null;
        taxId?: string | null;
        representative?: string | null;
        representativeRole?: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
    } | null
  ) => ({
    // Only read from TenantProfile — never fall back to tenant.name/legalName/nif.
    // Tenant fields are not cleared on disconnect (nif/legalName are cleared but name is required).
    // Using TenantProfile as the sole source ensures a blank form after disconnect.
    companyName: normalizeOptionalText(tenant?.profile?.tradeName),
    legalName: normalizeOptionalText(tenant?.profile?.legalName),
    taxId: normalizeTaxId(tenant?.profile?.taxId),
    representative: normalizeOptionalText(tenant?.profile?.representative),
    contactRole: normalizeOptionalText(tenant?.profile?.representativeRole),
    verifiedCompanyEmail: normalizeOptionalEmail(tenant?.profile?.email),
    contactPhone: normalizeOptionalText(tenant?.profile?.phone),
  });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        legalName: true,
        nif: true,
        profile: {
          select: {
            tradeName: true,
            legalName: true,
            taxId: true,
            representative: true,
            representativeRole: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return buildIdentity(tenant);
  } catch (readError) {
    console.warn('holded connect: tenant profile read with representativeRole failed', readError);
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        legalName: true,
        nif: true,
        profile: {
          select: {
            tradeName: true,
            legalName: true,
            taxId: true,
            representative: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return buildIdentity(tenant);
  } catch (fallbackError) {
    console.warn('holded connect: tenant profile fallback read failed', fallbackError);
    return buildIdentity(null);
  }
}

function resolveConnectionIdentity(input: {
  body: Record<string, unknown>;
  existing: Awaited<ReturnType<typeof readExistingIdentity>>;
  sessionName: string | null;
  sessionEmail: string | null;
}) {
  const sessionNameParts = splitNameParts(input.sessionName);
  const existingNameParts = splitNameParts(input.existing.representative);
  const requestedContactEmailRaw =
    normalizeOptionalEmail(input.body.contactEmail) ||
    normalizeOptionalEmail(input.body.notificationEmail);
  const requestedContactEmail =
    requestedContactEmailRaw && isValidEmail(requestedContactEmailRaw)
      ? requestedContactEmailRaw
      : null;

  const contactFirstName =
    normalizeOptionalText(input.body.contactFirstName) ||
    existingNameParts.firstName ||
    sessionNameParts.firstName ||
    null;
  const contactLastName =
    normalizeOptionalText(input.body.contactLastName) ||
    existingNameParts.lastName ||
    sessionNameParts.lastName ||
    null;
  const contactRole = normalizeOptionalText(input.body.contactRole) || input.existing.contactRole;
  const requestedCompanyEmail = requestedContactEmail;
  const verifiedCompanyEmail = input.existing.verifiedCompanyEmail;

  return {
    companyName:
      normalizeOptionalText(input.body.companyName) || input.existing.companyName || null,
    legalName: normalizeOptionalText(input.body.legalName) || input.existing.legalName || null,
    taxId: normalizeTaxId(input.body.taxId ?? input.body.nif) || input.existing.taxId || null,
    contactFirstName,
    contactLastName,
    contactFullName: buildFullName(contactFirstName, contactLastName),
    contactRole,
    requestedCompanyEmail,
    verifiedCompanyEmail,
    notificationEmail:
      requestedContactEmail || verifiedCompanyEmail || normalizeOptionalEmail(input.sessionEmail),
    contactPhone:
      normalizeOptionalText(input.body.contactPhone) || input.existing.contactPhone || null,
  };
}

async function persistConnectionIdentity(input: {
  tenantId: string;
  userId: string | null;
  identity: ReturnType<typeof resolveConnectionIdentity>;
}) {
  const operations: Promise<unknown>[] = [
    prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        name: input.identity.companyName || undefined,
        legalName: input.identity.legalName || input.identity.companyName || undefined,
        nif: input.identity.taxId || undefined,
        profile: {
          upsert: {
            create: {
              source: 'manual',
              tradeName: input.identity.companyName || undefined,
              legalName: input.identity.legalName || input.identity.companyName || undefined,
              taxId: input.identity.taxId || undefined,
              representative: input.identity.contactFullName || undefined,
              representativeRole: input.identity.contactRole || undefined,
              email: input.identity.verifiedCompanyEmail || undefined,
              phone: input.identity.contactPhone || undefined,
            },
            update: {
              source: 'manual',
              tradeName: input.identity.companyName || undefined,
              legalName: input.identity.legalName || input.identity.companyName || undefined,
              taxId: input.identity.taxId || undefined,
              representative: input.identity.contactFullName || undefined,
              representativeRole: input.identity.contactRole || undefined,
              email: input.identity.verifiedCompanyEmail || undefined,
              phone: input.identity.contactPhone || undefined,
            },
          },
        },
      },
    }),
  ];

  if (input.userId) {
    operations.push(
      prisma.user.update({
        where: { id: input.userId },
        data: {
          name: input.identity.contactFullName || undefined,
          firstName: input.identity.contactFirstName || undefined,
          lastName: input.identity.contactLastName || undefined,
          phone: input.identity.contactPhone || undefined,
        },
      })
    );
  }

  await Promise.all(operations);
}

async function resolveNotificationEmail(input: {
  tenantId: string;
  sessionEmail: string | null;
  requestedEmail: string | null;
}) {
  const tenantProfile = await prisma.tenantProfile.findFirst({
    where: { tenantId: input.tenantId },
    select: { email: true },
  });

  if (tenantProfile?.email?.trim()) {
    return tenantProfile.email.trim();
  }

  if (input.requestedEmail?.trim()) {
    return input.requestedEmail.trim();
  }

  if (input.sessionEmail?.trim()) {
    return input.sessionEmail.trim();
  }

  return null;
}

function readProbeSupportedModules(probe: Awaited<ReturnType<typeof probeHoldedConnection>>) {
  return [
    probe.invoiceApi.ok ? 'invoicing' : null,
    probe.accountingApi.ok ? 'accounting' : null,
    probe.crmApi.ok ? 'crm' : null,
    probe.projectsApi.ok ? 'projects' : null,
    probe.teamApi.ok ? 'team' : null,
  ].filter((value): value is string => Boolean(value));
}

export async function POST(request: NextRequest) {
  const requestId = getConnectorRequestId(request);
  try {
    const session = await getHoldedSession();

    if (!session?.tenantId) {
      logConnectorEvent(
        'api/holded/connect',
        'warn',
        buildConnectorEvent({ requestId, stage: 'auth', outcome: 'auth_required' })
      );
      return withConnectorRequestId(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            detectedCompany: null,
            governanceFlags: null,
            availableActions: null,
            warnings: [],
            nextStep: null,
            error: 'Necesitas iniciar sesion para conectar Holded.',
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
    const isChatgptFlow = channel === 'chatgpt';
    const nextTarget = normalizeOptionalUrl(body?.nextTarget);
    const existingIdentity = await readExistingIdentity(session.tenantId);
    const identity = resolveConnectionIdentity({
      body,
      existing: existingIdentity,
      sessionName: session.name || null,
      sessionEmail: session.email || null,
    });
    const requestedNotificationEmail = identity.notificationEmail;
    const validationToken = typeof body?.validationToken === 'string' ? body.validationToken : '';

    // Only validate fields explicitly provided in this request — never reject pre-filled profile data
    const explicitTaxId = normalizeTaxId(body?.taxId ?? body?.nif);
    if (explicitTaxId && !isValidSpanishTaxId(explicitTaxId)) {
      return withConnectorRequestId(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            detectedCompany: null,
            governanceFlags: null,
            availableActions: null,
            warnings: [],
            nextStep: null,
            error: 'El NIF/CIF no es valido. Corrigelo antes de continuar.',
            reason: 'invalid_tax_id',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    const explicitPhone = normalizeOptionalText(body?.contactPhone);
    if (explicitPhone && !isLikelySpanishPhone(explicitPhone)) {
      return withConnectorRequestId(
        NextResponse.json(
          {
            ok: false,
            connection: null,
            detectedCompany: null,
            governanceFlags: null,
            availableActions: null,
            warnings: [],
            nextStep: null,
            error:
              'El telefono no tiene un formato valido de Espana. Corrigelo antes de continuar.',
            reason: 'invalid_contact_phone',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    if (!apiKey) {
      logConnectorEvent(
        'api/holded/connect',
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
            connection: null,
            detectedCompany: null,
            governanceFlags: null,
            availableActions: null,
            warnings: [],
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
        'api/holded/connect',
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
            connection: null,
            detectedCompany: null,
            governanceFlags: null,
            availableActions: null,
            warnings: [],
            nextStep: null,
            error: 'La API key parece incompleta. Revisala y vuelve a pegarla.',
            reason: 'invalid_api_key',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    const validated = validationToken
      ? await verifyHoldedValidationToken({
          token: validationToken,
          tenantId: session.tenantId,
          channel,
          apiKey,
        }).catch(() => null)
      : null;

    const probe = validated?.probe ?? (await probeHoldedConnection(apiKey));

    if (!probe.ok) {
      await Promise.allSettled([
        writeHoldedActivity({
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'connection_error',
          status: 'failed',
          resourceType: 'holded_connection',
          responsePayload: {
            provider: 'holded',
            error: probe.error,
          },
        }),
        recordUsageEvent({
          prisma,
          tenantId: session.tenantId,
          userId: session.userId,
          type: 'CONNECTION_ERROR',
          source: 'holded_connect',
          path: '/api/holded/connect',
          metadataJson: {
            provider: 'holded',
            reason: probe.error || 'validation_failed',
          },
        }),
      ]);

      logConnectorEvent(
        'api/holded/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'probe',
          outcome: 'probe_failed',
          error: probe.error || 'connect_failed',
        })
      );
      return withConnectorRequestId(
        NextResponse.json(
          {
            ok: false,
            probe,
            connection: null,
            detectedCompany: buildDetectedCompany({
              companyName: identity.companyName,
              legalName: identity.legalName,
              taxId: identity.taxId,
              source: 'manual',
            }),
            governanceFlags: null,
            availableActions: null,
            warnings: [],
            nextStep: null,
            error: probe.error || 'No hemos podido validar la API key.',
            reason: 'connect_failed',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    let saved;
    try {
      saved = await saveHoldedConnection({
        tenantId: session.tenantId,
        apiKey,
        userId: session.userId,
        probe,
        channel,
      });
    } catch (persistError) {
      const persistMessage =
        persistError instanceof Error ? persistError.message : String(persistError);
      const persistCode = (persistError as { code?: string } | null)?.code;

      logConnectorEvent('api/holded/connect', 'error', {
        requestId,
        tenantId: session.tenantId,
        userId: session.userId,
        entryChannel: channel,
        stage: 'persist_connection',
        outcome: 'persist_failed',
        error: persistMessage,
        code: persistCode || null,
      });

      if (
        persistCode === 'P2002' ||
        persistMessage.toLowerCase().includes('unique constraint failed')
      ) {
        return withConnectorRequestId(
          NextResponse.json(
            {
              ok: false,
              connection: null,
              detectedCompany: buildDetectedCompany({
                companyName: identity.companyName,
                legalName: identity.legalName,
                taxId: identity.taxId,
                source: 'manual',
              }),
              governanceFlags: null,
              availableActions: null,
              warnings: [],
              nextStep: null,
              error:
                'Esta empresa ya aparece conectada con esta API key. Revisa la conexion existente o solicita acceso.',
              reason: 'duplicate_connection_conflict',
              requestId,
            },
            { status: 409 }
          ),
          requestId
        );
      }

      if (
        persistCode === 'P2025' ||
        persistMessage.toLowerCase().includes('record to update not found')
      ) {
        return withConnectorRequestId(
          NextResponse.json(
            {
              ok: false,
              connection: null,
              detectedCompany: null,
              governanceFlags: null,
              availableActions: null,
              warnings: [],
              nextStep: null,
              error:
                'No encontramos tu cuenta. Intenta cerrar sesion y volver a entrar antes de conectar.',
              reason: 'tenant_not_found',
              requestId,
            },
            { status: 404 }
          ),
          requestId
        );
      }

      if (
        persistMessage.includes('INTEGRATIONS_SECRET_KEY or SESSION_SECRET is required') ||
        persistMessage.includes('MCP_OAUTH_SECRET or SESSION_SECRET is required') ||
        persistMessage.includes('SESSION_SECRET is required')
      ) {
        return withConnectorRequestId(
          NextResponse.json(
            {
              ok: false,
              connection: null,
              detectedCompany: null,
              governanceFlags: null,
              availableActions: null,
              warnings: [],
              nextStep: null,
              error:
                'La API key es valida, pero hay una configuracion temporal pendiente del sistema. Escribe a soporte para activarla de inmediato.',
              reason: 'integration_secret_missing',
              requestId,
            },
            { status: 503 }
          ),
          requestId
        );
      }

      if (isIntegrationStorageSchemaError(persistError)) {
        return withConnectorRequestId(
          NextResponse.json(
            {
              ok: false,
              connection: null,
              detectedCompany: null,
              governanceFlags: null,
              availableActions: null,
              warnings: [],
              nextStep: null,
              error:
                'La API key es valida, pero estamos terminando una actualizacion interna del conector. Intenta de nuevo en unos minutos.',
              reason: 'integration_storage_update_pending',
              requestId,
            },
            { status: 503 }
          ),
          requestId
        );
      }

      throw persistError;
    }

    if (isChatgptFlow) {
      const detectedCompany = buildDetectedCompany({
        companyName: saved?.tenantName || identity.companyName,
        legalName: saved?.legalName || identity.legalName,
        taxId: saved?.taxId || identity.taxId,
        source: 'holded',
      });
      const connection = buildConnectionStatusDto({
        connectionId: `${session.tenantId}:${channel}`,
        tenantId: session.tenantId,
        status: saved?.connected ? 'connected' : 'disconnected',
        keyMasked: saved?.keyMasked ?? null,
        providerAccountId: saved?.providerAccountId ?? null,
        connectedAt: saved?.connectedAt ?? null,
        lastValidatedAt: saved?.connectedAt ?? null,
        lastSyncAt: saved?.connectedAt ?? null,
        lastError: null,
        originChannel: channel,
        supportedModules: saved?.supportedModules ?? [],
      });
      const governanceFlags = buildGovernanceFlags(null);
      const availableActions = buildDefaultAvailableActions({
        status: connection.status,
        underClaimReview: false,
        clientAdminGap: false,
        highGovernanceRisk: false,
      });
      let notificationEmail = null;

      try {
        notificationEmail = await resolveNotificationEmail({
          tenantId: session.tenantId,
          sessionEmail: session.email,
          requestedEmail: requestedNotificationEmail,
        });
      } catch (notificationEmailError) {
        logConnectorEvent('api/holded/connect', 'warn', {
          requestId,
          tenantId: session.tenantId,
          userId: session.userId,
          entryChannel: channel,
          stage: 'notify',
          outcome: 'notification_email_resolution_failed',
          error:
            notificationEmailError instanceof Error
              ? notificationEmailError.message
              : String(notificationEmailError),
        });
      }

      try {
        const supportedModules = readProbeSupportedModules(probe);
        const communicationTasks: Promise<unknown>[] = [
          recordUsageEvent({
            prisma,
            tenantId: session.tenantId,
            userId: session.userId,
            type: 'HOLDED_CONNECTED',
            source: 'holded_connect_public_chatgpt',
            path: '/api/holded/connect',
            metadataJson: {
              provider: 'holded',
              channel,
              requestId,
              supportedModules,
              flow: 'phase1_oauth_api_chatgpt',
              hasNotificationEmail: Boolean(notificationEmail),
              sessionEmailPresent: Boolean(session.email),
              nextTargetPresent: Boolean(nextTarget),
            },
          }),
        ];

        if (notificationEmail) {
          communicationTasks.push(
            sendHoldedConnectedCommunication({
              name:
                session.name ||
                identity.contactFirstName ||
                identity.contactFullName ||
                notificationEmail.split('@')[0],
              userEmail: notificationEmail,
              companyEmail: identity.requestedCompanyEmail || identity.verifiedCompanyEmail || null,
              companyName:
                detectedCompany?.companyName ||
                saved?.tenantName ||
                identity.companyName ||
                'tu empresa',
              supportedModules,
              channel: 'chatgpt',
              returnUrl: nextTarget,
            })
          );
        }

        const results = await Promise.allSettled(communicationTasks);
        for (const result of results) {
          if (result.status === 'rejected') {
            logConnectorEvent('api/holded/connect', 'error', {
              requestId,
              tenantId: session.tenantId,
              userId: session.userId,
              entryChannel: channel,
              stage: 'notify',
              outcome: 'post_connect_aux_failed',
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }
        }
      } catch (chatgptPostConnectError) {
        logConnectorEvent('api/holded/connect', 'error', {
          requestId,
          tenantId: session.tenantId,
          userId: session.userId,
          entryChannel: channel,
          stage: 'notify',
          outcome: 'post_connect_aux_failed',
          error:
            chatgptPostConnectError instanceof Error
              ? chatgptPostConnectError.message
              : String(chatgptPostConnectError),
        });
      }

      logConnectorEvent(
        'api/holded/connect',
        'info',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'persist',
          outcome: 'connected',
          status: connection.status,
        })
      );

      return withConnectorRequestId(
        NextResponse.json({
          ok: true,
          probe,
          connection,
          detectedCompany,
          governanceFlags,
          availableActions,
          warnings: [],
          nextStep: 'connected',
          error: null,
          notificationEmail,
          companyEmailVerificationPending: false,
          companyEmailVerified: true,
          requestId,
          legacyConnection: {
            ...saved,
            tenantName: detectedCompany?.companyName ?? saved?.tenantName ?? null,
            legalName: detectedCompany?.legalName ?? saved?.legalName ?? null,
            taxId: detectedCompany?.taxId ?? saved?.taxId ?? null,
          },
        }),
        requestId
      );
    }

    let notificationEmail = requestedNotificationEmail || normalizeOptionalEmail(session.email);
    try {
      await persistConnectionIdentity({
        tenantId: session.tenantId,
        userId: session.userId,
        identity,
      });

      notificationEmail = await resolveNotificationEmail({
        tenantId: session.tenantId,
        sessionEmail: session.email,
        requestedEmail: requestedNotificationEmail,
      });
    } catch (identityError) {
      logConnectorEvent('api/holded/connect', 'error', {
        requestId,
        tenantId: session.tenantId,
        userId: session.userId,
        entryChannel: channel,
        stage: 'persist_identity',
        outcome: 'identity_persist_failed',
        error: identityError instanceof Error ? identityError.message : String(identityError),
      });
    }

    let runtimeConnection: Awaited<ReturnType<typeof getHoldedConnection>> | null = null;
    const profileCompletionUrl = buildProfileOnboardingUrl(
      'holded_connected_email',
      buildProfileOnboardingUrl('holded_connected_email')
    );
    const mustVerifyCompanyEmail = Boolean(
      identity.requestedCompanyEmail &&
      identity.requestedCompanyEmail !== identity.verifiedCompanyEmail
    );
    const companyEmailVerificationToken = mustVerifyCompanyEmail
      ? createCompanyEmailVerificationToken({
          tenantId: session.tenantId,
          email: identity.requestedCompanyEmail!,
        })
      : null;
    const companyEmailVerificationUrl = companyEmailVerificationToken
      ? `${HOLDED_PUBLIC_URL}/api/holded/company-email/verify?token=${encodeURIComponent(
          companyEmailVerificationToken
        )}&next=${encodeURIComponent(profileCompletionUrl)}`
      : null;

    if (mustVerifyCompanyEmail && !companyEmailVerificationUrl) {
      logConnectorEvent('api/holded/connect', 'warn', {
        requestId,
        tenantId: session.tenantId,
        userId: session.userId,
        entryChannel: channel,
        stage: 'notify',
        outcome: 'company_email_verification_unavailable',
        reason: 'missing_signing_secret',
      });
    }
    let connection = buildConnectionStatusDto({
      connectionId: `${session.tenantId}:${channel}`,
      tenantId: session.tenantId,
      status: saved?.connected ? 'connected' : 'disconnected',
      keyMasked: saved?.keyMasked ?? null,
      providerAccountId: saved?.providerAccountId ?? null,
      connectedAt: saved?.connectedAt ?? null,
      lastValidatedAt: saved?.connectedAt ?? null,
      lastSyncAt: saved?.connectedAt ?? null,
      lastError: null,
      originChannel: channel,
      supportedModules: saved?.supportedModules ?? [],
    });
    let governanceFlags = buildGovernanceFlags(runtimeConnection);
    let availableActions = buildDefaultAvailableActions({
      status: connection.status,
      underClaimReview: governanceFlags.underClaimReview,
      clientAdminGap: governanceFlags.clientAdminGap,
      highGovernanceRisk: governanceFlags.highGovernanceRisk,
    });
    let detectedCompany = buildDetectedCompany({
      companyName: identity.companyName || saved?.tenantName,
      legalName: identity.legalName || saved?.legalName,
      taxId: identity.taxId || saved?.taxId,
      source: runtimeConnection ? 'holded' : 'manual',
    });
    let warnings = governanceFlags.clientAdminGap
      ? ['Falta responsable del cliente para cerrar la gobernanza inicial.']
      : [];

    try {
      const userNotificationEmail = normalizeOptionalEmail(session.email);
      const [usageEventResult, communicationResult, runtimeConnectionResult] =
        await Promise.allSettled([
          recordUsageEvent({
            prisma,
            tenantId: session.tenantId,
            userId: session.userId,
            type: 'HOLDED_CONNECTED',
            source: 'holded_connect',
            path: '/api/holded/connect',
            metadataJson: {
              provider: 'holded',
              channel,
              status: saved?.connected ? 'connected' : 'pending',
              supportedModules: readProbeSupportedModules(probe),
            },
          }),
          notificationEmail || userNotificationEmail
            ? sendHoldedConnectedCommunication({
                name:
                  identity.contactFirstName ||
                  identity.contactFullName ||
                  session.name ||
                  notificationEmail?.split('@')[0] ||
                  userNotificationEmail?.split('@')[0] ||
                  'Hola',
                userEmail: userNotificationEmail || notificationEmail!,
                companyEmail:
                  identity.requestedCompanyEmail || identity.verifiedCompanyEmail || null,
                companyName: identity.companyName || saved?.tenantName || 'tu empresa',
                supportedModules: readProbeSupportedModules(probe),
                profileCompletionUrl,
                companyEmailVerificationUrl,
              })
            : Promise.resolve(null),
          getHoldedConnection(session.tenantId, channel),
        ]);

      if (usageEventResult.status === 'rejected') {
        logConnectorEvent('api/holded/connect', 'error', {
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'persist',
          outcome: 'usage_event_failed',
          error:
            usageEventResult.reason instanceof Error
              ? usageEventResult.reason.message
              : String(usageEventResult.reason),
        });
      }

      if (communicationResult.status === 'rejected') {
        logConnectorEvent('api/holded/connect', 'error', {
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'notify',
          outcome: 'communication_email_failed',
          error:
            communicationResult.reason instanceof Error
              ? communicationResult.reason.message
              : String(communicationResult.reason),
          notificationEmail,
        });
      }

      if (!notificationEmail) {
        logConnectorEvent('api/holded/connect', 'warn', {
          requestId,
          tenantId: session.tenantId,
          userId: session.userId,
          entryChannel: channel,
          stage: 'notify',
          outcome: 'notification_email_unavailable',
        });
      }

      runtimeConnection =
        runtimeConnectionResult.status === 'fulfilled' ? runtimeConnectionResult.value : null;
      connection = buildConnectionStatusDto({
        connectionId: `${session.tenantId}:${channel}`,
        tenantId: session.tenantId,
        status: runtimeConnection?.status ?? (saved?.connected ? 'connected' : 'disconnected'),
        keyMasked: saved?.keyMasked ?? runtimeConnection?.keyMasked ?? null,
        providerAccountId: saved?.providerAccountId ?? runtimeConnection?.providerAccountId ?? null,
        connectedAt: saved?.connectedAt ?? runtimeConnection?.connectedAt ?? null,
        lastValidatedAt: runtimeConnection?.lastValidatedAt ?? saved?.connectedAt ?? null,
        lastSyncAt: runtimeConnection?.lastSyncAt ?? saved?.connectedAt ?? null,
        lastError: null,
        originChannel: runtimeConnection?.originChannel ?? channel,
        supportedModules: runtimeConnection?.supportedModules ?? saved?.supportedModules ?? [],
      });
      governanceFlags = buildGovernanceFlags(runtimeConnection);
      availableActions = buildDefaultAvailableActions({
        status: connection.status,
        underClaimReview: governanceFlags.underClaimReview,
        clientAdminGap: governanceFlags.clientAdminGap,
        highGovernanceRisk: governanceFlags.highGovernanceRisk,
      });
      detectedCompany = buildDetectedCompany({
        companyName: identity.companyName || saved?.tenantName,
        legalName: identity.legalName || saved?.legalName,
        taxId: identity.taxId || saved?.taxId,
        source: runtimeConnection ? 'holded' : 'manual',
      });
      warnings = governanceFlags.clientAdminGap
        ? ['Falta responsable del cliente para cerrar la gobernanza inicial.']
        : [];

      if (governanceFlags.highGovernanceRisk) {
        try {
          await sendPublicHighGovernanceRiskInternalAlertEmail({
            tenantName: identity.companyName || saved?.tenantName || 'tu empresa',
            tenantLegalName: identity.legalName || saved?.legalName || null,
            channel,
            actorName:
              buildFullName(identity.contactFirstName, identity.contactLastName) || session.name,
            actorEmail: notificationEmail || session.email || null,
            companyEmail: notificationEmail || null,
            contactPhone: identity.contactPhone || null,
            ownershipStatus: governanceFlags.ownershipStatus,
            managedByThirdParty: governanceFlags.managedByThirdParty,
            clientAdminGap: governanceFlags.clientAdminGap,
            underClaimReview: governanceFlags.underClaimReview,
            detectedAt: new Date(),
          });
        } catch (governanceAlertError) {
          logConnectorEvent('api/holded/connect', 'error', {
            requestId,
            tenantId: session.tenantId,
            userId: session.userId,
            entryChannel: channel,
            stage: 'notify',
            outcome: 'governance_alert_failed',
            error:
              governanceAlertError instanceof Error
                ? governanceAlertError.message
                : String(governanceAlertError),
          });
        }
      }
    } catch (postConnectError) {
      logConnectorEvent('api/holded/connect', 'error', {
        requestId,
        tenantId: session.tenantId,
        userId: session.userId,
        entryChannel: channel,
        stage: 'post_connect',
        outcome: 'post_connect_failed',
        error:
          postConnectError instanceof Error ? postConnectError.message : String(postConnectError),
      });
    }

    logConnectorEvent(
      'api/holded/connect',
      'info',
      buildConnectorEvent({
        requestId,
        tenantId: session.tenantId,
        entryChannel: channel,
        stage: 'persist',
        outcome: 'connected',
        status: connection.status,
      })
    );

    return withConnectorRequestId(
      NextResponse.json({
        ok: true,
        probe,
        connection,
        detectedCompany,
        governanceFlags,
        availableActions,
        warnings,
        nextStep: warnings.length > 0 ? 'needs_additional_admin' : 'connected',
        error: null,
        notificationEmail,
        companyEmailVerificationPending: mustVerifyCompanyEmail,
        companyEmailVerified: !mustVerifyCompanyEmail,
        requestId,
        legacyConnection: {
          ...saved,
          tenantName: identity.companyName || saved?.tenantName || null,
          legalName: identity.legalName || saved?.legalName || null,
          taxId: identity.taxId || saved?.taxId || null,
        },
      }),
      requestId
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string } | null)?.code ?? null;

    logConnectorEvent('api/holded/connect', 'error', {
      requestId,
      stage: 'exception',
      outcome: 'connect_failed',
      error: errorMessage,
      code: errorCode,
    });

    const isSchemaError = isIntegrationStorageSchemaError(error);

    return withConnectorRequestId(
      NextResponse.json(
        {
          ok: false,
          connection: null,
          detectedCompany: null,
          governanceFlags: null,
          availableActions: null,
          warnings: [],
          nextStep: null,
          error: isSchemaError
            ? 'La API key es valida, pero estamos terminando una actualizacion interna del conector. Intenta de nuevo en unos minutos.'
            : 'La conexion es valida, pero no hemos podido terminar de guardarla. Intenta de nuevo en unos segundos o escribe a soporte.',
          reason: isSchemaError ? 'integration_storage_update_pending' : 'connect_failed',
          debugError: process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
          requestId,
        },
        { status: isSchemaError ? 503 : 500 }
      ),
      requestId
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para desconectar Holded.' },
      { status: 401 }
    );
  }

  const channel = normalizeChannel(new URL(request.url).searchParams.get('channel'));

  const canonicalDisconnect = await tryCanonicalDisconnect(request, channel);
  if (canonicalDisconnect) {
    return NextResponse.json({
      ok: true,
      connection: {
        disconnected: true,
        channel,
        disconnectedAt: new Date().toISOString(),
      },
      canonicalDisconnect,
    });
  }

  const disconnected = await disconnectHoldedConnection({
    tenantId: session.tenantId,
    userId: session.userId,
    channel,
  });

  return NextResponse.json({
    ok: true,
    connection: disconnected,
  });
}
