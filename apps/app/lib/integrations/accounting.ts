import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');
const HOLDED_CHART_OF_ACCOUNTS_PATH = '/api/accounting/v1/chartofaccounts';
const HOLDED_HISTORY_SCAN_PAGES = Number(process.env.HOLDED_HISTORY_SCAN_PAGES || '12');
const HOLDED_HISTORY_FETCH_LIMIT = Math.max(
  25,
  Math.min(100, Number(process.env.HOLDED_HISTORY_FETCH_LIMIT || '100'))
);

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
  crmApi: {
    ok: boolean;
    status: number | null;
  };
  projectsApi: {
    ok: boolean;
    status: number | null;
  };
  teamApi: {
    ok: boolean;
    status: number | null;
  };
  error?: string | null;
};

type HoldedRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

function buildHoldedErrorMessage(
  status: number,
  payload: HoldedApiErrorPayload | null,
  rawText: string
) {
  const bodyMessage =
    payload?.error ||
    payload?.message ||
    (rawText.trim() ? rawText.trim().replace(/\s+/g, ' ').slice(0, 300) : null);

  return bodyMessage
    ? `Holded API request failed with status ${status}: ${bodyMessage}`
    : `Holded API request failed with status ${status}`;
}

export type HoldedBinaryFile = {
  base64: string;
  contentType: string | null;
  fileName: string | null;
  size: number;
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

function buildHoldedHeaders(apiKey: string, accept = 'application/json') {
  return {
    Accept: accept,
    'Content-Type': 'application/json',
    key: apiKey,
  };
}

async function holdedRequest<T>(options: HoldedRequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(options.path, options.query), {
      method: options.method ?? 'GET',
      headers: buildHoldedHeaders(options.apiKey),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawText = await response.text();
    const parsed = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      const payload =
        parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
      const message = buildHoldedErrorMessage(response.status, payload, rawText);
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

function extractFilenameFromContentDisposition(value: string | null) {
  if (!value) return null;

  const utfFilenameMatch = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utfFilenameMatch?.[1]) {
    try {
      return decodeURIComponent(utfFilenameMatch[1]);
    } catch {
      return utfFilenameMatch[1];
    }
  }

  const quotedFilenameMatch = /filename="([^"]+)"/i.exec(value);
  if (quotedFilenameMatch?.[1]) {
    return quotedFilenameMatch[1];
  }

  const plainFilenameMatch = /filename=([^;]+)/i.exec(value);
  if (plainFilenameMatch?.[1]) {
    return plainFilenameMatch[1].trim();
  }

  return null;
}

