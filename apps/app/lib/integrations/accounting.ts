import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');

export { encryptIntegrationSecret };

export function maskSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 8) {
    return '*'.repeat(Math.max(normalized.length, 4));
  }

  return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(normalized.length - 8, 4))}${normalized.slice(-4)}`;
}

export type HoldedProbeResult = {
  ok: boolean;
  provider: 'holded';
  invoiceApi: {
    ok: boolean;
    status: number | null;
  };
  accountingApi: {
    ok: boolean;
    status: number | null;
  };
  error?: string | null;
};

type HoldedRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  apiKey: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
};

type HoldedApiErrorPayload = {
  error?: string;
  message?: string;
};

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

async function holdedRequest<T>(options: HoldedRequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(options.path, options.query), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        key: options.apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawText = await response.text();
    const parsed = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      const payload = parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
      const message =
        payload?.error ||
        payload?.message ||
        `Holded API request failed with status ${response.status}`;
      throw new Error(message);
    }

    return (parsed as T) ?? (null as T);
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function probeEndpoint(apiKey: string, path: string, query?: HoldedRequestOptions['query']) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(path, query), {
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

export async function probeAccountingApiConnection(apiKey: string): Promise<HoldedProbeResult> {
  const normalizedApiKey = apiKey.trim();

  const [invoiceApi, accountingApi] = await Promise.all([
    probeEndpoint(normalizedApiKey, '/api/invoicing/v1/documents', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/accounting/v1/accounts', { limit: 1, page: 1 }),
  ]);

  const ok = invoiceApi.ok || accountingApi.ok;
  const error = ok
    ? null
    : 'No se pudo validar acceso a Holded Invoice API ni Accounting API con la API key proporcionada';

  return {
    ok,
    provider: 'holded',
    invoiceApi,
    accountingApi,
    error,
  };
}

export type HoldedInvoiceDocument = {
  id?: string;
  docNumber?: string;
  contactId?: string;
  total?: number;
  date?: string;
  status?: string;
};

export type HoldedContact = {
  id?: string;
  name?: string;
  code?: string;
  email?: string;
  mobile?: string;
  phone?: string;
};

export type HoldedAccount = {
  id?: string;
  name?: string;
  code?: string;
  balance?: number;
};

export const holdedAdapter = {
  async listInvoices(apiKey: string, args?: { page?: number; limit?: number; status?: string }) {
    return holdedRequest<HoldedInvoiceDocument[]>({
      apiKey,
      path: '/api/invoicing/v1/documents',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
        status: args?.status,
      },
    });
  },

  async getInvoice(apiKey: string, invoiceId: string) {
    return holdedRequest<HoldedInvoiceDocument>({
      apiKey,
      path: `/api/invoicing/v1/documents/${invoiceId}`,
    });
  },

  async listContacts(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedContact[]>({
      apiKey,
      path: '/api/invoicing/v1/contacts',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async getContact(apiKey: string, contactId: string) {
    return holdedRequest<HoldedContact>({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}`,
    });
  },

  async createDocument(
    apiKey: string,
    docType: string,
    payload: Record<string, unknown>
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}`,
      body: payload,
    });
  },

  async listAccounts(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedAccount[]>({
      apiKey,
      path: '/api/accounting/v1/accounts',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },
};
