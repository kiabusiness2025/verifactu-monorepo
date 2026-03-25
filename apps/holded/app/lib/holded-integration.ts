import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');

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

function pickSupportedModules(probe: HoldedProbeResult) {
  return [
    probe.invoiceApi.ok ? 'invoicing' : null,
    probe.accountingApi.ok ? 'accounting' : null,
    probe.crmApi.ok ? 'crm' : null,
    probe.projectsApi.ok ? 'projects' : null,
    probe.teamApi.ok ? 'team' : null,
  ].filter(Boolean) as string[];
}

function buildConnectionSummary(probe: HoldedProbeResult) {
  const supportedModules = pickSupportedModules(probe);

  return {
    supportedModules,
    validationSummary:
      supportedModules.length > 0
        ? `Validated modules: ${supportedModules.join(', ')}`
        : 'No Holded modules validated',
  };
}

async function fetchHoldedTenantMetadata(apiKey: string, probe: HoldedProbeResult) {
  const supportedModules = pickSupportedModules(probe);

  const [invoices, contacts, accounts] = await Promise.all([
    probe.invoiceApi.ok
      ? holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/invoicing/v1/documents', {
          limit: 3,
          page: 1,
        }).catch(() => [])
      : Promise.resolve([]),
    probe.invoiceApi.ok
      ? holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/invoicing/v1/contacts', {
          limit: 3,
          page: 1,
        }).catch(() => [])
      : Promise.resolve([]),
    probe.accountingApi.ok
      ? holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/accounting/v1/accounts', {
          limit: 3,
          page: 1,
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const firstInvoice = invoices[0] || null;
  const firstContact = contacts[0] || null;

  const companyName =
    (typeof firstInvoice?.company === 'string' && firstInvoice.company) ||
    (typeof firstInvoice?.contactName === 'string' && firstInvoice.contactName) ||
    (typeof firstContact?.name === 'string' && firstContact.name) ||
    null;

  const taxId =
    (typeof firstInvoice?.contactCode === 'string' && firstInvoice.contactCode) ||
    (typeof firstContact?.vatnumber === 'string' && firstContact.vatnumber) ||
    (typeof firstContact?.code === 'string' && firstContact.code) ||
    null;

  return {
    companyName,
    legalName: companyName,
    taxId,
    supportedModules,
    sampleCounts: {
      invoices: invoices.length,
      contacts: contacts.length,
      accounts: accounts.length,
    },
  };
}

async function writeConnectionAuditLog(input: {
  tenantId: string;
  connectionId?: string | null;
  userId?: string | null;
  action: string;
  status: string;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
}) {
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
}

async function markOnboardingCompleted(userId: string | null | undefined) {
  if (!userId) return;

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
}

export type HoldedProbeResult = {
  ok: boolean;
  invoiceApi: { ok: boolean; status: number | null };
  accountingApi: { ok: boolean; status: number | null };
  crmApi: { ok: boolean; status: number | null };
  projectsApi: { ok: boolean; status: number | null };
  teamApi: { ok: boolean; status: number | null };
  error: string | null;
};

export type HoldedConnectionRecord = {
  provider: 'holded';
  status: string;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastSyncAt: string | null;
  providerAccountId: string | null;
  keyMasked: string;
  supportedModules: string[];
  validationSummary: string | null;
  tenantName: string | null;
  legalName: string | null;
  taxId: string | null;
  apiKey?: string;
};