async function holdedBinaryRequest(
  options: Omit<HoldedRequestOptions, 'body'> & {
    accept?: string;
    defaultContentType?: string;
  }
): Promise<HoldedBinaryFile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(options.path, options.query), {
      method: options.method ?? 'GET',
      headers: buildHoldedHeaders(
        options.apiKey,
        options.accept ?? 'application/pdf, application/octet-stream, application/json'
      ),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      const rawText = await response.text();
      const parsed = rawText ? safeJsonParse(rawText) : null;
      const payload =
        parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
      const message =
        payload?.error ||
        payload?.message ||
        `Holded API request failed with status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.arrayBuffer();
    const contentType =
      response.headers?.get?.('content-type') ?? options.defaultContentType ?? 'application/pdf';
    const fileName =
      extractFilenameFromContentDisposition(
        response.headers?.get?.('content-disposition') ?? null
      ) ?? null;

    return {
      base64: Buffer.from(data).toString('base64'),
      contentType,
      fileName,
      size: data.byteLength,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function holdedMultipartRequest(
  options: Omit<HoldedRequestOptions, 'body'> & { formData: FormData; accept?: string }
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(options.path, options.query), {
      method: options.method ?? 'POST',
      headers: {
        Accept: options.accept ?? 'application/json',
        key: options.apiKey,
      },
      body: options.formData,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawText = await response.text();
    const parsed = rawText ? safeJsonParse(rawText) : null;

    if (!response.ok) {
      const payload =
        parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
      const message =
        payload?.error ||
        payload?.message ||
        `Holded API request failed with status ${response.status}`;
      throw new Error(message);
    }

    return (parsed as Record<string, unknown>) ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

async function probeEndpoint(apiKey: string, path: string, query?: HoldedRequestOptions['query']) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);

  try {
    const response = await fetch(buildHoldedUrl(path, query), {
      method: 'GET',
      headers: buildHoldedHeaders(apiKey),
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

  const [invoiceApi, accountingApi, crmApi, projectsApi, teamApi] = await Promise.all([
    probeEndpoint(normalizedApiKey, '/api/invoicing/v1/documents', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, HOLDED_CHART_OF_ACCOUNTS_PATH, { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/crm/v1/bookings', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/projects/v1/projects', { limit: 1, page: 1 }),
    probeEndpoint(normalizedApiKey, '/api/team/v1/employees', { limit: 1, page: 1 }),
  ]);

  const ok = invoiceApi.ok || accountingApi.ok || crmApi.ok || projectsApi.ok || teamApi.ok;
  const error = ok
    ? null
    : 'No se pudo validar acceso a ninguna API principal de Holded con la API key proporcionada';

  return {
    ok,
    provider: 'holded',
    invoiceApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
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

export type HoldedContactGroup = {
  id?: string;
  name?: string;
  description?: string;
};

export type HoldedBooking = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  contactId?: string;
  ownerId?: string;
  status?: string;
};

export type HoldedProject = {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  customerId?: string;
};

export type HoldedProjectTask = {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
  projectId?: string;
  assigneeId?: string;
};

export type HoldedEmployee = {
  id?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  status?: string;
};

export type HoldedTimeEntry = {
  id?: string;
  employeeId?: string;
  projectId?: string;
  taskId?: string;
  date?: string;
  hours?: number;
  description?: string;
};

type HoldedPaginationArgs = {
  page?: number;
  limit?: number;
};

export type HoldedHistoricalListMeta = {
  appliedRange: {
    from: string;
    to: string;
    year?: number;
  };
  pagesScanned: number;
  scanLimit: number;
  reachedEnd: boolean;
  matchedItems: number;
  returnedItems: number;
  oldestScannedDate: string | null;
  newestScannedDate: string | null;
};

type HoldedDocumentHistoryArgs = HoldedPaginationArgs & {
  status?: string;
  docType?: string;
  year?: number;
  from?: string;
  to?: string;
  scanPages?: number;
};

type HoldedHistoryWindow = {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  year?: number;
};

type HoldedDatedEntry = {
  item: Record<string, unknown>;
  date: Date;
};

type HoldedHistoryScanResult = {
  entries: HoldedDatedEntry[];
  pagesScanned: number;
  scanLimit: number;
  reachedEnd: boolean;
  oldestScannedDate: Date | null;
  newestScannedDate: Date | null;
};

type HoldedHistoricalListResult = {
  items: Record<string, unknown>[];
  history: HoldedHistoricalListMeta;
};

type HoldedEntityPayload = Record<string, unknown>;

function buildPagingQuery(args?: HoldedPaginationArgs) {
  return {
    page: args?.page ?? 1,
    limit: args?.limit ?? 25,
  };
}

function normalizePagingArgs(args?: HoldedPaginationArgs) {
  const pageValue = Number(args?.page ?? 1);
  const limitValue = Number(args?.limit ?? 25);

  return {
    page: Number.isFinite(pageValue) && pageValue >= 1 ? Math.trunc(pageValue) : 1,
    limit: Number.isFinite(limitValue) ? Math.max(1, Math.min(100, Math.trunc(limitValue))) : 25,
  };
}

function normalizeHistoryScanPages(value?: number) {
  const scanPages = Number(value ?? HOLDED_HISTORY_SCAN_PAGES);
  if (!Number.isFinite(scanPages)) return HOLDED_HISTORY_SCAN_PAGES;
  return Math.max(1, Math.min(50, Math.trunc(scanPages)));
}

function parseIsoBoundaryDate(value: string, bound: 'start' | 'end') {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T${bound === 'start' ? '00:00:00.000Z' : '23:59:59.999Z'}`);
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return coerceDateValue(numeric);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${bound === 'start' ? 'from' : 'to'} must be a valid date`);
  }

  return parsed;
}

function coerceDateValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1_000_000_000_000 ? value : value * 1000;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return coerceDateValue(numeric);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function buildHistoryWindow(args: Pick<HoldedDocumentHistoryArgs, 'year' | 'from' | 'to'>) {
  const year =
    typeof args.year === 'number' && Number.isFinite(args.year) ? Math.trunc(args.year) : undefined;

  if (year !== undefined && (year < 2000 || year > 2100)) {
    throw new Error('year must be between 2000 and 2100');
  }

  const explicitFrom = typeof args.from === 'string' && args.from.trim() ? args.from : undefined;
  const explicitTo = typeof args.to === 'string' && args.to.trim() ? args.to : undefined;

  if (!explicitFrom && !explicitTo && year === undefined) {
    return null;
  }

  const from = explicitFrom
    ? parseIsoBoundaryDate(explicitFrom, 'start')
    : year !== undefined
      ? new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
      : new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
  const to = explicitTo
    ? parseIsoBoundaryDate(explicitTo, 'end')
    : year !== undefined
      ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
      : new Date();

  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('from and to must be valid dates');
  }

  if (from.getTime() > to.getTime()) {
    throw new Error('from must be earlier than or equal to to');
  }

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    ...(year !== undefined ? { year } : {}),
  } satisfies HoldedHistoryWindow;
}

function getDocumentDate(item: Record<string, unknown>) {
  const candidateKeys = ['date', 'docDate', 'issueDate', 'invoiceDate', 'createdAt', 'updatedAt'];

  for (const key of candidateKeys) {
    const parsed = coerceDateValue(item[key]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function mergeOldestDate(current: Date | null, next: Date | null) {
  if (!current) return next;
  if (!next) return current;
  return current.getTime() <= next.getTime() ? current : next;
}

function mergeNewestDate(current: Date | null, next: Date | null) {
  if (!current) return next;
  if (!next) return current;
  return current.getTime() >= next.getTime() ? current : next;
}

function buildHistoricalListMeta(
  range: HoldedHistoryWindow,
  matchedItems: number,
  returnedItems: number,
  pagesScanned: number,
  scanLimit: number,
  reachedEnd: boolean,
  oldestScannedDate: Date | null,
  newestScannedDate: Date | null
): HoldedHistoricalListMeta {
  return {
    appliedRange: {
      from: range.fromIso,
      to: range.toIso,
      ...(range.year !== undefined ? { year: range.year } : {}),
    },
    pagesScanned,
    scanLimit,
    reachedEnd,
    matchedItems,
    returnedItems,
    oldestScannedDate: oldestScannedDate?.toISOString() ?? null,
    newestScannedDate: newestScannedDate?.toISOString() ?? null,
  };
}

async function scanTypedDocumentsHistory(
  apiKey: string,
  docType: string,
  args: {
    status?: string;
    range: HoldedHistoryWindow;
    scanPages?: number;
    targetMatches: number;
  }
): Promise<HoldedHistoryScanResult> {
  const scanLimit = normalizeHistoryScanPages(args.scanPages);
  const entries: HoldedDatedEntry[] = [];
  let pagesScanned = 0;
  let reachedEnd = false;
  let oldestScannedDate: Date | null = null;
  let newestScannedDate: Date | null = null;

  for (let currentPage = 1; currentPage <= scanLimit; currentPage += 1) {
    const batch = await holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}`,
      query: {
        page: currentPage,
        limit: HOLDED_HISTORY_FETCH_LIMIT,
        status: args.status,
      },
    });

    pagesScanned += 1;

    if (!Array.isArray(batch) || batch.length === 0) {
      reachedEnd = true;
      break;
    }

    let oldestOnPage: Date | null = null;

    for (const item of batch) {
      const itemDate = getDocumentDate(item);
      if (!itemDate) continue;

      oldestOnPage = mergeOldestDate(oldestOnPage, itemDate);
      oldestScannedDate = mergeOldestDate(oldestScannedDate, itemDate);
      newestScannedDate = mergeNewestDate(newestScannedDate, itemDate);

      if (
        itemDate.getTime() >= args.range.from.getTime() &&
        itemDate.getTime() <= args.range.to.getTime()
      ) {
        entries.push({ item, date: itemDate });
      }
    }

    if (entries.length >= args.targetMatches) {
      break;
    }

    if (batch.length < HOLDED_HISTORY_FETCH_LIMIT) {
      reachedEnd = true;
      break;
    }

    if (oldestOnPage && oldestOnPage.getTime() < args.range.from.getTime()) {
      reachedEnd = true;
      break;
    }
  }

  entries.sort((left, right) => right.date.getTime() - left.date.getTime());

  return {
    entries,
    pagesScanned,
    scanLimit,
    reachedEnd,
    oldestScannedDate,
    newestScannedDate,
  };
}

