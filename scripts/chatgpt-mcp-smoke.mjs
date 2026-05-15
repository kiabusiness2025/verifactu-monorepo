/**
 * chatgpt-mcp-smoke.mjs
 *
 * Smoke test DIRECTO contra el endpoint MCP del conector ChatGPT-Holded, sin
 * pasar por la UI de ChatGPT. Sirve para capturar la respuesta JSON-RPC real
 * de las tools que el usuario reporta como "bloqueadas por seguridad"
 * (holded_list_invoices, holded_list_accounts, holded_list_bookings) y poder
 * distinguir entre:
 *   - error JSON-RPC -32000 (fallo interno del conector)
 *   - timeout / latencia alta (escaneo histórico)
 *   - payload válido pero gigante
 *   - 403 de Holded (módulo no contratado) → ahora resultado legible
 *
 * Bloques:
 *   1. MCP sin auth   — initialize + tools/list (superficie pública)
 *   2. MCP con token  — tools/list + tools/call de las 3 tools (requiere token)
 *   3. Holded directo — golpea los 3 endpoints de Holded para aislar si el
 *                       bloqueo es del lado de Holded o del conector
 *
 * Uso:
 *   node scripts/chatgpt-mcp-smoke.mjs
 *   MCP_BEARER_TOKEN=<oauth_o_pat> node scripts/chatgpt-mcp-smoke.mjs
 *   MCP_CONNECTOR_BASE=https://holded.verifactu.business \
 *     MCP_BEARER_TOKEN=xxx HOLDED_TEST_API_KEY=yyy node scripts/chatgpt-mcp-smoke.mjs
 *
 * Variables:
 *   MCP_CONNECTOR_BASE  Base del conector ChatGPT (default holded.verifactu.business)
 *   MCP_BEARER_TOKEN    Access token OAuth o PAT (pat_...) ligado a un tenant
 *                       con Holded conectado. Sin él, solo corre el bloque 1.
 *   HOLDED_TEST_API_KEY API key de Holded para el bloque 3 (via holded-env.mjs).
 */

import { loadHoldedEnvConfig } from './holded-env.mjs';

const MCP_BASE = (process.env.MCP_CONNECTOR_BASE?.trim() || 'https://holded.verifactu.business')
  .replace(/\/+$/, '');
const MCP_URL = `${MCP_BASE}/api/mcp/holded`;
const BEARER = process.env.MCP_BEARER_TOKEN?.trim() || '';
const REQUEST_TIMEOUT_MS = Number(process.env.MCP_SMOKE_TIMEOUT_MS || '30000');

const envConfig = loadHoldedEnvConfig(process.cwd());

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
}

/** Llama al endpoint MCP con un cuerpo JSON-RPC y devuelve { status, json, ms, error }. */
async function jsonRpc(method, params, { withAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (withAuth && BEARER) headers.Authorization = `Bearer ${BEARER}`;

  const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
  const startedAt = Date.now();
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const ms = Date.now() - startedAt;
    const text = await res.text().catch(() => '');
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* deja json en null, lo reporta el caller */
    }
    return { status: res.status, json, ms, raw: text };
  } catch (err) {
    return {
      status: 0,
      json: null,
      ms: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function approxBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
  } catch {
    return -1;
  }
}

/** Analiza una respuesta tools/call y la convierte en una línea de resultado. */
function describeToolCall(label, resp) {
  if (resp.error) {
    record(label, false, `red/timeout tras ${resp.ms}ms: ${resp.error}`);
    return;
  }
  if (resp.status !== 200) {
    record(label, false, `HTTP ${resp.status} tras ${resp.ms}ms`);
    return;
  }
  if (!resp.json) {
    record(label, false, `respuesta no-JSON tras ${resp.ms}ms: ${resp.raw?.slice(0, 120)}`);
    return;
  }
  if (resp.json.error) {
    // Error JSON-RPC: esto es lo que ChatGPT renderiza como "bloqueado".
    record(
      label,
      false,
      `JSON-RPC error ${resp.json.error.code} tras ${resp.ms}ms: ${resp.json.error.message}`
    );
    return;
  }

  const result = resp.json.result ?? {};
  const structured = result.structuredContent;
  const textBlock = Array.isArray(result.content)
    ? result.content.find((c) => c?.type === 'text')?.text ?? ''
    : '';
  const bytes = approxBytes(structured);

  // Detecta resultados "controlados" que el conector ahora devuelve como
  // tool result legible en vez de error JSON-RPC genérico.
  const errCode =
    structured && typeof structured === 'object' && typeof structured.error === 'string'
      ? structured.error
      : null;

  const items =
    structured && typeof structured === 'object' && Array.isArray(structured.items)
      ? structured.items.length
      : null;

  const sizeWarn = bytes > 60_000 ? ' ⚠ payload grande' : '';
  const detail = errCode
    ? `resultado controlado "${errCode}" — ${resp.ms}ms`
    : `${resp.ms}ms · structuredContent ~${bytes}B${
        items !== null ? ` · ${items} items` : ''
      }${sizeWarn} · text: ${textBlock.slice(0, 80).replace(/\s+/g, ' ')}`;

  // Para un smoke "verde" basta con que NO sea error JSON-RPC ni timeout.
  record(label, true, detail);
}

