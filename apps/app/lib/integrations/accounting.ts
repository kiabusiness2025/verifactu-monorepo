import { encryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

const HOLDED_API_BASE_URL = process.env.HOLDED_API_BASE_URL?.trim() || 'https://api.holded.com';
const HOLDED_TIMEOUT_MS = Number(process.env.HOLDED_TIMEOUT_MS || '10000');
const HOLDED_CHART_OF_ACCOUNTS_PATH = '/api/accounting/v1/chartofaccounts';
const HOLDED_HISTORY_SCAN_PAGES = Number(process.env.HOLDED_HISTORY_SCAN_PAGES || '12');
const HOLDED_HISTORY_FETCH_LIMIT = Math.max(
  25,
  Math.min(100, Number(process.env.HOLDED_HISTORY_FETCH_LIMIT || '100'))
);
// Presupuesto de tiempo total para el escaneo histórico multi-página. Si Holded
// ignora los filtros starttmp/endtmp en /documents, el scan podía encadenar
// hasta HOLDED_HISTORY_SCAN_PAGES llamadas secuenciales (~12 × varios segundos)
// y el cliente MCP (ChatGPT) cortaba la llamada antes de recibir respuesta.
// Con el presupuesto devolvemos resultados parciales con reachedEnd=false en
// vez de agotar el tiempo del cliente.
const HOLDED_HISTORY_SCAN_BUDGET_MS = Math.max(
  2000,
  Number(process.env.HOLDED_HISTORY_SCAN_BUDGET_MS || '7000')
);

const HOLDED_RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const HOLDED_MAX_RETRIES = 2;

// V3.G.2 (2026-06-01): Holded /dailyledger pagina con tamaño real ~250 entries
// (la doc oficial dice 500 pero empíricamente devuelve 250 — ver
// docs/engineering/connectors/HOLDED_API_QUIRKS.md Q1.1). Auto-paginamos
// hasta el cap para no degradar el latency por queries gigantes.
const HOLDED_LEDGER_PAGE_SIZE = Number(process.env.HOLDED_LEDGER_PAGE_SIZE || '250');
const HOLDED_LEDGER_MAX_PAGES = Math.max(
  1,
  Number(process.env.HOLDED_LEDGER_MAX_PAGES || '10')
);

function holdedSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function holdedBackoffMs(attempt: number) {
  const base = 200 * 2 ** attempt;
  return Math.max(50, Math.floor(base + base * (Math.random() - 0.5)));
}

export { encryptIntegrationSecret };

export type HoldedProbeProfile = 'dashboard' | 'chatgpt';

type HoldedProbeEndpointStatus = {
  ok: boolean;
  status: number | null;
};

type HoldedProbeCapabilityKey =
  | 'invoiceApi'
  | 'contactsApi'
  | 'accountingApi'
  | 'crmApi'
  | 'projectsApi';

const HOLDED_PROBE_REQUIREMENTS: Record<HoldedProbeProfile, readonly HoldedProbeCapabilityKey[]> = {
  dashboard: ['invoiceApi', 'contactsApi', 'accountingApi'],
  chatgpt: ['invoiceApi', 'contactsApi', 'accountingApi', 'crmApi', 'projectsApi'],
};

const HOLDED_PROBE_LABELS: Record<HoldedProbeCapabilityKey, string> = {
  invoiceApi: 'facturas',
  contactsApi: 'contactos',
  accountingApi: 'cuentas contables',
  crmApi: 'agenda comercial',
  projectsApi: 'proyectos',
};

export function maskSecret(value: string) {
  const normalized = value.trim();
  if (normalized.length <= 8) {
    return '*'.repeat(Math.max(normalized.length, 4));
  }

  return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(normalized.length - 8, 4))}${normalized.slice(-4)}`;
}

export type HoldedCompanyInfo = {
  email?: string | null;
  name?: string | null;
  taxId?: string | null;
};

export type HoldedProbeResult = {
  ok: boolean;
  provider: 'holded';
  profile: HoldedProbeProfile;
  invoiceApi: HoldedProbeEndpointStatus;
  contactsApi: HoldedProbeEndpointStatus;
  accountingApi: HoldedProbeEndpointStatus;
  crmApi: HoldedProbeEndpointStatus;
  projectsApi: HoldedProbeEndpointStatus;
  teamApi: HoldedProbeEndpointStatus;
  requiredCapabilities: HoldedProbeCapabilityKey[];
  missingCapabilities: HoldedProbeCapabilityKey[];
  error?: string | null;
  companyInfo?: HoldedCompanyInfo | null;
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
    // Bug 2026-05-18 (soporte audit + OpenAI App Review re-rejection): Node
    // fetch (undici) envía por defecto `Accept-Encoding: br, gzip, deflate`.
    // Las respuestas grandes de Holded (`/documents`, `/contacts`, `/accounts`,
    // `/dailyledger`) llegan comprimidas con brotli y la descompresión
    // transparente falla en silencio detrás del edge proxy de Vercel → res.text()
    // devuelve bytes truncados y safeJsonParse() devuelve `[]` o `null` como si
    // la cuenta estuviera vacía. El reviewer de OpenAI veía "did not produce
    // correct results" para POS-01/03/05/06. Forzar identity replica el patrón
    // ya usado en apps/holded/app/lib/holded-api-client.ts y apps/holded-mcp.
    // Ver memoria interna `feedback_proxy_brotli`.
    'Accept-Encoding': 'identity',
  };
}

async function holdedRequest<T>(options: HoldedRequestOptions): Promise<T> {
  for (let attempt = 0; attempt <= HOLDED_MAX_RETRIES; attempt++) {
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
        if (HOLDED_RETRYABLE_STATUS.has(response.status) && attempt < HOLDED_MAX_RETRIES) {
          await holdedSleep(holdedBackoffMs(attempt));
          continue;
        }
        const payload =
          parsed && typeof parsed === 'object' ? (parsed as HoldedApiErrorPayload) : null;
        const message = buildHoldedErrorMessage(response.status, payload, rawText);
        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      return (parsed as T) ?? (null as T);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Holded request failed: ${options.path}`);
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/**
 * V3.F.II (auditoría 2026-06-01): valida que un response binario de Holded
 * sea realmente del tipo esperado y no un JSON de error disfrazado.
 *
 * Holded a veces devuelve HTTP 200 + body JSON (`{"status":0,"error":"..."}`)
 * cuando no hay binario disponible (documento sin PDF, contacto sin
 * attachment, producto sin imagen, etc.). Sin validación, el adapter
 * encodea ese JSON como base64 con contentType mentiroso y el caller
 * (ChatGPT, Claude, Isaak) cree que tiene un PDF/imagen real.
 *
 * Detecta el caso via: magic bytes conocidos (`%PDF-`, `\x89PNG`,
 * `\xFF\xD8\xFF` JPEG, `GIF8`, `RIFF` WebP, `BM` BMP) + content-type.
 * Si NINGUNO de los dos pasa, decodifica el body y propaga el mensaje
 * de error de Holded como Error legible.
 */
