import type { Prisma, PrismaClient } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import {
  buildHoldedProbeSummary,
  buildStoredHoldedConnectionSummary,
  pickSupportedModules,
} from './diagnostics';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');
const HOLDED_SNAPSHOT_DOCUMENT_LIMIT = Number(process.env.HOLDED_SNAPSHOT_DOCUMENT_LIMIT || '100');
const HOLDED_SNAPSHOT_DOCUMENT_PAGES = Number(process.env.HOLDED_SNAPSHOT_DOCUMENT_PAGES || '6');
const HOLDED_SNAPSHOT_CONTACT_LIMIT = Number(process.env.HOLDED_SNAPSHOT_CONTACT_LIMIT || '50');
const HOLDED_SNAPSHOT_ACCOUNT_LIMIT = Number(process.env.HOLDED_SNAPSHOT_ACCOUNT_LIMIT || '50');
const HOLDED_CHART_OF_ACCOUNTS_PATH = '/api/accounting/v1/chartofaccounts';

export type HoldedPrismaClient = Pick<
  PrismaClient,
  | '$transaction'
  | 'tenant'
  | 'tenantProfile'
  | 'tenantIntegration'
  | 'externalConnection'
  | 'externalConnectionAuditLog'
  | 'userOnboarding'
>;

export type HoldedProbeResult = {
  ok: boolean;
  invoiceApi: { ok: boolean; status: number | null };
  accountingApi: { ok: boolean; status: number | null };
  crmApi: { ok: boolean; status: number | null };
  projectsApi: { ok: boolean; status: number | null };
  teamApi: { ok: boolean; status: number | null };
  expenseApi: { ok: boolean; status: number | null };
  error: string | null;
};

export type HoldedConnectionChannel = 'dashboard' | 'chatgpt' | 'claude';

export type HoldedConnectionRecord = {
  provider: 'holded';
  channel: HoldedConnectionChannel | 'legacy';
  status: string;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  originChannel?: string | null;
  providerAccountId: string | null;
  keyMasked: string;
  supportedModules: string[];
  validationSummary: string | null;
  ownershipStatus?: string | null;
  managedByThirdParty?: boolean;
  clientAdminGap?: boolean;
  highGovernanceRisk?: boolean;
  underClaimReview?: boolean;
  technicalOperatorUserId?: string | null;
  tenantName: string | null;
  legalName: string | null;
  taxId: string | null;
  apiKey?: string;
};

function normalizeHoldedChannel(channel?: string | null): HoldedConnectionChannel {
  if (channel === 'chatgpt') return 'chatgpt';
  if (channel === 'claude') return 'claude';
  return 'dashboard';
}

function resolveTrustedTenantIdentity(input: {
  name?: string | null;
  legalName?: string | null;
  nif?: string | null;
  profile?: {
    source?: string | null;
    tradeName?: string | null;
    legalName?: string | null;
    taxId?: string | null;
  } | null;
}) {
  const profile = input.profile;

  if (profile && profile.source && profile.source !== 'holded') {
    return {
      tenantName: profile.tradeName || input.name || null,
      legalName: profile.legalName || input.legalName || null,
      taxId: profile.taxId || input.nif || null,
    };
  }

  if (!profile) {
    return {
      tenantName: input.name || null,
      legalName: input.legalName || null,
      taxId: input.nif || null,
    };
  }

  return {
    tenantName: null,
    legalName: null,
    taxId: null,
  };
}

function isMissingRelationError(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  // Prisma P2021 appears when a table expected by schema is missing.
  if (code === 'P2021') {
    return true;
  }

  // Prisma P2022 appears when a column expected by newer schema is missing in prod DB.
  // Treat it as storage schema drift so we can fall back to legacy tenantIntegration.
  if (code === 'P2022') {
    return true;
  }

  const looksLikeMissingColumn =
    normalized.includes('column') &&
    normalized.includes('does not exist') &&
    (normalized.includes('external_connections') ||
      normalized.includes('external_connection_audit_logs') ||
      normalized.includes('user_onboarding'));

  if (looksLikeMissingColumn) {
    return true;
  }

  return (
    message.includes('does not exist in the current database') ||
    message.includes('The table public.external_connections does not exist') ||
    message.includes('The table public.external_connection_audit_logs does not exist') ||
    message.includes('The table public.user_onboarding does not exist')
  );
}