// ─── Bloque 3: Holded directo ────────────────────────────────────────────────

async function checkHoldedDirect(name, url, apiKey) {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', key: apiKey },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - startedAt;
    const text = await res.text().catch(() => '');
    const isHtml = text.trimStart().startsWith('<');
    if (isHtml) {
      record(name, false, `HTTP ${res.status} ${ms}ms — devuelve HTML (sin API REST)`);
      return;
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        msg = j.info || j.error || j.message || msg;
      } catch {
        /* keep default */
      }
      // 403 = módulo no contratado / sin permiso; lo marcamos como FAIL pero
      // con detalle para que se vea que es del lado de Holded, no del conector.
      record(name, false, `HTTP ${res.status} ${ms}ms — ${msg}`);
      return;
    }
    let count = 'OK';
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) count = `${parsed.length} items`;
    } catch {
      /* keep default */
    }
    record(name, true, `HTTP ${res.status} ${ms}ms — ${count}`);
  } catch (err) {
    record(name, false, `red/timeout — ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`ChatGPT MCP smoke — ${new Date().toISOString()}`);
  console.log(`MCP endpoint: ${MCP_URL}`);
  console.log(`Bearer token: ${BEARER ? 'presente' : 'AUSENTE (solo bloque 1)'}`);
  console.log(`Holded API key: ${envConfig.apiKey ? `presente (${envConfig.source})` : 'AUSENTE (sin bloque 3)'}`);
  console.log('');

  // ── Bloque 1: MCP sin auth ──────────────────────────────────────────────────
  console.log('==> Bloque 1 — MCP sin autenticación (superficie pública)');

  const init = await jsonRpc('initialize', {});
  if (init.json?.result?.serverInfo) {
    record(
      'mcp.initialize',
      true,
      `${init.json.result.serverInfo.name} v${init.json.result.serverInfo.version} (${init.ms}ms)`
    );
  } else {
    record('mcp.initialize', false, init.error || `HTTP ${init.status}: ${init.raw?.slice(0, 120)}`);
  }

  const publicList = await jsonRpc('tools/list', {});
  const publicTools = publicList.json?.result?.tools ?? [];
  if (Array.isArray(publicTools) && publicTools.length > 0) {
    const names = publicTools.map((t) => t.name);
    record('mcp.tools_list.public', true, `${names.length} tools expuestas sin token`);
    for (const probe of ['holded_list_invoices', 'holded_list_accounts', 'holded_list_bookings']) {
      console.log(`     ${names.includes(probe) ? '·' : '✗'} ${probe} ${names.includes(probe) ? 'visible' : 'NO visible'}`);
    }
  } else {
    record(
      'mcp.tools_list.public',
      false,
      publicList.error || `sin tools — HTTP ${publicList.status}`
    );
  }

  // ── Bloque 2: MCP con token ─────────────────────────────────────────────────
  console.log('');
  console.log('==> Bloque 2 — MCP autenticado (tools/call de las 3 tools reportadas)');

  if (!BEARER) {
    console.log('     omitido: define MCP_BEARER_TOKEN (access token OAuth o PAT pat_...) para correrlo');
  } else {
    const authList = await jsonRpc('tools/list', {}, { withAuth: true });
    const authTools = authList.json?.result?.tools ?? [];
    if (Array.isArray(authTools) && authTools.length > 0) {
      record('mcp.tools_list.auth', true, `${authTools.length} tools visibles con el token`);
    } else {
      record(
        'mcp.tools_list.auth',
        false,
        authList.json?.error?.message || authList.error || `HTTP ${authList.status}`
      );
    }

    // holded_list_invoices con el caso exacto que reportó el usuario.
    describeToolCall(
      'mcp.call.list_invoices(year=2026,limit=3)',
      await jsonRpc(
        'tools/call',
        { name: 'holded_list_invoices', arguments: { year: 2026, limit: 3 } },
        { withAuth: true }
      )
    );

    // holded_list_accounts: sin args (el caso que devolvía las ~206 cuentas) y
    // con limit explícito para comprobar la paginación nueva.
    describeToolCall(
      'mcp.call.list_accounts()',
      await jsonRpc('tools/call', { name: 'holded_list_accounts', arguments: {} }, { withAuth: true })
    );
    describeToolCall(
      'mcp.call.list_accounts(limit=5)',
      await jsonRpc(
        'tools/call',
        { name: 'holded_list_accounts', arguments: { limit: 5 } },
        { withAuth: true }
      )
    );

    // holded_list_bookings: depende del módulo CRM de Holded.
    describeToolCall(
      'mcp.call.list_bookings(limit=3)',
      await jsonRpc(
        'tools/call',
        { name: 'holded_list_bookings', arguments: { limit: 3 } },
        { withAuth: true }
      )
    );

    // IDs inválidos: ahora deben devolver structuredContent.error="not_found"
    // en vez de "Internal MCP error -32000".
    describeToolCall(
      'mcp.call.get_invoice(invalid-id)',
      await jsonRpc(
        'tools/call',
        { name: 'holded_get_invoice', arguments: { invoiceId: 'test-invalid-invoice-id' } },
        { withAuth: true }
      )
    );
    describeToolCall(
      'mcp.call.get_project(invalid-id)',
      await jsonRpc(
        'tools/call',
        { name: 'holded_get_project', arguments: { projectId: 'test-invalid-project-id' } },
        { withAuth: true }
      )
    );
    describeToolCall(
      'mcp.call.list_project_tasks(invalid-id)',
      await jsonRpc(
        'tools/call',
        {
          name: 'holded_list_project_tasks',
          arguments: { projectId: 'test-invalid-project-id', limit: 1 },
        },
        { withAuth: true }
      )
    );

    // confirm:false: ahora debe devolver structuredContent.error="confirmation_required"
    // en vez de "Internal MCP error -32000".
    describeToolCall(
      'mcp.call.create_invoice_draft(confirm:false)',
      await jsonRpc(
        'tools/call',
        {
          name: 'holded_create_invoice_draft',
          arguments: {
            confirm: false,
            payload: {
              contactId: 'placeholder',
              lines: [{ desc: 'smoke test', units: 1, price: 1, tax: 21 }],
            },
          },
        },
        { withAuth: true }
      )
    );
  }

  // ── Bloque 3: Holded directo ────────────────────────────────────────────────
  console.log('');
  console.log('==> Bloque 3 — Holded API directo (aísla Holded vs conector)');

  if (!envConfig.apiKey) {
    console.log('     omitido: define HOLDED_TEST_API_KEY para correrlo');
  } else {
    const base = envConfig.baseUrl.replace(/\/+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const yearStart = Math.floor(Date.UTC(2026, 0, 1) / 1000);
    await checkHoldedDirect(
      'holded.documents.invoice',
      `${base}/api/invoicing/v1/documents/invoice?page=1&limit=3&starttmp=${yearStart}&endtmp=${now}`,
      envConfig.apiKey
    );
    await checkHoldedDirect(
      'holded.chartofaccounts',
      `${base}/api/accounting/v1/chartofaccounts?includeEmpty=1&page=1&limit=5`,
      envConfig.apiKey
    );
    await checkHoldedDirect(
      'holded.crm.bookings',
      `${base}/api/crm/v1/bookings?page=1&limit=3`,
      envConfig.apiKey
    );
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log('');
  console.log(`Resumen: ${passed} passed, ${failed} failed, ${results.length} checks.`);
  if (failed > 0) {
    console.log('');
    console.log('Fallos (revisar detalle arriba):');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
