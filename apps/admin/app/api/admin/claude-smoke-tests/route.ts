/**
 * POST /api/admin/claude-smoke-tests
 *
 * Dos bloques de checks en paralelo:
 *   1. Servidor Claude (claude.verifactu.business) — endpoints públicos + rechazo OAuth
 *   2. Holded API — endpoints usados por HoldedClient del conector Claude
 */

import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CLAUDE_MCP_BASE = 'https://claude.verifactu.business';
const HOLDED_BASE = 'https://api.holded.com';

export type SmokeCheckResult = {
  name: string;
  category: 'server' | 'holded';
  ok: boolean;
  status: number;
  message: string;
};

export type ClaudeSmokeTestResponse = {
  results: SmokeCheckResult[];
  summary: { passed: number; failed: number; total: number };
  runAt: string;
};

async function checkServer(
  name: string,
  url: string,
  method: 'GET' | 'POST',
  expectStatus: number,
  validate?: (res: Response, text: string) => { ok: boolean; message: string }
): Promise<SmokeCheckResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { Accept: 'application/json, text/html, */*' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    const text = await response.text().catch(() => '');

    if (validate) {
      const result = validate(response, text);
      return {
        name,
        category: 'server',
        ok: result.ok,
        status: response.status,
        message: result.message,
      };
    }

    const ok = response.status === expectStatus;
    return {
      name,
      category: 'server',
      ok,
      status: response.status,
      message: ok ? 'OK' : `Esperado ${expectStatus}, recibido ${response.status}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red';
    return { name, category: 'server', ok: false, status: 0, message: msg };
  }
}

async function checkHolded(apiKey: string, name: string, url: string): Promise<SmokeCheckResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', key: apiKey },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    const text = await response.text();
    const isHtml = text.trimStart().startsWith('<');

    if (isHtml) {
      return {
        name,
        category: 'holded',
        ok: false,
        status: response.status,
        message: 'Devuelve HTML (endpoint sin API REST)',
      };
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const detail =
          (parsed.info as string) || (parsed.error as string) || (parsed.message as string) || null;
        if (detail) errorMsg = detail;
      } catch {
        /* keep default */
      }
      return { name, category: 'holded', ok: false, status: response.status, message: errorMsg };
    }

    try {
      const parsed = JSON.parse(text);
      const count = Array.isArray(parsed) ? parsed.length : null;
      return {
        name,
        category: 'holded',
        ok: true,
        status: response.status,
        message: count !== null ? `${count} items` : 'OK',
      };
    } catch {
      return { name, category: 'holded', ok: true, status: response.status, message: 'OK' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de red';
    return { name, category: 'holded', ok: false, status: 0, message: msg };
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin(req);

  const apiKey = process.env.HOLDED_TEST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'HOLDED_TEST_API_KEY no configurada en el entorno' },
      { status: 500 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  const serverChecks = [
    checkServer('server.health', `${CLAUDE_MCP_BASE}/health`, 'GET', 200, (_res, text) => {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const ok = json.status === 'ok';
        return {
          ok,
          message: ok
            ? `status: ok · service: ${json.service ?? '?'}`
            : `Inesperado: ${text.slice(0, 80)}`,
        };
      } catch {
        return { ok: false, message: 'Respuesta no es JSON' };
      }
    }),
    checkServer(
      'server.oauth_discovery',
      `${CLAUDE_MCP_BASE}/.well-known/oauth-authorization-server`,
      'GET',
      200,
      (_res, text) => {
        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          const ok = typeof json.authorization_endpoint === 'string';
          return {
            ok,
            message: ok ? `issuer: ${json.issuer ?? '?'}` : 'Falta authorization_endpoint',
          };
        } catch {
          return { ok: false, message: 'Respuesta no es JSON' };
        }
      }
    ),
    checkServer(
      'server.resource_metadata',
      `${CLAUDE_MCP_BASE}/.well-known/oauth-protected-resource`,
      'GET',
      200,
      (_res, text) => {
        try {
          const json = JSON.parse(text) as Record<string, unknown>;
          const ok = typeof json.resource === 'string';
          return { ok, message: ok ? `resource: ${json.resource}` : 'Falta campo resource' };
        } catch {
          return { ok: false, message: 'Respuesta no es JSON' };
        }
      }
    ),
    checkServer('server.mcp_rejects_unauth', `${CLAUDE_MCP_BASE}/mcp`, 'POST', 401, (res, text) => {
      const ok = res.status === 401;
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        return {
          ok,
          message: ok ? `error: ${json.error ?? '?'}` : `Esperado 401, recibido ${res.status}`,
        };
      } catch {
        return { ok, message: ok ? '401 sin JSON' : `Esperado 401, recibido ${res.status}` };
      }
    }),
    checkServer('server.favicon', `${CLAUDE_MCP_BASE}/favicon.ico`, 'GET', 200, (res, text) => {
      const ct = res.headers.get('content-type') ?? '';
      const isHtml = text.trimStart().startsWith('<');
      const ok = res.ok && !isHtml;
      return {
        ok,
        message: ok ? `Content-Type: ${ct}` : isHtml ? 'Devuelve HTML' : `HTTP ${res.status}`,
      };
    }),
    checkServer(
      'server.logo',
      `${CLAUDE_MCP_BASE}/holded-diamond-logo.png`,
      'GET',
      200,
      (res, text) => {
        const ct = res.headers.get('content-type') ?? '';
        const isHtml = text.trimStart().startsWith('<');
        const ok = res.ok && !isHtml && ct.includes('image/');
        return {
          ok,
          message: ok
            ? `Content-Type: ${ct}`
            : isHtml
              ? 'Devuelve HTML'
              : `Content-Type: ${ct || '?'}`,
        };
      }
    ),
  ];

  const holdedChecks = [
    { name: 'holded.contacts', url: `${HOLDED_BASE}/api/invoicing/v1/contacts?limit=5&page=1` },
    {
      name: 'holded.invoices',
      url: `${HOLDED_BASE}/api/invoicing/v1/documents/invoice?limit=5&page=1`,
    },
    { name: 'holded.products', url: `${HOLDED_BASE}/api/invoicing/v1/products?limit=5&page=1` },
    { name: 'holded.warehouses', url: `${HOLDED_BASE}/api/invoicing/v1/warehouses` },
    { name: 'holded.taxes', url: `${HOLDED_BASE}/api/invoicing/v1/taxes` },
    { name: 'holded.numbering_series', url: `${HOLDED_BASE}/api/invoicing/v1/numberingseries` },
    { name: 'holded.treasury', url: `${HOLDED_BASE}/api/invoicing/v1/treasury` },
    { name: 'holded.crm_funnels', url: `${HOLDED_BASE}/api/crm/v1/funnels` },
    { name: 'holded.crm_leads', url: `${HOLDED_BASE}/api/crm/v1/leads?limit=5&page=1` },
    { name: 'holded.projects', url: `${HOLDED_BASE}/api/projects/v1/projects?limit=5&page=1` },
    {
      name: 'holded.chart_of_accounts',
      url: `${HOLDED_BASE}/api/accounting/v1/chartofaccounts?includeEmpty=1&limit=5&page=1`,
    },
    {
      name: 'holded.daily_ledger',
      url: `${HOLDED_BASE}/api/accounting/v1/dailyledger?starttmp=${thirtyDaysAgo}&endtmp=${now}&page=1&limit=5`,
    },
    { name: 'holded.employees', url: `${HOLDED_BASE}/api/team/v1/employees?limit=5&page=1` },
  ];

  const [serverResults, holdedResults] = await Promise.all([
    Promise.all(serverChecks),
    Promise.all(holdedChecks.map(({ name, url }) => checkHolded(apiKey, name, url))),
  ]);

  const results = [...serverResults, ...holdedResults];
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  return NextResponse.json({
    results,
    summary: { passed, failed, total: results.length },
    runAt: new Date().toISOString(),
  } satisfies ClaudeSmokeTestResponse);
}