function isPrimaryStorageAccessError(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (code === 'P1010') {
    return true;
  }

  const referencesPrimaryStorageTables =
    normalized.includes('external_connections') ||
    normalized.includes('external_connection_audit_logs') ||
    normalized.includes('user_onboarding') ||
    normalized.includes('tenant_integrations') ||
    normalized.includes('externalconnection') ||
    normalized.includes('externalconnectionauditlog') ||
    normalized.includes('useronboarding') ||
    normalized.includes('tenantintegration');

  return (
    referencesPrimaryStorageTables &&
    (normalized.includes('permission denied') ||
      normalized.includes('row-level security policy') ||
      normalized.includes('access denied'))
  );
}

function isPrimaryStorageUnavailableError(error: unknown) {
  return isMissingRelationError(error) || isPrimaryStorageAccessError(error);
}

function isForeignKeyConstraintError(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);

  return (
    code === 'P2003' ||
    message.includes('Foreign key constraint failed') ||
    message.toLowerCase().includes('foreign key constraint')
  );
}

function getEncryptionKey() {
  const raw =
    process.env.INTEGRATIONS_SECRET_KEY?.trim() ||
    process.env.INTEGRATION_SECRET_KEY?.trim() ||
    process.env.SESSION_SECRET?.trim();

  if (!raw) {
    throw new Error('INTEGRATIONS_SECRET_KEY or SESSION_SECRET is required');
  }

  return createHash('sha256').update(raw).digest();
}

function buildApiKeyFingerprint(apiKey: string) {
  return createHash('sha256').update(apiKey.trim()).digest('hex').slice(0, 24);
}