function ensureHoldedBinaryNotJsonError(
  file: HoldedBinaryFile,
  options: {
    expectedKind: 'pdf' | 'image' | 'any';
    pathLabel: string;
  }
): void {
  const ct = (file.contentType || '').toLowerCase();
  const head = file.base64
    ? Buffer.from(file.base64.slice(0, 16), 'base64').toString('latin1')
    : '';

  const isPdfMagic = head.startsWith('%PDF-');
  const isImageMagic =
    head.startsWith('\x89PNG') ||
    head.startsWith('\xFF\xD8\xFF') ||
    head.startsWith('GIF8') ||
    head.startsWith('RIFF') ||
    head.startsWith('BM');

  const ctIsPdf = ct.startsWith('application/pdf');
  const ctIsImage = ct.startsWith('image/');
  const ctIsJson = ct.startsWith('application/json');
  const headLooksLikeJson =
    head.trimStart().startsWith('{') || head.trimStart().startsWith('[');

  let isOk: boolean;
  if (options.expectedKind === 'pdf') {
    isOk = isPdfMagic || (ctIsPdf && !ctIsJson && !headLooksLikeJson);
  } else if (options.expectedKind === 'image') {
    isOk = isImageMagic || (ctIsImage && !ctIsJson && !headLooksLikeJson);
  } else {
    isOk =
      isPdfMagic ||
      isImageMagic ||
      (ctIsPdf && !headLooksLikeJson) ||
      (ctIsImage && !headLooksLikeJson) ||
      (!ctIsJson && !headLooksLikeJson);
  }

  if (isOk) return;

  const body = file.base64 ? Buffer.from(file.base64, 'base64').toString('utf8') : '';
  const parsed = safeJsonParse(body);
  const msg =
    parsed && typeof parsed === 'object'
      ? ((parsed as { error?: string; message?: string }).error ??
        (parsed as { error?: string; message?: string }).message ??
        null)
      : null;
  throw new Error(
    msg
      ? `Holded returned a non-binary response for ${options.pathLabel}: ${msg}`
      : `Holded returned a non-binary response for ${options.pathLabel}. The resource may not exist or may not have a binary attachment.`
  );
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
  for (let attempt = 0; attempt <= HOLDED_MAX_RETRIES; attempt++) {
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
        if (HOLDED_RETRYABLE_STATUS.has(response.status) && attempt < HOLDED_MAX_RETRIES) {
          await holdedSleep(holdedBackoffMs(attempt));
          continue;
        }
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
  throw new Error(`Holded binary request failed: ${options.path}`);
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
        // Mismo fix brotli que buildHoldedHeaders — multipart no usa
        // Content-Type explícito (lo setea fetch) pero sí Accept-Encoding.
        'Accept-Encoding': 'identity',
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

async function fetchHoldedCompanyInfo(apiKey: string): Promise<HoldedCompanyInfo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOLDED_TIMEOUT_MS);
  try {
    const response = await fetch(buildHoldedUrl('/api/company/v1/'), {
      method: 'GET',
      headers: buildHoldedHeaders(apiKey),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const raw = await response.text();
    const parsed = raw ? safeJsonParse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as Record<string, unknown>;
    return {
      email: typeof data.email === 'string' ? data.email.trim() || null : null,
      name: typeof data.socialName === 'string' ? data.socialName.trim() || null : null,
      taxId: typeof data.cifNumber === 'string' ? data.cifNumber.trim() || null : null,
    };
  } catch {
    return null;
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

function formatHoldedCapabilityList(capabilities: readonly HoldedProbeCapabilityKey[]) {
  const labels = capabilities.map((capability) => HOLDED_PROBE_LABELS[capability]);

  if (labels.length <= 1) {
    return labels[0] || '';
  }

  if (labels.length === 2) {
    return `${labels[0]} y ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
}

export function summarizeHoldedProbeReadiness(
  probe: Pick<
    HoldedProbeResult,
    'invoiceApi' | 'contactsApi' | 'accountingApi' | 'crmApi' | 'projectsApi'
  >,
  profile: HoldedProbeProfile = 'dashboard'
) {
  const requiredCapabilities = [...HOLDED_PROBE_REQUIREMENTS[profile]];
  const missingCapabilities = requiredCapabilities.filter((capability) => !probe[capability]?.ok);
  const ok = missingCapabilities.length === 0;
  const targetLabel =
    profile === 'chatgpt' ? 'la conexion con ChatGPT' : 'la conexion del Conector Holded';
  const error = ok
    ? null
    : `La API key de Holded no tiene acceso suficiente para ${targetLabel}. Falta acceso a ${formatHoldedCapabilityList(missingCapabilities)}.`;

  return {
    ok,
    requiredCapabilities,
    missingCapabilities,
    error,
  };
}

export async function probeAccountingApiConnection(
  apiKey: string,
  options?: { profile?: HoldedProbeProfile }
): Promise<HoldedProbeResult> {
  const normalizedApiKey = apiKey.trim();
  const profile = options?.profile ?? 'dashboard';

  const [invoiceApi, contactsApi, accountingApi, crmApi, projectsApi, teamApi, companyInfo] =
    await Promise.all([
      probeEndpoint(normalizedApiKey, '/api/invoicing/v1/documents/invoice', {
        limit: 1,
        page: 1,
      }),
      probeEndpoint(normalizedApiKey, '/api/invoicing/v1/contacts', { limit: 1, page: 1 }),
      probeEndpoint(normalizedApiKey, HOLDED_CHART_OF_ACCOUNTS_PATH, { limit: 1, page: 1 }),
      probeEndpoint(normalizedApiKey, '/api/crm/v1/bookings', { limit: 1, page: 1 }),
      probeEndpoint(normalizedApiKey, '/api/projects/v1/projects', { limit: 1, page: 1 }),
      probeEndpoint(normalizedApiKey, '/api/team/v1/employees', { limit: 1, page: 1 }),
      fetchHoldedCompanyInfo(normalizedApiKey),
    ]);

  const readiness = summarizeHoldedProbeReadiness(
    {
      invoiceApi,
      contactsApi,
      accountingApi,
      crmApi,
      projectsApi,
    },
    profile
  );

  return {
    ok: readiness.ok,
    provider: 'holded',
    profile,
    invoiceApi,
    contactsApi,
    accountingApi,
    crmApi,
    projectsApi,
    teamApi,
    requiredCapabilities: readiness.requiredCapabilities,
    missingCapabilities: readiness.missingCapabilities,
    error: readiness.error,
    companyInfo: companyInfo ?? null,
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
  type?: string;
  // V3.F: Holded marca a cada contacto con flags de rol — 0 / null si NUNCA
  // ha actuado en ese rol, número o objeto cuando tiene actividad. Usado
  // para discriminar resultados cuando se filtra por type=client/supplier.
  clientRecord?: number | Record<string, unknown> | null;
  supplierRecord?: number | Record<string, unknown> | null;
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

type HoldedAccountListArgs = HoldedPaginationArgs & {
  starttmp?: number;
  endtmp?: number;
  includeEmpty?: boolean;
};

type HoldedPaymentListArgs = HoldedPaginationArgs & {
  starttmp?: number;
  endtmp?: number;
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

function paginateArrayResponse<T>(
  items: T[],
  args?: HoldedPaginationArgs,
  options?: { enabled?: boolean }
) {
  if (options?.enabled === false) return items;

  const { page, limit } = normalizePagingArgs(args);
  if (items.length <= limit) return items;

  const offset = (page - 1) * limit;
  return items.slice(offset, offset + limit);
}

/**
 * V3.G (auditoría 2026-06-01): orden estable de asientos del libro diario
 * por date ASC (oldest first) + number ASC. Holded `/dailyledger` devuelve
 * los registros en orden interno de Mongo (insertion order, sin garantías):
 * el usuario reportó asientos saliendo "122-129, 280, 356, 384..., 660-677,
 * 137 al final" — imposible cuadrar. El sort se aplica ANTES de paginar.
 */
function sortHoldedJournalEntries<T extends Record<string, unknown>>(entries: T[]): T[] {
  const withIndex = entries.map((entry, idx) => ({ entry, idx }));
  withIndex.sort((a, b) => {
    const dateA = entryToComparableNumber((a.entry as { date?: unknown }).date);
    const dateB = entryToComparableNumber((b.entry as { date?: unknown }).date);
    if (dateA !== dateB) {
      if (dateA === null) return 1;
      if (dateB === null) return -1;
      return dateA - dateB;
    }
    const numA = entryToComparableNumber(
      (a.entry as { number?: unknown }).number ?? (a.entry as { docNumber?: unknown }).docNumber
    );
    const numB = entryToComparableNumber(
      (b.entry as { number?: unknown }).number ?? (b.entry as { docNumber?: unknown }).docNumber
    );
    if (numA !== numB) {
      if (numA === null) return 1;
      if (numB === null) return -1;
      return numA - numB;
    }
    return a.idx - b.idx;
  });
  return withIndex.map((w) => w.entry);
}

function entryToComparableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
    const digits = trimmed.match(/\d+/);
    if (digits) {
      const parsedDigits = Number(digits[0]);
      if (Number.isFinite(parsedDigits)) return parsedDigits;
    }
  }
  return null;
}

function normalizeSearchText(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function filterContactsByName(contacts: HoldedContact[], name?: string) {
  const needle = normalizeSearchText(name);
  if (!needle) return contacts;

  return contacts.filter((contact) => {
    const raw = contact as Record<string, unknown>;
    return ['name', 'tradeName', 'code', 'vatnumber', 'email'].some((key) =>
      normalizeSearchText(raw[key]).includes(needle)
    );
  });
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

  // Filtrado server-side via starttmp/endtmp (Unix seconds). Antes de este
  // fix el scan pedía TODAS las facturas paginadas y filtraba cliente-side,
  // limitado a HOLDED_HISTORY_SCAN_PAGES * 100 = 1200 docs. Tenants con más
  // historial no podían acceder a años anteriores (ej. 2025). Ahora Holded
  // filtra por rango y devolvemos exactamente lo que cabe en el rango sin
  // tope artificial de páginas. Mantenemos el filtrado cliente-side como
  // safety net por si Holded ignora los timestamps en algún endpoint.
  const starttmp = Math.floor(args.range.from.getTime() / 1000);
  const endtmp = Math.floor(args.range.to.getTime() / 1000);

  const scanStartedAt = Date.now();

  for (let currentPage = 1; currentPage <= scanLimit; currentPage += 1) {
    // Si el escaneo ya consumió su presupuesto de tiempo, paramos y devolvemos
    // lo acumulado. No marcamos reachedEnd: el meta refleja que el rango pudo
    // no haberse cubierto entero (pagesScanned < scanLimit && !reachedEnd).
    if (currentPage > 1 && Date.now() - scanStartedAt > HOLDED_HISTORY_SCAN_BUDGET_MS) {
      break;
    }

    const batch = await holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: `/api/invoicing/v1/documents/${docType}`,
      query: {
        page: currentPage,
        limit: HOLDED_HISTORY_FETCH_LIMIT,
        status: args.status,
        starttmp,
        endtmp,
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

/**
 * V3.G.2 (2026-06-01): auto-pagina Holded /dailyledger desde page=1 hasta
 * recibir menos de HOLDED_LEDGER_PAGE_SIZE entries o llegar al cap
 * HOLDED_LEDGER_MAX_PAGES (default 10 = ~2500 entries). El array agregado
 * se devuelve SIN sortear — el caller aplica sortHoldedJournalEntries.
 *
 * Si el caller quiere paginar manualmente con `page=N` el array agregado,
 * usa `paginateArrayResponse` después (compat hacia atrás).
 *
 * Ver docs/engineering/connectors/HOLDED_API_QUIRKS.md Q6.2 para el
 * contexto del bug que cerramos con esta función.
 */
async function fetchHoldedDailyLedgerAllPages(
  apiKey: string,
  args: { starttmp?: number; endtmp?: number }
): Promise<Record<string, unknown>[]> {
  const aggregated: Record<string, unknown>[] = [];
  for (let page = 1; page <= HOLDED_LEDGER_MAX_PAGES; page++) {
    const pageItems = await holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: '/api/accounting/v1/dailyledger',
      query: {
        page,
        starttmp: args.starttmp,
        endtmp: args.endtmp,
      },
    });
    const items = Array.isArray(pageItems) ? pageItems : [];
    aggregated.push(...items);
    // Si la página llegó parcial (< pageSize), asumimos que ya hemos
    // consumido el dataset completo. Si llegó con exactamente pageSize o
    // más, intentamos la siguiente.
    if (items.length < HOLDED_LEDGER_PAGE_SIZE) break;
  }
  return aggregated;
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
      const items = await listTypedDocuments(apiKey, args.docType, args);
      return attachDocType(items, args.docType);
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
      const items = scan.entries
        .slice(offset, offset + limit)
        .map((entry) => ({ ...entry.item, docType: args.docType }));

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

  async listContacts(
    apiKey: string,
    args?: {
      page?: number;
      limit?: number;
      name?: string;
      type?: 'client' | 'supplier' | 'lead';
    }
  ) {
    const contacts = await holdedRequest<HoldedContact[]>({
      apiKey,
      path: '/api/invoicing/v1/contacts',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
        ...(args?.name ? { name: args.name } : {}),
        ...(args?.type ? { type: args.type } : {}),
      },
    });

    // V3.F (auditoría 2026-06-01): el server-side filter de Holded `type=supplier`
    // devuelve contactos cuyo `type` está marcado como "supplier" PERO algunos
    // tienen `supplierRecord: 0` (rol histórico, ya no es proveedor activo).
    // Para que list_contacts devuelva resultados fiables cuando se pide un rol
    // específico, aplicamos un filtro client-side adicional:
    //   - type=supplier → exigimos supplierRecord truthy (> 0 o objeto presente)
    //   - type=client → exigimos clientRecord truthy
    //   - type=lead → se respeta el filtro server-side sin extras
    const filteredByRole = (() => {
      const raw = filterContactsByName(contacts, args?.name);
      if (!args?.type || args.type === 'lead') return raw;
      return raw.filter((c) => {
        const record = args.type === 'supplier' ? c.supplierRecord : c.clientRecord;
        if (record === undefined || record === null) return true;
        if (typeof record === 'number') return record > 0;
        if (typeof record === 'object') return Object.keys(record).length > 0;
        return Boolean(record);
      });
    })();

    return paginateArrayResponse(filteredByRole, args, {
      enabled: true,
    });
  },

  async getContact(apiKey: string, contactId: string) {
    return holdedRequest<HoldedContact>({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}`,
    });
  },

  async listContactAttachments(apiKey: string, contactId: string) {
    // Holded returns {status:1, attachments:[...]} — extract the array defensively.
    const raw = await holdedRequest<{ attachments?: unknown[] } | unknown[]>({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}/attachments/list`,
    });
    return Array.isArray(raw) ? raw : ((raw as { attachments?: unknown[] }).attachments ?? []);
  },

  async getContactAttachment(apiKey: string, contactId: string, fileName: string) {
    const attachment = await holdedBinaryRequest({
      apiKey,
      path: `/api/invoicing/v1/contacts/${contactId}/attachments/get`,
      query: { filename: fileName },
      accept: 'application/octet-stream, image/*, application/pdf, application/json',
      defaultContentType: 'application/octet-stream',
    });

    // V3.F.II: misma validación que getDocumentPdf. Holded puede devolver
    // 200+JSON cuando el attachment no existe (filename mal escrito, contacto
    // sin documentos adjuntos, etc.). Aceptamos cualquier tipo binario
    // (PDF, imagen, octet-stream) pero rechazamos JSON disfrazado.
    ensureHoldedBinaryNotJsonError(attachment, {
      expectedKind: 'any',
      pathLabel: `contact ${contactId} / ${fileName}`,
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

    ensureHoldedBinaryNotJsonError(pdf, {
      expectedKind: 'pdf',
      pathLabel: `${docType}/${documentId}`,
    });

    return {
      ...pdf,
      contentType: pdf.contentType?.toLowerCase().startsWith('application/pdf')
        ? pdf.contentType
        : 'application/pdf',
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
    args?: { page?: number; limit?: number; starttmp?: number; endtmp?: number }
  ) {
    // V3.G.2 (auditoría 2026-06-01, post-investigación spec OpenAPI Holded):
    // Holded /dailyledger PAGINA con tamaño real ~250 (no 500 como dice la
    // doc oficial). El reviewer reportó "155 de 408 asientos reales" porque
    // antes hacíamos UNA sola llamada sin iterar. Fix: auto-paginar server-
    // side desde page=1 hasta recibir menos de HOLDED_LEDGER_PAGE_SIZE
    // entries (o llegar al cap HOLDED_LEDGER_MAX_PAGES) y devolver el array
    // agregado y sorteado.
    //
    // El parámetro `page` que el caller pase se mantiene como "slice
    // client-side" sobre el array agregado (compat hacia atrás con clientes
    // que iteran page por page).
    const aggregated = await fetchHoldedDailyLedgerAllPages(apiKey, {
      starttmp: args?.starttmp,
      endtmp: args?.endtmp,
    });
    const sorted = sortHoldedJournalEntries(aggregated);
    return paginateArrayResponse(sorted, args, { enabled: true });
  },

  async createDailyLedgerEntry(apiKey: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: '/api/accounting/v1/entry',
      body: payload,
    });
  },

  async listAccounts(apiKey: string, args?: HoldedAccountListArgs) {
    const accounts = await holdedRequest<HoldedAccount[]>({
      apiKey,
      path: HOLDED_CHART_OF_ACCOUNTS_PATH,
      query: {
        page: args?.page,
        limit: args?.limit,
        starttmp: args?.starttmp,
        endtmp: args?.endtmp,
        includeEmpty: args?.includeEmpty === false ? 0 : 1,
      },
    });
    return paginateArrayResponse(accounts, args, {
      enabled: args?.page !== undefined || args?.limit !== undefined,
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

    // V3.F.II: producto sin imagen principal → Holded devuelve 200+JSON.
    // Validamos magic bytes de imagen (PNG, JPEG, GIF, WebP, BMP) o
    // content-type image/*. Si falla, propagamos el mensaje de error real.
    ensureHoldedBinaryNotJsonError(image, {
      expectedKind: 'image',
      pathLabel: `product ${productId} main image`,
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

    // V3.F.II: misma validación que getProductMainImage para imagen secundaria.
    ensureHoldedBinaryNotJsonError(image, {
      expectedKind: 'image',
      pathLabel: `product ${productId} / image ${imageFileName}`,
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

  async listPayments(apiKey: string, args?: HoldedPaymentListArgs) {
    return holdedRequest<Record<string, unknown>[]>({
      apiKey,
      path: '/api/invoicing/v1/payments',
      query: {
        page: args?.page ?? 1,
        limit: args?.limit ?? 25,
        starttmp: args?.starttmp,
        endtmp: args?.endtmp,
      },
    });
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

  /**
   * List CRM funnels (sales pipelines) configured in Holded. Read-only.
   * Source: https://developers.holded.com/reference/funnels
   */
  async listCrmFunnels(apiKey: string) {
    return holdedRequest<unknown[]>({
      apiKey,
      path: '/api/crm/v1/funnels',
    });
  },

  /**
   * List CRM leads in Holded. Optionally scoped to a single funnel.
   * Holded uses `/leads` (not `/deals`). Source:
   * https://developers.holded.com/reference/leads
   */
  async listLeads(apiKey: string, args?: { funnelId?: string; page?: number; limit?: number }) {
    const query: Record<string, string | number | boolean | null | undefined> = {
      page: args?.page ?? 1,
      limit: args?.limit ?? 25,
    };
    if (args?.funnelId) query.funnelId = args.funnelId;
    return holdedRequest<unknown[]>({
      apiKey,
      path: '/api/crm/v1/leads',
      query,
    });
  },

  /**
   * List time-tracking records imputed against a specific Holded project.
   * Read-only. Source: https://developers.holded.com/reference/getprojecttimes
   */
  async listProjectTimeRecords(
    apiKey: string,
    projectId: string,
    args?: { page?: number; limit?: number }
  ) {
    return holdedRequest<unknown[]>({
      apiKey,
      path: `/api/projects/v1/projects/${projectId}/times`,
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
    // Holded NO expone endpoint público `/projects/{id}/tasks` — devuelve HTML
    // 404 (incidencia QA 2026-05-11). Las tasks vienen embebidas dentro del
    // objeto Project, así que hacemos GET al proyecto y extraemos el array
    // `tasks` con paginación cliente-side.
    const project = await holdedRequest<Record<string, unknown>>({
      apiKey,
      path: '/api/projects/v1/projects/' + projectId,
    });

    const rawTasks =
      (project && Array.isArray(project.tasks) && project.tasks) ||
      (project && Array.isArray((project as Record<string, unknown>).tasksList)
        ? ((project as Record<string, unknown>).tasksList as unknown[])
        : []);

    const tasks = (rawTasks as HoldedProjectTask[]).map((t) => ({ ...t, projectId }));
    const page = Math.max(1, Math.trunc(args?.page ?? 1));
    const limit = Math.max(1, Math.min(100, Math.trunc(args?.limit ?? 25)));
    const start = (page - 1) * limit;
    return tasks.slice(start, start + limit);
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

  async getEmployee(apiKey: string, employeeId: string) {
    return holdedRequest<HoldedEmployee>({
      apiKey,
      path: `/api/team/v1/employees/${employeeId}`,
    });
  },

  async createEmployee(apiKey: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: '/api/team/v1/employees',
      body: payload,
    });
  },

  async updateEmployee(apiKey: string, employeeId: string, payload: HoldedEntityPayload) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'PUT',
      path: `/api/team/v1/employees/${employeeId}`,
      body: payload,
    });
  },

  async clockInEmployee(apiKey: string, employeeId: string, payload: HoldedEntityPayload = {}) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/team/v1/employees/${employeeId}/times/clockin`,
      body: payload,
    });
  },

  async clockOutEmployee(apiKey: string, employeeId: string, payload: HoldedEntityPayload = {}) {
    return holdedRequest<Record<string, unknown>>({
      apiKey,
      method: 'POST',
      path: `/api/team/v1/employees/${employeeId}/times/clockout`,
      body: payload,
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
