/**
 * Conector health checks: definición + ejecución.
 *
 * Dos familias de checks:
 *
 *  1. Superficie pública (`kind: 'surface'`) — probes HTTP a endpoints
 *     públicos del conector SIN token: landings, OAuth discovery, MCP
 *     initialize, tools/list. Verifican que el conector está "de cara".
 *
 *  2. Tools en vivo (`kind: 'tool'`) — probes autenticados a la API de
 *     Holded (api.holded.com) usando `HOLDED_TEST_API_KEY`, una por cada
 *     tool expuesta por cada conector. Verifican que el dato que la tool
 *     consume está realmente accesible (no HTML, no 5xx, JSON bien formado).
 *     Solo se registran si `HOLDED_TEST_API_KEY` está configurada — en
 *     entornos sin la clave la familia entera queda fuera (degradación
 *     limpia, sin falsos rojos).
 *
 * Diseñado para Vercel Cron — corre todos los checks en paralelo, persiste
 * resultados en `connector_health_checks`, y alimenta el endpoint público
 * /api/public/status/{connector} que la landing renderiza.
 */

export type ConnectorId = 'chatgpt' | 'claude';
export type CheckKind = 'surface' | 'tool';
export type CheckStatus = 'ok' | 'degraded' | 'fail';
export type CheckErrorCode =
  | 'timeout'
  | 'network'
  | 'non_2xx'
  | 'invalid_json'
  | 'missing_field'
  | 'tool_count_mismatch'
  | 'rpc_error'
  | 'unexpected_status'
  | 'html_response'
  | 'soft_error';

export interface HealthCheckResult {
  connector: ConnectorId;
  checkType: string;
  target: string;
  status: CheckStatus;
  latencyMs: number;
  httpStatus: number | null;
  errorCode: CheckErrorCode | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
}