export function encryptHoldedSecret(plainText: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptHoldedSecret(cipherText: string) {
  const key = getEncryptionKey();
  const [ivPart, tagPart, payloadPart] = cipherText.split('.');
  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error('Invalid encrypted Holded payload');
  }

  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const payload = Buffer.from(payloadPart, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
}

function buildHoldedUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const url = new URL(path.startsWith('http') ? path : `${HOLDED_API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function probeEndpoint(apiKey: string, path: string, query?: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(path, query as Record<string, string>), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        key: apiKey,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return {
      ok: false,
      status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function holdedRequest<T>(apiKey: string, path: string, query?: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(path, query as Record<string, string>), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        key: apiKey,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    const raw = await response.text();
    const parsed = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      throw new Error(`Holded API request failed (${response.status})`);
    }

    return parsed as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function holdedRequestAllPages<T extends Record<string, unknown>>(input: {
  apiKey: string;
  path: string;
  limit: number;
  maxPages: number;
  query?: Record<string, unknown>;
}) {
  const results: T[] = [];

  const toCollection = (payload: unknown): T[] => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.documents,
      record.rows,
      record.values,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }

    return [];
  };

  for (let page = 1; page <= input.maxPages; page += 1) {
    const rawBatch = await holdedRequest<unknown>(input.apiKey, input.path, {
      ...(input.query || {}),
      limit: input.limit,
      page,
    }).catch(() => []);

    const batch = toCollection(rawBatch);

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    results.push(...batch);

    if (batch.length < input.limit) {
      break;
    }
  }

  return results;
}

async function saveTenantMetadata(
  prisma: HoldedPrismaClient,
  input: {
    tenantId: string;
    fingerprint: string;
    allowProfileSync?: boolean;
    metadata: {
      companyName: string | null;
      legalName: string | null;
      taxId: string | null;
    };
  }
) {
  if (!input.allowProfileSync) {
    return;
  }

  try {
    await prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        name: input.metadata.companyName || undefined,
        legalName: input.metadata.legalName || undefined,
        nif: input.metadata.taxId || undefined,
        profile: {
          upsert: {
            create: {
              source: 'holded',
              sourceId: input.fingerprint,
              legalName: input.metadata.legalName || input.metadata.companyName || undefined,
              tradeName: input.metadata.companyName || undefined,
              taxId: input.metadata.taxId || undefined,
            },
            update: {
              source: 'holded',
              sourceId: input.fingerprint,
              legalName: input.metadata.legalName || input.metadata.companyName || undefined,
              tradeName: input.metadata.companyName || undefined,
              taxId: input.metadata.taxId || undefined,
            },
          },
        },
      },
    });
  } catch (error) {
    console.warn('[holded integration] tenant metadata skipped', {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getTenantIntegrationFallback(prisma: HoldedPrismaClient, tenantId: string) {
  const integration = await prisma.tenantIntegration.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider: 'accounting_api',
      },
    },
    include: {
      tenant: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!integration?.apiKeyEnc) {
    return null;
  }

  return integration;
}

async function fetchHoldedTenantMetadata(apiKey: string, probe: HoldedProbeResult) {
  const supportedModules = pickSupportedModules(probe);

  const invoices = probe.invoiceApi.ok
    ? await holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/invoicing/v1/documents', {
        limit: 3,
        page: 1,
      }).catch(() => [])
    : [];

  const firstInvoice = invoices[0] || null;

  const companyName = (typeof firstInvoice?.company === 'string' && firstInvoice.company) || null;

  const taxId =
    typeof firstInvoice?.companyVat === 'string'
      ? firstInvoice.companyVat
      : typeof firstInvoice?.companyTaxId === 'string'
        ? firstInvoice.companyTaxId
        : null;

  return {
    companyName,
    legalName: companyName,
    taxId,
    reliableCompanyIdentity: Boolean(companyName),
    supportedModules,
    sampleCounts: {
      invoices: invoices.length,
      contacts: 0,
      accounts: 0,
    },
  };
}

async function writeConnectionAuditLog(
  prisma: HoldedPrismaClient,
  input: {
    tenantId: string;
    connectionId?: string | null;
    userId?: string | null;
    action: string;
    status: string;
    requestPayload?: Record<string, unknown> | null;
    responsePayload?: Record<string, unknown> | null;
  }
) {
  try {
    await prisma.externalConnectionAuditLog.create({
      data: {
        tenantId: input.tenantId,
        connectionId: input.connectionId ?? null,
        userId: input.userId ?? null,
        channelType: 'holded_public',
        action: input.action,
        resourceType: 'external_connection',
        resourceId: input.connectionId ?? null,
        status: input.status,
        requestPayload: (input.requestPayload ?? undefined) as Prisma.InputJsonValue | undefined,
        responsePayload: (input.responsePayload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.warn('[holded integration] audit log skipped', {
      action: input.action,
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function markOnboardingCompleted(
  prisma: HoldedPrismaClient,
  userId: string | null | undefined
) {
  if (!userId) return;

  try {
    await prisma.userOnboarding.upsert({
      where: { userId },
      create: {
        userId,
        completedAt: new Date(),
      },
      update: {
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn('[holded integration] onboarding completion skipped', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function probeHoldedConnection(apiKey: string): Promise<HoldedProbeResult> {
  const normalized = apiKey.trim();

  const [invoiceApi, accountingApi, crmApi, projectsApi, teamApi, expenseApi] = await Promise.all([
    probeEndpoint(normalized, '/api/invoicing/v1/documents', { limit: 1, page: 1 }),
    probeEndpoint(normalized, HOLDED_CHART_OF_ACCOUNTS_PATH, { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/crm/v1/bookings', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/projects/v1/projects', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/team/v1/employees', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/invoicing/v1/expensesaccounts', { limit: 1, page: 1 }),
  ]);

  const ok =
    invoiceApi.ok || accountingApi.ok || crmApi.ok || projectsApi.ok || teamApi.ok || expenseApi.ok;
  const diagnostics = buildHoldedProbeSummary({
    invoiceApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
    expenseApi,
  });

  return {
    ok,
    invoiceApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
    expenseApi,
    error: ok ? null : `${diagnostics.summary} ${diagnostics.nextStep}`,
  };
}

export function maskSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 8) {
    return '*'.repeat(Math.max(normalized.length, 4));
  }

  return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(normalized.length - 8, 4))}${normalized.slice(-4)}`;
}

export async function saveHoldedConnection(input: {
  prisma: HoldedPrismaClient;
  tenantId: string;
  apiKey: string;
  userId?: string | null;
  probe: HoldedProbeResult;
  channel?: HoldedConnectionChannel;
}) {
  const channel = normalizeHoldedChannel(input.channel);
  const normalizedApiKey = input.apiKey.trim();
  const encrypted = encryptHoldedSecret(normalizedApiKey);
  const fingerprint = buildApiKeyFingerprint(normalizedApiKey);
  const now = new Date();
  const metadata = await fetchHoldedTenantMetadata(normalizedApiKey, input.probe).catch(() => ({
    companyName: null,
    legalName: null,
    taxId: null,
    reliableCompanyIdentity: false,
    supportedModules: pickSupportedModules(input.probe),
    sampleCounts: {
      invoices: 0,
      contacts: 0,
      accounts: 0,
    },
  }));
  const summary = buildHoldedProbeSummary(input.probe);
  const shouldSyncTenantIdentity = channel !== 'chatgpt' && metadata.reliableCompanyIdentity;
  let connectionId: string | null = null;

  const persistPrimaryStorage = async (actorUserId?: string | null) => {
    const externalConnectionUpdate = {
      channelKey: channel,
      originChannel: channel,
      providerAccountId: fingerprint,
      credentialType: 'api_key',
      apiKeyEnc: encrypted,
      scopesGranted: summary.supportedModules,
      connectionStatus: 'connected',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: false,
      highGovernanceRisk: false,
      underClaimReview: false,
      connectedByUserId: actorUserId ?? undefined,
      technicalOperatorUserId: actorUserId ?? undefined,
      connectedAt: now,
      lastValidatedAt: now,
      lastSyncAt: now,
      disconnectedAt: null,
      revokedAt: null,
      governanceUpdatedAt: now,
      companyIdentityJson: {
        companyName: metadata.companyName,
        legalName: metadata.legalName,
        taxId: metadata.taxId,
        source: 'holded',
        reliableCompanyIdentity: metadata.reliableCompanyIdentity,
        sampleCounts: metadata.sampleCounts,
      },
    } as any;
    const externalConnectionCreate = {
      tenantId: input.tenantId,
      provider: 'holded',
      ...externalConnectionUpdate,
    } as any;

    const txResults = await input.prisma.$transaction(async (tx: any) => {
      const results: any[] = [];

      if (channel === 'dashboard') {
        results.push(
          await tx.tenantIntegration.upsert({
            where: {
              tenantId_provider: {
                tenantId: input.tenantId,
                provider: 'accounting_api',
              },
            },
            update: {
              apiKeyEnc: encrypted,
              status: 'connected',
              lastError: null,
              lastSyncAt: now,
            },
            create: {
              tenantId: input.tenantId,
              provider: 'accounting_api',
              apiKeyEnc: encrypted,
              status: 'connected',
              lastError: null,
              lastSyncAt: now,
            },
          })
        );
      }

      results.push(
        await tx.externalConnection.upsert({
          where: {
            tenantId_provider_channelKey: {
              tenantId: input.tenantId,
              provider: 'holded',
              channelKey: channel,
            },
          },
          update: externalConnectionUpdate,
          create: externalConnectionCreate,
        })
      );

      if (shouldSyncTenantIdentity) {
        results.push(
          await tx.tenant.update({
            where: { id: input.tenantId },
            data: {
              name: metadata.companyName || undefined,
              legalName: metadata.legalName || undefined,
              nif: metadata.taxId || undefined,
              profile: {
                upsert: {
                  create: {
                    source: 'holded',
                    sourceId: fingerprint,
                    legalName: metadata.legalName || metadata.companyName || undefined,
                    tradeName: metadata.companyName || undefined,
                    taxId: metadata.taxId || undefined,
                  },
                  update: {
                    source: 'holded',
                    sourceId: fingerprint,
                    legalName: metadata.legalName || metadata.companyName || undefined,
                    tradeName: metadata.companyName || undefined,
                    taxId: metadata.taxId || undefined,
                  },
                },
              },
            },
          })
        );
      }

      return results;
    });

    const connection = txResults[channel === 'dashboard' ? 1 : 0];
    connectionId = connection.id;
  };

  try {
    await persistPrimaryStorage(input.userId ?? null);
  } catch (error) {
    let persistenceError: unknown = error;

    if (input.userId && isForeignKeyConstraintError(error)) {
      console.warn('[holded integration] retrying connection persistence without user reference', {
        tenantId: input.tenantId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        await persistPrimaryStorage(null);
      } catch (retryError) {
        if (!isPrimaryStorageUnavailableError(retryError)) {
          throw retryError;
        }
        persistenceError = retryError;
      }
    }

    if (!isPrimaryStorageUnavailableError(persistenceError)) {
      throw persistenceError;
    }

    console.warn('[holded integration] using tenant integration fallback', {
      tenantId: input.tenantId,
      error:
        persistenceError instanceof Error ? persistenceError.message : String(persistenceError),
    });

    await input.prisma.tenantIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId: input.tenantId,
          provider: 'accounting_api',
        },
      },
      update: {
        apiKeyEnc: encrypted,
        status: 'connected',
        lastError: null,
        lastSyncAt: now,
      },
      create: {
        tenantId: input.tenantId,
        provider: 'accounting_api',
        apiKeyEnc: encrypted,
        status: 'connected',
        lastError: null,
        lastSyncAt: now,
      },
    });

    await saveTenantMetadata(input.prisma, {
      tenantId: input.tenantId,
      fingerprint,
      allowProfileSync: shouldSyncTenantIdentity,
      metadata: {
        companyName: metadata.companyName,
        legalName: metadata.legalName,
        taxId: metadata.taxId,
      },
    });
  }

  await markOnboardingCompleted(input.prisma, input.userId);

  await writeConnectionAuditLog(input.prisma, {
    tenantId: input.tenantId,
    connectionId,
    userId: input.userId ?? null,
    action: 'connect',
    status: 'success',
    requestPayload: {
      provider: 'holded',
      channel,
      credentialType: 'api_key',
      keyMasked: maskSecret(normalizedApiKey),
    },
    responsePayload: {
      providerAccountId: fingerprint,
      supportedModules: summary.supportedModules,
      validationSummary: summary.summary,
      companyName: metadata.companyName,
      taxId: metadata.taxId,
      sampleCounts: metadata.sampleCounts,
    },
  });

  return {
    connected: true,
    channel,
    keyMasked: maskSecret(normalizedApiKey),
    connectedAt: now.toISOString(),
    providerAccountId: fingerprint,
    supportedModules: summary.supportedModules,
    validationSummary: summary.summary,
    tenantName: metadata.companyName,
    legalName: metadata.legalName,
    taxId: metadata.taxId,
  };
}