function invoicingPath(resource: string, id?: string) {
  return id ? `/api/invoicing/v1/${resource}/${id}` : `/api/invoicing/v1/${resource}`;
}

async function listInvoicingResource<T>(
  apiKey: string,
  resource: string,
  args?: HoldedPaginationArgs
) {
  return holdedRequest<T[]>({
    apiKey,
    path: invoicingPath(resource),
    query: buildPagingQuery(args),
  });
}

async function listSimpleInvoicingResource<T>(apiKey: string, resource: string) {
  return holdedRequest<T[]>({
    apiKey,
    path: invoicingPath(resource),
  });
}

async function getInvoicingResource<T>(apiKey: string, resource: string, id: string) {
  return holdedRequest<T>({
    apiKey,
    path: invoicingPath(resource, id),
  });
}

async function createInvoicingResource(
  apiKey: string,
  resource: string,
  payload: HoldedEntityPayload
) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'POST',
    path: invoicingPath(resource),
    body: payload,
  });
}

async function updateInvoicingResource(
  apiKey: string,
  resource: string,
  id: string,
  payload: HoldedEntityPayload
) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'PUT',
    path: invoicingPath(resource, id),
    body: payload,
  });
}

async function deleteInvoicingResource(apiKey: string, resource: string, id: string) {
  return holdedRequest<Record<string, unknown>>({
    apiKey,
    method: 'DELETE',
    path: invoicingPath(resource, id),
  });
}