/** Resultado de un probe a la tool (familia `tool`). */
interface ToolProbeOutcome {
  error: CheckErrorCode | null;
  message: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Resultado crudo de un GET a la API de Holded. */
interface HoldedGetResult {
  ok: boolean;
  httpStatus: number;
  isHtml: boolean;
  softError: boolean;
  json: unknown;
}

interface ToolProbeContext {
  /** GET a un path de api.holded.com con la `key` de test + 1 reintento. */
  get: (path: string) => Promise<HoldedGetResult>;
}

type ProbeMode =
  | { kind: 'get'; expectStatus?: number }
  | { kind: 'json_get'; expectStatus?: number; validate: (body: unknown) => string | null }
  | {
      kind: 'json_rpc_post';
      body: Record<string, unknown>;
      expectStatus?: number;
      validate: (body: unknown) => {
        error: CheckErrorCode | null;
        message: string | null;
        metadata?: Record<string, unknown> | null;
      };
    }
  | {
      kind: 'holded_tool';
      /** Path principal que la tool consume (solo para auditoría en `target`). */
      primaryPath: string;
      run: (ctx: ToolProbeContext) => Promise<ToolProbeOutcome>;
    };

interface CheckDefinition {
  connector: ConnectorId;
  kind: CheckKind;
  checkType: string;
  target: string;
  probe: ProbeMode;
  /** Latencia por encima de la cual el check pasa a `degraded` aunque sea 2xx. */
  degradedAboveMs?: number;
  /** Timeout absoluto del fetch. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_DEGRADED_ABOVE_MS = 3000;

// Las tools en vivo pueden encadenar 2 llamadas a Holded (list + get) y la
// API de Holded es más lenta que nuestra propia superficie pública.
const TOOL_TIMEOUT_MS = 12000;
const TOOL_DEGRADED_ABOVE_MS = 6000;

const HOLDED_PUBLIC_URL =
  process.env.HEALTH_HOLDED_PUBLIC_URL?.trim() || 'https://holded.verifactu.business';
const CHATGPT_MCP_URL =
  process.env.HEALTH_CHATGPT_MCP_URL?.trim() || `${HOLDED_PUBLIC_URL}/api/mcp/holded`;
const CLAUDE_PUBLIC_URL =
  process.env.HEALTH_CLAUDE_PUBLIC_URL?.trim() || 'https://claude.verifactu.business';
const CLAUDE_MCP_URL = process.env.HEALTH_CLAUDE_MCP_URL?.trim() || `${CLAUDE_PUBLIC_URL}/mcp`;
const HOLDED_API_BASE =
  process.env.HEALTH_HOLDED_API_BASE?.trim() || 'https://api.holded.com';

/**
 * API key de la cuenta Holded de pruebas. La misma que usan los smoke-tests
 * del panel admin. Si no está configurada, la familia `tool` no se registra.
 */
function getHoldedTestApiKey(): string | null {
  return process.env.HOLDED_TEST_API_KEY?.trim() || null;
}

// 2026-05-18 (tarde): VUELTO a 10 al cambiar DEFAULT_PUBLIC_SCOPE_PRESET de
// `claude_parity` (29) a `openai_review_invoicing_v1` (10: 9 read + 1 write).
// Submission v2 a OpenAI con superficie mínima defendible (invoicing venta+compra
// + contactos + contabilidad). Cuando OpenAI apruebe ampliaremos a claude_parity
// como submission v3. El número debe coincidir con `tools/list` runtime.
const CHATGPT_EXPECTED_TOOL_COUNT = Number(process.env.HEALTH_CHATGPT_EXPECTED_TOOL_COUNT || '10');

function expectOauthDiscovery(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'response is not an object';
  const o = body as Record<string, unknown>;
  const required = ['issuer', 'authorization_endpoint', 'token_endpoint', 'registration_endpoint'];
  for (const field of required) {
    if (typeof o[field] !== 'string' || !o[field]) return `missing field: ${field}`;
  }
  return null;
}

function expectProtectedResource(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'response is not an object';
  const o = body as Record<string, unknown>;
  if (typeof o.resource !== 'string' || !o.resource) return 'missing field: resource';
  return null;
}

function expectClaudeHealth(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'response is not an object';
  const o = body as Record<string, unknown>;
  if (o.status !== 'ok') return `status is not "ok" (got ${JSON.stringify(o.status)})`;
  return null;
}

// ─── Probes de tools en vivo (familia `tool`) ────────────────────────────────

/** Detecta el error blando de Holded: 200 OK con `{ status: 0, info: "..." }`. */
function isHoldedSoftError(json: unknown): boolean {
  return (
    !!json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    'status' in json &&
    (json as { status?: unknown }).status === 0
  );
}

/** GET a la API de Holded con `key` header, 1 reintento ante fallo transitorio. */
async function holdedGet(
  apiKey: string,
  path: string,
  signal: AbortSignal
): Promise<HoldedGetResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${HOLDED_API_BASE}${path}`, {
        method: 'GET',
        headers: {
          key: apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          // Holded devuelve a veces brotli que undici decodifica mal detrás de
          // proxies edge — forzamos identity, igual que HoldedClient.
          'Accept-Encoding': 'identity',
        },
        redirect: 'follow',
        cache: 'no-store',
        signal,
      });
      const text = await res.text();
      const isHtml = text.trimStart().startsWith('<');
      let json: unknown = null;
      if (!isHtml && text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      // Reintentar una vez ante 429 / 5xx transitorio.
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      return {
        ok: res.ok,
        httpStatus: res.status,
        isHtml,
        softError: isHoldedSoftError(json),
        json,
      };
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && !(err instanceof Error && err.name === 'AbortError')) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr ?? new Error(`holdedGet failed: ${path}`);
}

/** Valida un GET genérico de Holded (no HTML, 2xx, sin soft error). */
function validateHoldedResponse(r: HoldedGetResult): ToolProbeOutcome | null {
  if (r.isHtml) {
    return { error: 'html_response', message: `Holded devolvió HTML (HTTP ${r.httpStatus})` };
  }
  if (!r.ok) {
    return { error: 'non_2xx', message: `Holded respondió HTTP ${r.httpStatus}` };
  }
  if (r.softError) {
    const info = (r.json as { info?: unknown }).info;
    return {
      error: 'soft_error',
      message: typeof info === 'string' ? info : 'Holded soft error (status:0)',
    };
  }
  return null;
}

/** Probe de una tool tipo "list*": espera un array JSON. */
function probeList(path: string, noun: string) {
  return async ({ get }: ToolProbeContext): Promise<ToolProbeOutcome> => {
    const r = await get(path);
    const issue = validateHoldedResponse(r);
    if (issue) return issue;
    if (!Array.isArray(r.json)) {
      return { error: 'invalid_json', message: `respuesta de ${noun} no es un array` };
    }
    return { error: null, message: `${r.json.length} ${noun}`, metadata: { itemCount: r.json.length } };
  };
}

/** Probe de una tool tipo "get*": lista, toma el primer id y pide el detalle. */
function probeDetail(listPath: string, detail: (id: string) => string, noun: string) {
  return async ({ get }: ToolProbeContext): Promise<ToolProbeOutcome> => {
    const list = await get(listPath);
    const listIssue = validateHoldedResponse(list);
    if (listIssue) return listIssue;
    if (!Array.isArray(list.json)) {
      return { error: 'invalid_json', message: `listado de ${noun} no es un array` };
    }
    const first = list.json[0] as { id?: unknown } | undefined;
    const id = first && typeof first.id === 'string' ? first.id : null;
    if (!id) {
      return { error: null, message: `sin ${noun} para verificar detalle (cuenta vacía)` };
    }
    const r = await get(detail(id));
    const issue = validateHoldedResponse(r);
    if (issue) return issue;
    return { error: null, message: `detalle de ${noun} accesible`, metadata: { sampleId: id } };
  };
}

/** Probe de la tool de PDF: lista documentos y pide el PDF del primero. */
function probePdf(listPath: string, docType: 'invoice' | 'purchase' = 'invoice') {
  return async ({ get }: ToolProbeContext): Promise<ToolProbeOutcome> => {
    const list = await get(listPath);
    const listIssue = validateHoldedResponse(list);
    if (listIssue) return listIssue;
    if (!Array.isArray(list.json)) {
      return { error: 'invalid_json', message: 'listado de documentos no es un array' };
    }
    const first = list.json[0] as { id?: unknown } | undefined;
    const id = first && typeof first.id === 'string' ? first.id : null;
    if (!id) {
      return { error: null, message: 'sin documentos para verificar PDF (cuenta vacía)' };
    }
    const r = await get(`/api/invoicing/v1/documents/${docType}/${id}/pdf`);
    if (r.isHtml) {
      return { error: 'html_response', message: `endpoint PDF devolvió HTML (HTTP ${r.httpStatus})` };
    }
    if (!r.ok) {
      return { error: 'non_2xx', message: `endpoint PDF respondió HTTP ${r.httpStatus}` };
    }
    if (r.softError) {
      return { error: 'soft_error', message: 'Holded soft error al generar el PDF' };
    }
    return { error: null, message: 'PDF de documento accesible' };
  };
}

/** Probe de precondición para una tool de escritura (no muta nada). */
function probePrecondition(path: string, label: string) {
  return async ({ get }: ToolProbeContext): Promise<ToolProbeOutcome> => {
    const r = await get(path);
    const issue = validateHoldedResponse(r);
    if (issue) return issue;
    return { error: null, message: `precondición OK · ${label}` };
  };
}

const DOCS_INVOICE = '/api/invoicing/v1/documents/invoice?page=1';
const DOCS_PURCHASE = '/api/invoicing/v1/documents/purchase?page=1';
const CONTACTS = '/api/invoicing/v1/contacts?page=1';
const CHART_OF_ACCOUNTS = '/api/accounting/v1/chartofaccounts?includeEmpty=1';

function dailyLedgerPath(): string {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 30 * 24 * 60 * 60;
  return `/api/accounting/v1/dailyledger?starttmp=${start}&endtmp=${now}&page=1`;
}

/**
 * Definición declarativa de las tools en vivo por conector. El `checkType`
 * lleva prefijo `tool_` para que el endpoint público y el badge las puedan
 * separar de la superficie pública.
 */
interface ToolCheckSpec {
  connector: ConnectorId;
  checkType: string;
  primaryPath: string;
  run: (ctx: ToolProbeContext) => Promise<ToolProbeOutcome>;
}

function toolCheckSpecs(): ToolCheckSpec[] {
  return [
    // ─── Claude · preset submission_v1 (8 tools) ──────────────────────────────
    {
      connector: 'claude',
      checkType: 'tool_list_documents',
      primaryPath: DOCS_INVOICE,
      run: probeList(DOCS_INVOICE, 'facturas'),
    },
    {
      connector: 'claude',
      checkType: 'tool_get_document',
      primaryPath: DOCS_INVOICE,
      run: probeDetail(DOCS_INVOICE, (id) => `/api/invoicing/v1/documents/invoice/${id}`, 'facturas'),
    },
    {
      connector: 'claude',
      checkType: 'tool_get_document_pdf',
      primaryPath: DOCS_INVOICE,
      run: probePdf(DOCS_INVOICE),
    },
    {
      connector: 'claude',
      checkType: 'tool_list_contacts',
      primaryPath: CONTACTS,
      run: probeList(CONTACTS, 'contactos'),
    },
    {
      connector: 'claude',
      checkType: 'tool_get_contact',
      primaryPath: CONTACTS,
      run: probeDetail(CONTACTS, (id) => `/api/invoicing/v1/contacts/${id}`, 'contactos'),
    },
    {
      connector: 'claude',
      checkType: 'tool_get_chart_of_accounts',
      primaryPath: CHART_OF_ACCOUNTS,
      run: probeList(CHART_OF_ACCOUNTS, 'cuentas contables'),
    },
    {
      connector: 'claude',
      checkType: 'tool_get_journal',
      primaryPath: '/api/accounting/v1/dailyledger',
      run: probeList(dailyLedgerPath(), 'apuntes del diario'),
    },
    {
      connector: 'claude',
      checkType: 'tool_create_invoice_draft',
      primaryPath: CONTACTS,
      run: probePrecondition(CONTACTS, 'contactos disponibles para el borrador'),
    },

    // ─── ChatGPT · preset openai_review_invoicing_v1 (10 tools) ────────────────
    {
      connector: 'chatgpt',
      checkType: 'tool_list_invoices',
      primaryPath: DOCS_INVOICE,
      run: probeList(DOCS_INVOICE, 'facturas'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_get_invoice',
      primaryPath: DOCS_INVOICE,
      run: probeDetail(DOCS_INVOICE, (id) => `/api/invoicing/v1/documents/invoice/${id}`, 'facturas'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_list_documents',
      primaryPath: DOCS_PURCHASE,
      run: probeList(DOCS_PURCHASE, 'compras'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_get_document',
      primaryPath: DOCS_PURCHASE,
      run: probeDetail(
        DOCS_PURCHASE,
        (id) => `/api/invoicing/v1/documents/purchase/${id}`,
        'compras'
      ),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_get_document_pdf',
      primaryPath: DOCS_PURCHASE,
      run: probePdf(DOCS_PURCHASE, 'purchase'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_list_contacts',
      primaryPath: CONTACTS,
      run: probeList(CONTACTS, 'contactos'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_get_contact',
      primaryPath: CONTACTS,
      run: probeDetail(CONTACTS, (id) => `/api/invoicing/v1/contacts/${id}`, 'contactos'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_list_accounts',
      primaryPath: CHART_OF_ACCOUNTS,
      run: probeList(CHART_OF_ACCOUNTS, 'cuentas contables'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_list_daily_ledger',
      primaryPath: '/api/accounting/v1/dailyledger',
      run: probeList(dailyLedgerPath(), 'apuntes del diario'),
    },
    {
      connector: 'chatgpt',
      checkType: 'tool_create_invoice_draft',
      primaryPath: CONTACTS,
      run: probePrecondition(CONTACTS, 'contactos disponibles para el borrador'),
    },
  ];
}

function surfaceChecks(): CheckDefinition[] {
  return [
    // ─── ChatGPT MCP ──────────────────────────────────────────────────────────
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'landing',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'docs',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/docs`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'privacy',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/privacy`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'terms',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/terms`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'dpa',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/dpa`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'oauth_discovery',
      target: `${HOLDED_PUBLIC_URL}/.well-known/oauth-authorization-server`,
      probe: { kind: 'json_get', validate: expectOauthDiscovery },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'protected_resource',
      target: `${HOLDED_PUBLIC_URL}/.well-known/oauth-protected-resource/api/mcp/holded`,
      probe: { kind: 'json_get', validate: expectProtectedResource },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'mcp_initialize',
      target: CHATGPT_MCP_URL,
      probe: {
        kind: 'json_rpc_post',
        body: { jsonrpc: '2.0', id: 1, method: 'initialize' },
        validate: (body) => {
          const o = body as { result?: { serverInfo?: { name?: string } } };
          const name = o?.result?.serverInfo?.name;
          if (typeof name !== 'string' || !name)
            return {
              error: 'missing_field',
              message: 'result.serverInfo.name missing',
              metadata: null,
            };
          return { error: null, message: null, metadata: { serverName: name } };
        },
      },
    },
    {
      connector: 'chatgpt',
      kind: 'surface',
      checkType: 'tools_list',
      target: CHATGPT_MCP_URL,
      probe: {
        kind: 'json_rpc_post',
        body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
        validate: (body) => {
          const o = body as { result?: { tools?: unknown[] } };
          const tools = o?.result?.tools;
          if (!Array.isArray(tools))
            return {
              error: 'missing_field',
              message: 'result.tools is not an array',
              metadata: null,
            };
          if (tools.length !== CHATGPT_EXPECTED_TOOL_COUNT)
            return {
              error: 'tool_count_mismatch',
              message: `expected ${CHATGPT_EXPECTED_TOOL_COUNT} tools, got ${tools.length}`,
              metadata: { toolCount: tools.length, expected: CHATGPT_EXPECTED_TOOL_COUNT },
            };
          return { error: null, message: null, metadata: { toolCount: tools.length } };
        },
      },
    },

    // ─── Claude MCP ────────────────────────────────────────────────────────────
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'landing',
      target: `${CLAUDE_PUBLIC_URL}/`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'health',
      target: `${CLAUDE_PUBLIC_URL}/health`,
      probe: { kind: 'json_get', validate: expectClaudeHealth },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'docs',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/docs`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'privacy',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/privacy`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'terms',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/terms`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'dpa',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/dpa`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'oauth_discovery',
      target: `${CLAUDE_PUBLIC_URL}/.well-known/oauth-authorization-server`,
      probe: { kind: 'json_get', validate: expectOauthDiscovery },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'protected_resource',
      target: `${CLAUDE_PUBLIC_URL}/.well-known/oauth-protected-resource`,
      probe: { kind: 'json_get', validate: expectProtectedResource },
    },
    {
      connector: 'claude',
      kind: 'surface',
      checkType: 'mcp_requires_auth',
      target: CLAUDE_MCP_URL,
      probe: {
        kind: 'json_rpc_post',
        body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        expectStatus: 401, // Claude MCP requires Bearer for any method
        validate: () => ({ error: null, message: null, metadata: null }),
      },
    },
  ];
}

function checks(): CheckDefinition[] {
  const surface = surfaceChecks();

  // La familia `tool` solo se registra si hay clave de test. Sin clave, no
  // hay forma honesta de probar las tools — mejor no mostrarlas que mostrar
  // un rojo falso en la landing pública.
  const apiKey = getHoldedTestApiKey();
  if (!apiKey) return surface;

  const toolChecks: CheckDefinition[] = toolCheckSpecs().map((spec) => ({
    connector: spec.connector,
    kind: 'tool',
    checkType: spec.checkType,
    target: `${HOLDED_API_BASE}${spec.primaryPath}`,
    timeoutMs: TOOL_TIMEOUT_MS,
    degradedAboveMs: TOOL_DEGRADED_ABOVE_MS,
    probe: { kind: 'holded_tool', primaryPath: spec.primaryPath, run: spec.run },
  }));

  return [...surface, ...toolChecks];
}

async function runProbe(def: CheckDefinition): Promise<HealthCheckResult> {
  const timeoutMs = def.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const degradedAboveMs = def.degradedAboveMs ?? DEFAULT_DEGRADED_ABOVE_MS;
  const startedAt = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  const base = {
    connector: def.connector,
    checkType: def.checkType,
    target: def.target,
  } as const;

  try {
    // ─── Familia `tool`: probe autenticado a la API de Holded ──────────────
    if (def.probe.kind === 'holded_tool') {
      const apiKey = getHoldedTestApiKey();
      if (!apiKey) {
        return {
          ...base,
          status: 'fail',
          latencyMs: Date.now() - startedAt,
          httpStatus: null,
          errorCode: 'network',
          errorMessage: 'HOLDED_TEST_API_KEY no configurada',
          metadata: null,
        };
      }
      const ctx: ToolProbeContext = {
        get: (path) => holdedGet(apiKey, path, ctrl.signal),
      };
      const outcome = await def.probe.run(ctx);
      const latencyMs = Date.now() - startedAt;
      if (outcome.error) {
        return {
          ...base,
          status: 'fail',
          latencyMs,
          httpStatus: null,
          errorCode: outcome.error,
          errorMessage: outcome.message,
          metadata: outcome.metadata ?? null,
        };
      }
      return {
        ...base,
        status: latencyMs > degradedAboveMs ? 'degraded' : 'ok',
        latencyMs,
        httpStatus: null,
        errorCode: null,
        errorMessage: outcome.message,
        metadata:
          latencyMs > degradedAboveMs
            ? { ...(outcome.metadata ?? {}), reason: 'slow_response', thresholdMs: degradedAboveMs }
            : (outcome.metadata ?? null),
      };
    }

    // ─── Familia `surface`: probe HTTP a superficie pública ────────────────
    let response: Response;
    if (def.probe.kind === 'get' || def.probe.kind === 'json_get') {
      response = await fetch(def.target, {
        method: 'GET',
        headers: { Accept: 'application/json,text/html;q=0.9,*/*;q=0.1' },
        redirect: 'follow',
        signal: ctrl.signal,
        cache: 'no-store',
      });
    } else {
      response = await fetch(def.target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(def.probe.body),
        redirect: 'manual',
        signal: ctrl.signal,
        cache: 'no-store',
      });
    }

    const latencyMs = Date.now() - startedAt;
    const expectStatus =
      def.probe.kind === 'json_rpc_post'
        ? (def.probe.expectStatus ?? 200)
        : (def.probe.expectStatus ?? 200);

    if (response.status !== expectStatus) {
      return {
        ...base,
        status: 'fail',
        latencyMs,
        httpStatus: response.status,
        errorCode: 'non_2xx',
        errorMessage: `expected HTTP ${expectStatus}, got ${response.status}`,
        metadata: null,
      };
    }

    if (def.probe.kind === 'get') {
      return {
        ...base,
        status: latencyMs > degradedAboveMs ? 'degraded' : 'ok',
        latencyMs,
        httpStatus: response.status,
        errorCode: null,
        errorMessage: null,
        metadata:
          latencyMs > degradedAboveMs
            ? { reason: 'slow_response', thresholdMs: degradedAboveMs }
            : null,
      };
    }

    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      return {
        ...base,
        status: 'fail',
        latencyMs,
        httpStatus: response.status,
        errorCode: 'invalid_json',
        errorMessage: `response body is not valid JSON (first 80 chars: ${text.slice(0, 80)})`,
        metadata: null,
      };
    }

    if (def.probe.kind === 'json_get') {
      const issue = def.probe.validate(body);
      if (issue) {
        return {
          ...base,
          status: 'fail',
          latencyMs,
          httpStatus: response.status,
          errorCode: 'missing_field',
          errorMessage: issue,
          metadata: null,
        };
      }
      return {
        ...base,
        status: latencyMs > degradedAboveMs ? 'degraded' : 'ok',
        latencyMs,
        httpStatus: response.status,
        errorCode: null,
        errorMessage: null,
        metadata:
          latencyMs > degradedAboveMs
            ? { reason: 'slow_response', thresholdMs: degradedAboveMs }
            : null,
      };
    }

    // json_rpc_post
    const validation = def.probe.validate(body);
    if (validation.error) {
      return {
        ...base,
        status: 'fail',
        latencyMs,
        httpStatus: response.status,
        errorCode: validation.error,
        errorMessage: validation.message,
        metadata: validation.metadata ?? null,
      };
    }
    return {
      ...base,
      status: latencyMs > degradedAboveMs ? 'degraded' : 'ok',
      latencyMs,
      httpStatus: response.status,
      errorCode: null,
      errorMessage: null,
      metadata: validation.metadata ?? null,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ...base,
      status: 'fail',
      latencyMs,
      httpStatus: null,
      errorCode: isAbort ? 'timeout' : 'network',
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runAllConnectorHealthChecks(): Promise<HealthCheckResult[]> {
  const defs = checks();
  return Promise.all(defs.map((def) => runProbe(def)));
}

export function getCheckDefinitions(): ReadonlyArray<{
  connector: ConnectorId;
  kind: CheckKind;
  checkType: string;
  target: string;
}> {
  return checks().map(({ connector, kind, checkType, target }) => ({
    connector,
    kind,
    checkType,
    target,
  }));
}
