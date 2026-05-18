/**
 * Conector health checks: definición + ejecución.
 *
 * Cada check es una probe HTTP a un endpoint público del conector (sin token).
 * Diseñado para Vercel Cron — corre los ~16 checks en paralelo, persiste
 * resultados en `connector_health_checks`, y alimenta el endpoint público
 * /api/public/status/{connector} que la landing renderiza.
 */

export type ConnectorId = 'chatgpt' | 'claude';
export type CheckStatus = 'ok' | 'degraded' | 'fail';
export type CheckErrorCode =
  | 'timeout'
  | 'network'
  | 'non_2xx'
  | 'invalid_json'
  | 'missing_field'
  | 'tool_count_mismatch'
  | 'rpc_error'
  | 'unexpected_status';

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
    };

interface CheckDefinition {
  connector: ConnectorId;
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

const HOLDED_PUBLIC_URL =
  process.env.HEALTH_HOLDED_PUBLIC_URL?.trim() || 'https://holded.verifactu.business';
const CHATGPT_MCP_URL =
  process.env.HEALTH_CHATGPT_MCP_URL?.trim() || `${HOLDED_PUBLIC_URL}/api/mcp/holded`;
const CLAUDE_PUBLIC_URL =
  process.env.HEALTH_CLAUDE_PUBLIC_URL?.trim() || 'https://claude.verifactu.business';
const CLAUDE_MCP_URL = process.env.HEALTH_CLAUDE_MCP_URL?.trim() || `${CLAUDE_PUBLIC_URL}/mcp`;

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

function checks(): CheckDefinition[] {
  return [
    // ─── ChatGPT MCP ──────────────────────────────────────────────────────────
    {
      connector: 'chatgpt',
      checkType: 'landing',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      checkType: 'docs',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/docs`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      checkType: 'privacy',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/privacy`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      checkType: 'terms',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/terms`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      checkType: 'dpa',
      target: `${HOLDED_PUBLIC_URL}/conectores/chatgpt/dpa`,
      probe: { kind: 'get' },
    },
    {
      connector: 'chatgpt',
      checkType: 'oauth_discovery',
      target: `${HOLDED_PUBLIC_URL}/.well-known/oauth-authorization-server`,
      probe: { kind: 'json_get', validate: expectOauthDiscovery },
    },
    {
      connector: 'chatgpt',
      checkType: 'protected_resource',
      target: `${HOLDED_PUBLIC_URL}/.well-known/oauth-protected-resource/api/mcp/holded`,
      probe: { kind: 'json_get', validate: expectProtectedResource },
    },
    {
      connector: 'chatgpt',
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
      checkType: 'landing',
      target: `${CLAUDE_PUBLIC_URL}/`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      checkType: 'health',
      target: `${CLAUDE_PUBLIC_URL}/health`,
      probe: { kind: 'json_get', validate: expectClaudeHealth },
    },
    {
      connector: 'claude',
      checkType: 'docs',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/docs`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      checkType: 'privacy',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/privacy`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      checkType: 'terms',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/terms`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      checkType: 'dpa',
      target: `${HOLDED_PUBLIC_URL}/conectores/claude/dpa`,
      probe: { kind: 'get' },
    },
    {
      connector: 'claude',
      checkType: 'oauth_discovery',
      target: `${CLAUDE_PUBLIC_URL}/.well-known/oauth-authorization-server`,
      probe: { kind: 'json_get', validate: expectOauthDiscovery },
    },
    {
      connector: 'claude',
      checkType: 'protected_resource',
      target: `${CLAUDE_PUBLIC_URL}/.well-known/oauth-protected-resource`,
      probe: { kind: 'json_get', validate: expectProtectedResource },
    },
    {
      connector: 'claude',
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
  checkType: string;
  target: string;
}> {
  return checks().map(({ connector, checkType, target }) => ({ connector, checkType, target }));
}