export async function probeHoldedConnection(apiKey: string): Promise<HoldedProbeResult> {
  const normalized = apiKey.trim();

  const [invoiceApi, accountingApi, crmApi, projectsApi, teamApi] = await Promise.all([
    probeEndpoint(normalized, '/api/invoicing/v1/documents', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/accounting/v1/accounts', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/crm/v1/bookings', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/projects/v1/projects', { limit: 1, page: 1 }),
    probeEndpoint(normalized, '/api/team/v1/employees', { limit: 1, page: 1 }),
  ]);

  const ok = invoiceApi.ok || accountingApi.ok || crmApi.ok || projectsApi.ok || teamApi.ok;

  return {
    ok,
    invoiceApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
    error: ok
      ? null
      : 'No hemos podido validar esa API key. Revisa que este activa y vuelve a intentarlo.',
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
  tenantId: string;
  apiKey: string;
  userId?: string | null;
  probe: HoldedProbeResult;
}) {
  const normalizedApiKey = input.apiKey.trim();
  const encrypted = encryptHoldedSecret(normalizedApiKey);
  const fingerprint = buildApiKeyFingerprint(normalizedApiKey);
  const now = new Date();
  const metadata = await fetchHoldedTenantMetadata(normalizedApiKey, input.probe).catch(() => ({
    companyName: null,
    legalName: null,
    taxId: null,
    supportedModules: pickSupportedModules(input.probe),
    sampleCounts: {
      invoices: 0,
      contacts: 0,
      accounts: 0,
    },
  }));
  const summary = buildConnectionSummary(input.probe);

  const [, connection] = await prisma.$transaction([
    prisma.tenantIntegration.upsert({
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
    }),
    prisma.externalConnection.upsert({
      where: {
        tenantId_provider: {
          tenantId: input.tenantId,
          provider: 'holded',
        },
      },
      update: {
        providerAccountId: fingerprint,
        credentialType: 'api_key',
        apiKeyEnc: encrypted,
        scopesGranted: summary.supportedModules,
        connectionStatus: 'connected',
        connectedByUserId: input.userId ?? undefined,
        connectedAt: now,
        lastValidatedAt: now,
        lastSyncAt: now,
      },
      create: {
        tenantId: input.tenantId,
        provider: 'holded',
        providerAccountId: fingerprint,
        credentialType: 'api_key',
        apiKeyEnc: encrypted,
        scopesGranted: summary.supportedModules,
        connectionStatus: 'connected',
        connectedByUserId: input.userId ?? undefined,
        connectedAt: now,
        lastValidatedAt: now,
        lastSyncAt: now,
      },
    }),
    prisma.tenant.update({
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
    }),
  ]);

  await markOnboardingCompleted(input.userId);

  await writeConnectionAuditLog({
    tenantId: input.tenantId,
    connectionId: connection.id,
    userId: input.userId ?? null,
    action: 'connect',
    status: 'success',
    requestPayload: {
      provider: 'holded',
      credentialType: 'api_key',
      keyMasked: maskSecret(normalizedApiKey),
    },
    responsePayload: {
      providerAccountId: fingerprint,
      supportedModules: summary.supportedModules,
      validationSummary: summary.validationSummary,
      companyName: metadata.companyName,
      taxId: metadata.taxId,
      sampleCounts: metadata.sampleCounts,
    },
  });

  return {
    connected: true,
    keyMasked: maskSecret(normalizedApiKey),
    connectedAt: now.toISOString(),
    providerAccountId: fingerprint,
    supportedModules: summary.supportedModules,
    validationSummary: summary.validationSummary,
    tenantName: metadata.companyName,
    legalName: metadata.legalName,
    taxId: metadata.taxId,
  };
}

export async function disconnectHoldedConnection(input: {
  tenantId: string;
  userId?: string | null;
}) {
  const now = new Date();

  const existing = await prisma.externalConnection.findUnique({
    where: {
      tenantId_provider: {
        tenantId: input.tenantId,
        provider: 'holded',
      },
    },
  });

  await prisma.$transaction([
    prisma.tenantIntegration.upsert({
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
    prisma.externalConnection.upsert({
      where: {
        tenantId_provider: {
          tenantId: input.tenantId,
          provider: 'holded',
        },
      },
      update: {
        apiKeyEnc: null,
        scopesGranted: [],
        connectionStatus: 'disconnected',
        lastValidatedAt: now,
        lastSyncAt: now,
      },
      create: {
        tenantId: input.tenantId,
        provider: 'holded',
        credentialType: 'api_key',
        apiKeyEnc: null,
        scopesGranted: [],
        connectionStatus: 'disconnected',
        connectedByUserId: input.userId ?? undefined,
        lastValidatedAt: now,
        lastSyncAt: now,
      },
    }),
  ]);

  await writeConnectionAuditLog({
    tenantId: input.tenantId,
    connectionId: existing?.id ?? null,
    userId: input.userId ?? null,
    action: 'disconnect',
    status: 'success',
    requestPayload: {
      provider: 'holded',
    },
    responsePayload: {
      disconnectedAt: now.toISOString(),
    },
  });

  return {
    disconnected: true,
    disconnectedAt: now.toISOString(),
  };
}

export async function getHoldedConnection(
  tenantId: string
): Promise<HoldedConnectionRecord | null> {
  const connection = await prisma.externalConnection.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider: 'holded',
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

  if (!connection?.apiKeyEnc) {
    return null;
  }

  const apiKey = decryptHoldedSecret(connection.apiKeyEnc);
  const supportedModules = connection.scopesGranted || [];

  return {
    provider: 'holded',
    status: connection.connectionStatus,
    connectedAt: connection.connectedAt?.toISOString() || null,
    lastValidatedAt: connection.lastValidatedAt?.toISOString() || null,
    lastSyncAt: connection.lastSyncAt?.toISOString() || null,
    providerAccountId: connection.providerAccountId || null,
    keyMasked: maskSecret(apiKey),
    supportedModules,
    validationSummary:
      supportedModules.length > 0 ? `Validated modules: ${supportedModules.join(', ')}` : null,
    tenantName: connection.tenant.profile?.tradeName || connection.tenant.name || null,
    legalName: connection.tenant.profile?.legalName || connection.tenant.legalName || null,
    taxId: connection.tenant.profile?.taxId || connection.tenant.nif || null,
    apiKey,
  };
}

export async function fetchHoldedSnapshot(apiKey: string) {
  const [invoices, contacts, accounts] = await Promise.all([
    holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/invoicing/v1/documents', {
      limit: 5,
      page: 1,
    }).catch(() => []),
    holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/invoicing/v1/contacts', {
      limit: 5,
      page: 1,
    }).catch(() => []),
    holdedRequest<Array<Record<string, unknown>>>(apiKey, '/api/accounting/v1/accounts', {
      limit: 5,
      page: 1,
    }).catch(() => []),
  ]);

  return {
    invoices,
    contacts,
    accounts,
  };
}
