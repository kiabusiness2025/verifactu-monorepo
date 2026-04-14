import { NextRequest, NextResponse } from 'next/server';
import {
  buildConnectorEvent,
  buildConnectionStatusDto,
  buildDefaultAvailableActions,
  buildDetectedCompany,
  buildGovernanceFlags,
  getConnectorRequestId,
  logConnectorEvent,
  recordUsageEvent,
  withConnectorRequestId,
} from '@verifactu/integrations';
import { getHoldedSession } from '@/app/lib/holded-session';
import { sendHoldedConnectedCommunication } from '@/app/lib/communications/holded-email-service';
import { verifyHoldedValidationToken } from '@/app/lib/holded-validation-token';
import {
  disconnectHoldedConnection,
  getHoldedConnection,
  probeHoldedConnection,
  saveHoldedConnection,
} from '@/app/lib/holded-integration';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { prisma } from '@/app/lib/prisma';

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

function normalizeTaxId(value: unknown) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : null;
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

  return {
    companyName:
      normalizeOptionalText(tenant?.profile?.tradeName) || normalizeOptionalText(tenant?.name),
    legalName:
      normalizeOptionalText(tenant?.profile?.legalName) || normalizeOptionalText(tenant?.legalName),
    taxId: normalizeTaxId(tenant?.profile?.taxId) || normalizeTaxId(tenant?.nif),
    representative: normalizeOptionalText(tenant?.profile?.representative),
    contactEmail: normalizeOptionalEmail(tenant?.profile?.email),
    contactPhone: normalizeOptionalText(tenant?.profile?.phone),
  };
}

function resolveConnectionIdentity(input: {
  body: Record<string, unknown>;
  existing: Awaited<ReturnType<typeof readExistingIdentity>>;
  sessionName: string | null;
  sessionEmail: string | null;
}) {
  const sessionNameParts = splitNameParts(input.sessionName);
  const existingNameParts = splitNameParts(input.existing.representative);
  const requestedContactEmail =
    normalizeOptionalEmail(input.body.contactEmail) ||
    normalizeOptionalEmail(input.body.notificationEmail);

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

  return {
    companyName:
      normalizeOptionalText(input.body.companyName) || input.existing.companyName || null,
    legalName: normalizeOptionalText(input.body.legalName) || input.existing.legalName || null,
    taxId: normalizeTaxId(input.body.taxId ?? input.body.nif) || input.existing.taxId || null,
    contactFirstName,
    contactLastName,
    contactFullName: buildFullName(contactFirstName, contactLastName),
    contactEmail:
      requestedContactEmail ||
      input.existing.contactEmail ||
      normalizeOptionalEmail(input.sessionEmail),
    contactPhone:
      normalizeOptionalText(input.body.contactPhone) || input.existing.contactPhone || null,
  };
}

function validateConnectionIdentity(identity: ReturnType<typeof resolveConnectionIdentity>) {
  if (!identity.companyName) {
    return 'Necesitamos el nombre de la empresa para crear correctamente tu espacio.';
  }

  if (!identity.taxId) {
    return 'Necesitamos el NIF/CIF de la empresa para continuar.';
  }

  if (!identity.contactFirstName || !identity.contactLastName) {
    return 'Necesitamos nombre y apellidos de la persona de contacto.';
  }

  if (!identity.contactEmail || !isValidEmail(identity.contactEmail)) {
    return 'Necesitamos un correo valido de contacto para enviarte las comunicaciones del conector.';
  }

  return null;
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
              email: input.identity.contactEmail || undefined,
              phone: input.identity.contactPhone || undefined,
            },
            update: {
              source: 'manual',
              tradeName: input.identity.companyName || undefined,
              legalName: input.identity.legalName || input.identity.companyName || undefined,
              taxId: input.identity.taxId || undefined,
              representative: input.identity.contactFullName || undefined,
              email: input.identity.contactEmail || undefined,
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
  if (input.requestedEmail?.trim()) {
    return input.requestedEmail.trim();
  }

  if (input.sessionEmail?.trim()) {
    return input.sessionEmail.trim();
  }

  const tenantProfile = await prisma.tenantProfile.findFirst({
    where: { tenantId: input.tenantId },
    select: { email: true },
  });

  return tenantProfile?.email?.trim() || null;
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
    const existingIdentity = await readExistingIdentity(session.tenantId);
    const identity = resolveConnectionIdentity({
      body,
      existing: existingIdentity,
      sessionName: session.name || null,
      sessionEmail: session.email || null,
    });
    const identityError = validateConnectionIdentity(identity);
    const requestedNotificationEmail = identity.contactEmail;
    const validationToken = typeof body?.validationToken === 'string' ? body.validationToken : '';

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

    if (identityError) {
      logConnectorEvent(
        'api/holded/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'body',
          outcome: 'manual_company_data_required',
          error: identityError,
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
            error: identityError,
            reason: 'manual_company_data_required',
          },
          { status: 400 }
        ),
        requestId
      );
    }

    if (requestedNotificationEmail && !isValidEmail(requestedNotificationEmail)) {
      logConnectorEvent(
        'api/holded/connect',
        'warn',
        buildConnectorEvent({
          requestId,
          tenantId: session.tenantId,
          entryChannel: channel,
          stage: 'body',
          outcome: 'invalid_notification_email',
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
            error: 'El correo de aviso no parece valido. Revisalo y vuelve a intentarlo.',
            reason: 'invalid_notification_email',
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
        })
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

    const saved = await saveHoldedConnection({
      tenantId: session.tenantId,
      apiKey,
      userId: session.userId,
      probe,
      channel,
    });

    await persistConnectionIdentity({
      tenantId: session.tenantId,
      userId: session.userId,
      identity,
    });

    const notificationEmail = await resolveNotificationEmail({
      tenantId: session.tenantId,
      sessionEmail: session.email,
      requestedEmail: requestedNotificationEmail,
    });

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
        notificationEmail
          ? sendHoldedConnectedCommunication({
              name:
                identity.contactFirstName ||
                identity.contactFullName ||
                session.name ||
                notificationEmail.split('@')[0] ||
                'Hola',
              email: notificationEmail,
              companyName: identity.companyName || saved?.tenantName || 'tu empresa',
              supportedModules: readProbeSupportedModules(probe),
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

    const runtimeConnection =
      runtimeConnectionResult.status === 'fulfilled' ? runtimeConnectionResult.value : null;
    const connection = buildConnectionStatusDto({
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
    const governanceFlags = buildGovernanceFlags(runtimeConnection);
    const availableActions = buildDefaultAvailableActions({
      status: connection.status,
      underClaimReview: governanceFlags.underClaimReview,
      clientAdminGap: governanceFlags.clientAdminGap,
      highGovernanceRisk: governanceFlags.highGovernanceRisk,
    });
    const detectedCompany = buildDetectedCompany({
      companyName: identity.companyName || saved?.tenantName,
      legalName: identity.legalName || saved?.legalName,
      taxId: identity.taxId || saved?.taxId,
      source: runtimeConnection ? 'holded' : 'manual',
    });
    const warnings = governanceFlags.clientAdminGap
      ? ['Falta responsable del cliente para cerrar la gobernanza inicial.']
      : [];

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
    logConnectorEvent('api/holded/connect', 'error', {
      requestId,
      stage: 'exception',
      outcome: 'connect_failed',
      error: error instanceof Error ? error.message : String(error),
    });
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
            'La API key es valida, pero no hemos podido terminar de guardarla. Intenta de nuevo en unos segundos o escribe a soporte.',
          reason: 'connect_failed',
          requestId,
        },
        { status: 500 }
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