export async function disconnectHoldedConnection(input: {
  prisma: HoldedPrismaClient;
  tenantId: string;
  userId?: string | null;
  channel?: HoldedConnectionChannel;
}) {
  const channel = normalizeHoldedChannel(input.channel);
  const now = new Date();
  let existing: { id: string } | null = null;

  try {
    existing = await input.prisma.externalConnection.findUnique({
      where: {
        tenantId_provider_channelKey: {
          tenantId: input.tenantId,
          provider: 'holded',
          channelKey: channel,
        },
      },
      select: { id: true },
    });

    await input.prisma.$transaction([
      ...(channel === 'dashboard'
        ? [
            input.prisma.tenantIntegration.upsert({
              where: {
                tenantId_provider: {
                  tenantId: input.tenantId,
                  provider: 'accounting_api',
                },
              },
              update: {
                apiKeyEnc: null,
                status: 'disconnected',
                lastError: null,
                lastSyncAt: now,
              },
              create: {
                tenantId: input.tenantId,
                provider: 'accounting_api',
                apiKeyEnc: null,
                status: 'disconnected',
                lastError: null,
                lastSyncAt: now,
              },
            }),
          ]
        : []),
      input.prisma.externalConnection.upsert({
        where: {
          tenantId_provider_channelKey: {
            tenantId: input.tenantId,
            provider: 'holded',
            channelKey: channel,
          },
        },
        update: {
          apiKeyEnc: null,
          providerAccountId: null,
          scopesGranted: [],
          connectionStatus: 'disconnected',
          connectedByUserId: null,
          technicalOperatorUserId: input.userId ?? undefined,
          lastValidatedAt: now,
          lastSyncAt: now,
          disconnectedAt: now,
          revokedAt: null,
          companyIdentityJson: null,
          legalTermsAcceptedAt: null,
          legalPrivacyAcceptedAt: null,
          legalAcceptanceVersion: null,
          lastError: null,
          governanceUpdatedAt: now,
        } as any,
        create: {
          tenantId: input.tenantId,
          provider: 'holded',
          channelKey: channel,
          originChannel: channel,
          credentialType: 'api_key',
          apiKeyEnc: null,
          scopesGranted: [],
          connectionStatus: 'disconnected',
          ownershipStatus: 'pending_confirmation',
          managedByThirdParty: false,
          highGovernanceRisk: false,
          underClaimReview: false,
          connectedByUserId: input.userId ?? undefined,
          technicalOperatorUserId: input.userId ?? undefined,
          lastValidatedAt: now,
          lastSyncAt: now,
          disconnectedAt: now,
          governanceUpdatedAt: now,
        } as any,
      }),
    ]);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    console.warn('[holded integration] disconnect fallback', {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (channel !== 'dashboard') {
      throw error;
    }

    await input.prisma.tenantIntegration.upsert({
      where: {
        tenantId_provider: {
          tenantId: input.tenantId,
          provider: 'accounting_api',
        },
      },
      update: {
        apiKeyEnc: null,
        status: 'disconnected',
        lastError: null,
        lastSyncAt: now,
      },
      create: {
        tenantId: input.tenantId,
        provider: 'accounting_api',
        apiKeyEnc: null,
        status: 'disconnected',
        lastError: null,
        lastSyncAt: now,
      },
    });
  }

  // Complete identity reset on disconnect so reconnection starts with a blank form.
  // Delete the TenantProfile record entirely (it will be re-created on next connect).
  // Also clear legalName and nif from Tenant since those were populated from Holded.
  await Promise.allSettled([
    input.prisma.tenantProfile
      .deleteMany({ where: { tenantId: input.tenantId } })
      .catch(() => null),
    input.prisma.tenant
      .update({
        where: { id: input.tenantId },
        data: { legalName: null, nif: null },
      })
      .catch(() => null),
  ]);

  await writeConnectionAuditLog(input.prisma, {
    tenantId: input.tenantId,
    connectionId: existing?.id ?? null,
    userId: input.userId ?? null,
    action: 'disconnect',
    status: 'success',
    requestPayload: {
      provider: 'holded',
      channel,
    },
    responsePayload: {
      disconnectedAt: now.toISOString(),
    },
  });

  return {
    disconnected: true,
    channel,
    disconnectedAt: now.toISOString(),
  };
}

export async function getHoldedConnection(input: {
  prisma: HoldedPrismaClient;
  tenantId: string;
  channel?: HoldedConnectionChannel;
}): Promise<HoldedConnectionRecord | null> {
  const channel = normalizeHoldedChannel(input.channel);
  let connection;
  try {
    connection = await input.prisma.externalConnection.findUnique({
      where: {
        tenantId_provider_channelKey: {
          tenantId: input.tenantId,
          provider: 'holded',
          channelKey: channel,
        },
      },
      include: {
        tenant: {
          include: {
            profile: true,
          },
        },
      },
    });
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn('[holded integration] external connection storage unavailable', {
        tenantId: input.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        if (channel !== 'dashboard') return null;

        const integration = await getTenantIntegrationFallback(input.prisma, input.tenantId);
        if (!integration?.apiKeyEnc) return null;

        const apiKey = decryptHoldedSecret(integration.apiKeyEnc);
        return {
          provider: 'holded',
          channel: 'legacy',
          status: integration.status,
          connectedAt: null,
          lastValidatedAt: null,
          lastSyncAt: integration.lastSyncAt?.toISOString() || null,
          providerAccountId: null,
          keyMasked: maskSecret(apiKey),
          supportedModules: [],
          validationSummary: 'Conexion guardada en modo compatible',
          ...resolveTrustedTenantIdentity({
            name: integration.tenant.name,
            legalName: integration.tenant.legalName,
            nif: integration.tenant.nif,
            profile: integration.tenant.profile,
          }),
          apiKey,
        };
      } catch (fallbackError) {
        console.warn('[holded integration] fallback connection read failed', {
          tenantId: input.tenantId,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
        return null;
      }
    }

    console.warn('[holded integration] failed to read connection', {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!connection?.apiKeyEnc) {
    return null;
  }
  const typedConnection = connection as typeof connection & {
    originChannel?: string | null;
    ownershipStatus?: string | null;
    managedByThirdParty?: boolean | null;
    clientAdminGap?: boolean | null;
    highGovernanceRisk?: boolean | null;
    underClaimReview?: boolean | null;
    technicalOperatorUserId?: string | null;
  };

  let apiKey: string;
  try {
    apiKey = decryptHoldedSecret(connection.apiKeyEnc);
  } catch (error) {
    console.warn('[holded integration] failed to decrypt stored api key', {
      tenantId: input.tenantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  const supportedModules = connection.scopesGranted || [];

  return {
    provider: 'holded',
    channel,
    status: connection.connectionStatus,
    connectedAt: connection.connectedAt?.toISOString() || null,
    lastValidatedAt: connection.lastValidatedAt?.toISOString() || null,
    lastSyncAt: connection.lastSyncAt?.toISOString() || null,
    originChannel: typedConnection.originChannel ?? channel,
    providerAccountId: connection.providerAccountId || null,
    keyMasked: maskSecret(apiKey),
    supportedModules,
    validationSummary: buildStoredHoldedConnectionSummary(supportedModules),
    ownershipStatus: typedConnection.ownershipStatus ?? null,
    managedByThirdParty: typedConnection.managedByThirdParty ?? false,
    clientAdminGap: typedConnection.clientAdminGap ?? false,
    highGovernanceRisk: typedConnection.highGovernanceRisk ?? false,
    underClaimReview: typedConnection.underClaimReview ?? false,
    technicalOperatorUserId: typedConnection.technicalOperatorUserId ?? null,
    ...resolveTrustedTenantIdentity({
      name: connection.tenant.name,
      legalName: connection.tenant.legalName,
      nif: connection.tenant.nif,
      profile: connection.tenant.profile,
    }),
    apiKey,
  };
}

export async function fetchHoldedSnapshot(apiKey: string) {
  const toCollection = <T extends Record<string, unknown>>(payload: unknown) => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (!payload || typeof payload !== 'object') {
      return [] as T[];
    }

    const record = payload as Record<string, unknown>;
    const candidates = [
      record.items,
      record.data,
      record.results,
      record.documents,
      record.docs,
      record.invoices,
      record.entries,
      record.rows,
      record.values,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }

    return [] as T[];
  };

  const loadInvoices = async (query?: Record<string, unknown>) =>
    holdedRequestAllPages<Record<string, unknown>>({
      apiKey,
      path: '/api/invoicing/v1/documents',
      limit: HOLDED_SNAPSHOT_DOCUMENT_LIMIT,
      maxPages: HOLDED_SNAPSHOT_DOCUMENT_PAGES,
      query,
    }).catch(() => []);

  let invoices = await loadInvoices();

  if (invoices.length === 0) {
    const invoiceQueryFallbacks: Array<Record<string, unknown>> = [
      { docType: 'invoice' },
      { doctype: 'invoice' },
      { type: 'invoice' },
      { documentType: 'invoice' },
    ];

    for (const query of invoiceQueryFallbacks) {
      const batch = await loadInvoices(query);
      if (batch.length > 0) {
        invoices = batch;
        break;
      }
    }
  }

  const [contacts, accounts] = await Promise.all([
    holdedRequest<unknown>(apiKey, '/api/invoicing/v1/contacts', {
      limit: HOLDED_SNAPSHOT_CONTACT_LIMIT,
      page: 1,
    })
      .then((payload) => toCollection<Record<string, unknown>>(payload))
      .catch(() => []),
    holdedRequest<unknown>(apiKey, HOLDED_CHART_OF_ACCOUNTS_PATH, {
      limit: HOLDED_SNAPSHOT_ACCOUNT_LIMIT,
      page: 1,
    })
      .then((payload) => toCollection<Record<string, unknown>>(payload))
      .catch(() => []),
  ]);

  if (invoices.length === 0) {
    const samplePayload = await holdedRequest<unknown>(apiKey, '/api/invoicing/v1/documents', {
      limit: 1,
      page: 1,
    }).catch(() => null);

    const payloadShape = Array.isArray(samplePayload)
      ? 'array'
      : samplePayload && typeof samplePayload === 'object'
        ? `object:${Object.keys(samplePayload as Record<string, unknown>).join(',')}`
        : typeof samplePayload;

    console.warn('[holded integration] invoice snapshot empty after fallbacks', {
      payloadShape,
      contacts: contacts.length,
      accounts: accounts.length,
    });
  }

  return {
    invoices,
    contacts,
    accounts,
  };
}