async function listTypedDocuments(
  apiKey: string,
  docType: string,
  args?: { page?: number; limit?: number; status?: string }
) {
  return holdedRequest<Record<string, unknown>[]>({
    apiKey,
    path: `/api/invoicing/v1/documents/${docType}`,
    query: {
      page: args?.page ?? 1,
      limit: args?.limit ?? 25,
      status: args?.status,
    },
  });
}

function attachDocType(items: Record<string, unknown>[], docType: string) {
  return items.map((item) => ({ ...item, docType }));
}

export const holdedAdapter = {
  async listInvoices(apiKey: string, args?: { page?: number; limit?: number; status?: string }) {
    return listTypedDocuments(apiKey, 'invoice', args);
  },

  async listInvoicesHistory(
    apiKey: string,
    args: HoldedDocumentHistoryArgs
  ): Promise<HoldedHistoricalListResult> {
    const range = buildHistoryWindow(args);
    if (!range) {
      throw new Error('year or from/to is required to scan invoice history');
    }

    const { page, limit } = normalizePagingArgs(args);
    const offset = (page - 1) * limit;
    const scan = await scanTypedDocumentsHistory(apiKey, 'invoice', {
      status: args.status,
      range,
      scanPages: args.scanPages,
      targetMatches: page * limit,
    });
    const items = scan.entries.slice(offset, offset + limit).map((entry) => entry.item);

    return {
      items,
      history: buildHistoricalListMeta(
        range,
        scan.entries.length,
        items.length,
        scan.pagesScanned,
        scan.scanLimit,
        scan.reachedEnd,
        scan.oldestScannedDate,
        scan.newestScannedDate
      ),
    };
  },

  async getInvoice(apiKey: string, invoiceId: string) {
    return holdedRequest<HoldedInvoiceDocument>({
      apiKey,
      path: `/api/invoicing/v1/documents/invoice/${invoiceId}`,
    });
  },

  async listDocuments(
    apiKey: string,
    args?: { page?: number; limit?: number; status?: string; docType?: string }
  ) {
    if (args?.docType) {
      return listTypedDocuments(apiKey, args.docType, args);
    }

    const [invoices, estimates] = await Promise.all([
      listTypedDocuments(apiKey, 'invoice', args),
      listTypedDocuments(apiKey, 'estimate', args),
    ]);

    return [...attachDocType(invoices, 'invoice'), ...attachDocType(estimates, 'estimate')];
  },

  async listDocumentsHistory(
    apiKey: string,
    args: HoldedDocumentHistoryArgs
  ): Promise<HoldedHistoricalListResult> {
    const range = buildHistoryWindow(args);
    if (!range) {
      throw new Error('year or from/to is required to scan document history');
    }

    const { page, limit } = normalizePagingArgs(args);
    const offset = (page - 1) * limit;

    if (args.docType) {
      const scan = await scanTypedDocumentsHistory(apiKey, args.docType, {
        status: args.status,
        range,
        scanPages: args.scanPages,
        targetMatches: page * limit,
      });
      const items = scan.entries.slice(offset, offset + limit).map((entry) => entry.item);

      return {
        items,
        history: buildHistoricalListMeta(
          range,
          scan.entries.length,
          items.length,
          scan.pagesScanned,
          scan.scanLimit,
          scan.reachedEnd,
          scan.oldestScannedDate,
          scan.newestScannedDate
        ),
      };
    }

    const [invoiceScan, estimateScan] = await Promise.all([
      scanTypedDocumentsHistory(apiKey, 'invoice', {
        status: args.status,
        range,
        scanPages: args.scanPages,
        targetMatches: page * limit,
      }),
      scanTypedDocumentsHistory(apiKey, 'estimate', {
        status: args.status,
        range,
        scanPages: args.scanPages,
        targetMatches: page * limit,
      }),
    ]);

    const combinedEntries = [
      ...invoiceScan.entries.map((entry) => ({
        item: { ...entry.item, docType: 'invoice' },
        date: entry.date,
      })),
      ...estimateScan.entries.map((entry) => ({
        item: { ...entry.item, docType: 'estimate' },
        date: entry.date,
      })),
    ].sort((left, right) => right.date.getTime() - left.date.getTime());

    const items = combinedEntries.slice(offset, offset + limit).map((entry) => entry.item);

    return {
      items,
      history: buildHistoricalListMeta(
        range,
        combinedEntries.length,
        items.length,
        invoiceScan.pagesScanned + estimateScan.pagesScanned,
        Math.max(invoiceScan.scanLimit, estimateScan.scanLimit),
        invoiceScan.reachedEnd && estimateScan.reachedEnd,
        mergeOldestDate(invoiceScan.oldestScannedDate, estimateScan.oldestScannedDate),
        mergeNewestDate(invoiceScan.newestScannedDate, estimateScan.newestScannedDate)
      ),
    };
  },

  async getDocument(apiKey: string, docType: string, documentId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
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

  async listContactAttachments(apiKey: string, contactId: string) {
    return holdedRequest<unknown[]>({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}/attachments/list`,
    });
  },

  async getContactAttachment(apiKey: string, contactId: string, fileName: string) {
    const attachment = await holdedBinaryRequest({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}/attachments/get`,
      query: { filename: fileName },
      accept: 'application/octet-stream, image/*, application/pdf, application/json',
      defaultContentType: 'application/octet-stream',
    });

    return {
      ...attachment,
      fileName: attachment.fileName || fileName,
    } satisfies HoldedBinaryFile;
  },

  async createDocument(apiKey: string, docType: string, payload: Record<string, unknown>) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}`,
      body: payload,
    });
  },

  async updateDocument(
    apiKey: string,
    docType: string,
    documentId: string,
    payload: Record<string, unknown>
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
      body: payload,
    });
  },

  async deleteDocument(apiKey: string, docType: string, documentId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'DELETE',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}`,
    });
  },

  async sendDocument(
    apiKey: string,
    docType: string,
    documentId: string,
    payload: HoldedEntityPayload
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/send`,
      body: payload,
    });
  },

  async getDocumentPdf(apiKey: string, docType: string, documentId: string) {
    const pdf = await holdedBinaryRequest({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/pdf`,
    });

    return {
      ...pdf,
      contentType: pdf.contentType || 'application/pdf',
      fileName: pdf.fileName || `${docType}-${documentId}.pdf`,
    } satisfies HoldedBinaryFile;
  },

  async updateDocumentTracking(
    apiKey: string,
    docType: string,
    documentId: string,
    payload: HoldedEntityPayload
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/updatetracking`,
      body: payload,
    });
  },

  async updateDocumentPipeline(
    apiKey: string,
    docType: string,
    documentId: string,
    pipeline: string
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/pipeline/set`,
      body: { pipeline },
    });
  },

  async shipDocumentAllItems(apiKey: string, documentId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/salesorder/${documentId}/shipall`,
    });
  },

  async shipDocumentByLines(apiKey: string, documentId: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/salesorder/${documentId}/shipbylines`,
      body: payload,
    });
  },

  async getDocumentShippedItems(apiKey: string, docType: string, documentId: string) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/shippeditems`,
    });
  },

  async attachDocumentFile(
    apiKey: string,
    docType: string,
    documentId: string,
    args: { fileName: string; base64: string; contentType?: string; setMain?: boolean }
  ) {
    const formData = new FormData();
    const file = new Blob([Buffer.from(args.base64, 'base64')], {
      type: args.contentType?.trim() || 'application/octet-stream',
    });

    formData.append('file', file, args.fileName);
    if (args.setMain !== undefined) {
      formData.append('setMain', String(args.setMain));
    }

    return holdedMultipartRequest({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/attach`,
      formData,
    });
  },

  async listDailyLedger(
    apiKey: string,
    args?: { page?: number; starttmp?: number; endtmp?: number }
  ) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: '/api/accounting/v1/dailyledger',
      query: {
        page: args?.page ?? 1,
        starttmp: args?.starttmp,
        endtmp: args?.endtmp,
      },
    });
  },

  async createDailyLedgerEntry(apiKey: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: '/api/accounting/v1/entry',
      body: payload,
    });
  },

  async listAccounts(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedAccount[]>({
      apiKey,
      path: HOLDED_CHART_OF_ACCOUNTS_PATH,
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async createAccountingAccount(apiKey: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: '/api/accounting/v1/account',
      body: payload,
    });
  },

  async listContactGroups(apiKey: string, args?: { page?: number; limit?: number }) {
    return listInvoicingResource<HoldedContactGroup>(apiKey, 'contacts/groups', args);
  },

  async createContact(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'contacts', payload);
  },

  async updateContact(apiKey: string, contactId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'contacts', contactId, payload);
  },

  async deleteContact(apiKey: string, contactId: string) {
    return deleteInvoicingResource(apiKey, 'contacts', contactId);
  },

  async listTreasuryAccounts(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'treasury');
  },

  async getTreasuryAccount(apiKey: string, treasuryId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'treasury', treasuryId);
  },

  async createTreasuryAccount(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'treasury', payload);
  },

  async updateTreasuryAccount(apiKey: string, treasuryId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'treasury', treasuryId, payload);
  },

  async listExpenseAccounts(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'expensesaccounts', args);
  },

  async getExpenseAccount(apiKey: string, expenseAccountId: string) {
    return getInvoicingResource<Record<string, unknown>>(
      apiKey,
      'expensesaccounts',
      expenseAccountId
    );
  },

  async createExpenseAccount(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'expensesaccounts', payload);
  },

  async updateExpenseAccount(
    apiKey: string,
    expenseAccountId: string,
    payload: HoldedEntityPayload
  ) {
    return updateInvoicingResource(apiKey, 'expensesaccounts', expenseAccountId, payload);
  },

  async deleteExpenseAccount(apiKey: string, expenseAccountId: string) {
    return deleteInvoicingResource(apiKey, 'expensesaccounts', expenseAccountId);
  },

  async listNumberingSeries(apiKey: string, seriesType: string) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/numberingseries/${seriesType}`,
    });
  },

  async createNumberingSeries(apiKey: string, seriesType: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/numberingseries/${seriesType}`,
      body: payload,
    });
  },

  async updateNumberingSeries(
    apiKey: string,
    seriesType: string,
    seriesId: string,
    payload: HoldedEntityPayload
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/invoicing/v1/numberingseries/${seriesType}/${seriesId}`,
      body: payload,
    });
  },

  async deleteNumberingSeries(apiKey: string, seriesType: string, seriesId: string) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'DELETE',
      path: `/api/invoicing/v1/numberingseries/${seriesType}/${seriesId}`,
    });
  },

  async listProducts(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'products', args);
  },

  async getProduct(apiKey: string, productId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'products', productId);
  },

  async getProductMainImage(apiKey: string, productId: string) {
    const image = await holdedBinaryRequest({
      apiKey,
      path: `/api/invoicing/v1/products/${productId}/image`,
      accept: 'image/*, application/octet-stream, application/json',
      defaultContentType: 'application/octet-stream',
    });

    return {
      ...image,
      fileName: image.fileName || `${productId}-main-image`,
    } satisfies HoldedBinaryFile;
  },

  async listProductImages(apiKey: string, productId: string) {
    return holdedRequest<unknown[]>({
      apiKey,
      path: `/api/invoicing/v1/products/${productId}/imagesList`,
    });
  },

  async getProductSecondaryImage(apiKey: string, productId: string, imageFileName: string) {
    const image = await holdedBinaryRequest({
      apiKey,
      path: `/api/invoicing/v1/products/${productId}/image/${imageFileName}`,
      accept: 'image/*, application/octet-stream, application/json',
      defaultContentType: 'application/octet-stream',
    });

    return {
      ...image,
      fileName: image.fileName || imageFileName,
    } satisfies HoldedBinaryFile;
  },

  async updateProductStock(apiKey: string, productId: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/invoicing/v1/products/${productId}/stock`,
      body: payload,
    });
  },

  async createProduct(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'products', payload);
  },

  async updateProduct(apiKey: string, productId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'products', productId, payload);
  },

  async deleteProduct(apiKey: string, productId: string) {
    return deleteInvoicingResource(apiKey, 'products', productId);
  },

  async listSalesChannels(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'saleschannels', args);
  },

  async getSalesChannel(apiKey: string, salesChannelId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'saleschannels', salesChannelId);
  },

  async createSalesChannel(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'saleschannels', payload);
  },

  async updateSalesChannel(apiKey: string, salesChannelId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'saleschannels', salesChannelId, payload);
  },

  async deleteSalesChannel(apiKey: string, salesChannelId: string) {
    return deleteInvoicingResource(apiKey, 'saleschannels', salesChannelId);
  },

  async listWarehouses(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'warehouses', args);
  },

  async getWarehouse(apiKey: string, warehouseId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'warehouses', warehouseId);
  },

  async listWarehouseStock(apiKey: string, warehouseId: string) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/warehouses/${warehouseId}/stock`,
    });
  },

  async createWarehouse(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'warehouses', payload);
  },

  async updateWarehouse(apiKey: string, warehouseId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'warehouses', warehouseId, payload);
  },

  async deleteWarehouse(apiKey: string, warehouseId: string) {
    return deleteInvoicingResource(apiKey, 'warehouses', warehouseId);
  },

  async listPayments(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'payments', args);
  },

  async getPayment(apiKey: string, paymentId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'payments', paymentId);
  },

  async createPayment(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'payments', payload);
  },

  async updatePayment(apiKey: string, paymentId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'payments', paymentId, payload);
  },

  async deletePayment(apiKey: string, paymentId: string) {
    return deleteInvoicingResource(apiKey, 'payments', paymentId);
  },

  async payDocument(
    apiKey: string,
    docType: string,
    documentId: string,
    payload: HoldedEntityPayload
  ) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/invoicing/v1/documents/${docType}/${documentId}/pay`,
      body: payload,
    });
  },

  async listTaxes(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'taxes');
  },

  async listPaymentMethods(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'paymentmethods');
  },

  async getContactGroup(apiKey: string, contactGroupId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'contacts/groups', contactGroupId);
  },

  async createContactGroup(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'contacts/groups', payload);
  },

  async updateContactGroup(apiKey: string, contactGroupId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'contacts/groups', contactGroupId, payload);
  },

  async deleteContactGroup(apiKey: string, contactGroupId: string) {
    return deleteInvoicingResource(apiKey, 'contacts/groups', contactGroupId);
  },

  async listRemittances(apiKey: string) {
    return listSimpleInvoicingResource<Record<string, unknown>>(apiKey, 'remittances');
  },

  async getRemittance(apiKey: string, remittanceId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'remittances', remittanceId);
  },

  async listServices(apiKey: string, args?: HoldedPaginationArgs) {
    return listInvoicingResource<Record<string, unknown>>(apiKey, 'services', args);
  },

  async getService(apiKey: string, serviceId: string) {
    return getInvoicingResource<Record<string, unknown>>(apiKey, 'services', serviceId);
  },

  async createService(apiKey: string, payload: HoldedEntityPayload) {
    return createInvoicingResource(apiKey, 'services', payload);
  },

  async updateService(apiKey: string, serviceId: string, payload: HoldedEntityPayload) {
    return updateInvoicingResource(apiKey, 'services', serviceId, payload);
  },

  async deleteService(apiKey: string, serviceId: string) {
    return deleteInvoicingResource(apiKey, 'services', serviceId);
  },

  async listBookings(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedBooking[]>({
      apiKey,
      path: '/api/crm/v1/bookings',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listProjects(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedProject[]>({
      apiKey,
      path: '/api/projects/v1/projects',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async getProject(apiKey: string, projectId: string) {
    return holdedRequest<HoldedProject>({
      apiKey,
      path: '/api/projects/v1/projects/' + projectId,
    });
  },

  async listProjectTasks(
    apiKey: string,
    projectId: string,
    args?: { page?: number; limit?: number }
  ) {
    return holdedRequest<HoldedProjectTask[]>({
      apiKey,
      path: '/api/projects/v1/projects/' + projectId + '/tasks',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listEmployees(apiKey: string, args?: { page?: number; limit?: number }) {
    return holdedRequest<HoldedEmployee[]>({
      apiKey,
      path: '/api/team/v1/employees',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
      },
    });
  },

  async listTimeEntries(
    apiKey: string,
    args?: { page?: number; limit?: number; employeeId?: string }
  ) {
    return holdedRequest<HoldedTimeEntry[]>({
      apiKey,
      path: '/api/team/v1/times',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
        employeeId: args?.employeeId,
      },
    });
  },
};
