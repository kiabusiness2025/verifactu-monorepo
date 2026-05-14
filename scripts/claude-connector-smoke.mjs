/**
 * claude-connector-smoke.mjs
 *
 * Smoke tests del conector Claude con Holded. Dos bloques:
 *   1. Infraestructura del servidor MCP (claude.verifactu.business) — sin auth
 *   2. Holded API — endpoints usados por HoldedClient
 *
 * Uso:
 *   node scripts/claude-connector-smoke.mjs
 *   HOLDED_TEST_API_KEY=xxx node scripts/claude-connector-smoke.mjs
 */

import { loadHoldedEnvConfig } from './holded-env.mjs';

const CLAUDE_MCP_BASE = 'https://claude.verifactu.business';
const runStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const envConfig = loadHoldedEnvConfig(process.cwd());
const apiKey = envConfig.apiKey;
const holdedBase = envConfig.baseUrl;

if (!apiKey) {
  console.error(
    'Missing HOLDED_TEST_API_KEY or HOLDED_API_KEY. Checked process.env and apps/holded/.env.local.'
  );
  process.exit(1);
}

const results = [];

function recordResult(name, ok, status, message) {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name} [${status}] ${message}`;
  console.log(line);
  results.push({ name, ok, status, message });
}

// ─── Server checks (no auth) ─────────────────────────────────────────────────

async function checkServerJson(name, url, validate) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    const text = await res.text().catch(() => '');
    const { ok, message } = validate(res, text);
    recordResult(name, ok, res.status, message);
  } catch (err) {
    recordResult(name, false, 0, err instanceof Error ? err.message : 'Error de red');
  }
}

async function checkServerBinary(name, url, contentTypePrefix) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text().catch(() => '');
    const ct = res.headers.get('content-type') ?? '';
    const isHtml = text.trimStart().startsWith('<');
    const ok = res.ok && !isHtml && ct.startsWith(contentTypePrefix);
    recordResult(name, ok, res.status, ok ? `Content-Type: ${ct}` : isHtml ? 'Devuelve HTML' : `Content-Type: ${ct || '?'}`);
  } catch (err) {
    recordResult(name, false, 0, err instanceof Error ? err.message : 'Error de red');
  }
}

// ─── Holded API checks ────────────────────────────────────────────────────────

async function checkHolded(name, url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', key: apiKey },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const isHtml = text.trimStart().startsWith('<');
    if (isHtml) {
      recordResult(name, false, res.status, 'Devuelve HTML (endpoint sin API REST)');
      return;
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        msg = json.info || json.error || json.message || msg;
      } catch { /* keep default */ }
      recordResult(name, false, res.status, msg);
      return;
    }
    let msg = 'OK';
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) msg = `${parsed.length} items`;
    } catch { /* keep default */ }
    recordResult(name, true, res.status, msg);
  } catch (err) {
    recordResult(name, false, 0, err instanceof Error ? err.message : 'Error de red');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Claude connector smoke run ${runStamp}`);
  console.log(`MCP server: ${CLAUDE_MCP_BASE}`);
  console.log(`Holded API: ${holdedBase}`);
  console.log(`API key source: ${envConfig.source}`);
  console.log('');

  console.log('==> Infraestructura del servidor (claude.verifactu.business)');

  await checkServerJson('server.health', `${CLAUDE_MCP_BASE}/health`, (_res, text) => {
    try {
      const json = JSON.parse(text);
      const ok = json.status === 'ok';
      return { ok, message: ok ? `status: ok · service: ${json.service ?? '?'}` : `Inesperado: ${text.slice(0, 80)}` };
    } catch {
      return { ok: false, message: 'Respuesta no es JSON' };
    }
  });

  await checkServerJson('server.oauth_discovery', `${CLAUDE_MCP_BASE}/.well-known/oauth-authorization-server`, (_res, text) => {
    try {
      const json = JSON.parse(text);
      const ok = typeof json.authorization_endpoint === 'string';
      return { ok, message: ok ? `issuer: ${json.issuer ?? '?'}` : 'Falta authorization_endpoint' };
    } catch {
      return { ok: false, message: 'Respuesta no es JSON' };
    }
  });

  await checkServerJson('server.resource_metadata', `${CLAUDE_MCP_BASE}/.well-known/oauth-protected-resource`, (_res, text) => {
    try {
      const json = JSON.parse(text);
      const ok = typeof json.resource === 'string';
      return { ok, message: ok ? `resource: ${json.resource}` : 'Falta campo resource' };
    } catch {
      return { ok: false, message: 'Respuesta no es JSON' };
    }
  });

  await checkServerJson('server.mcp_rejects_unauth', `${CLAUDE_MCP_BASE}/mcp`, (res, text) => {
    const ok = res.status === 401;
    try {
      const json = JSON.parse(text);
      return { ok, message: ok ? `error: ${json.error ?? '?'}` : `Esperado 401, recibido ${res.status}` };
    } catch {
      return { ok, message: ok ? '401 correcto' : `Esperado 401, recibido ${res.status}` };
    }
  });

  await checkServerBinary('server.favicon', `${CLAUDE_MCP_BASE}/favicon.ico`, 'image/');
  await checkServerBinary('server.logo', `${CLAUDE_MCP_BASE}/holded-diamond-logo.png`, 'image/');

  console.log('');
  console.log('==> Holded API (endpoints usados por HoldedClient)');

  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  await checkHolded('holded.contacts', `${holdedBase}/api/invoicing/v1/contacts?limit=5&page=1`);
  await checkHolded('holded.invoices', `${holdedBase}/api/invoicing/v1/documents/invoice?limit=5&page=1`);
  await checkHolded('holded.products', `${holdedBase}/api/invoicing/v1/products?limit=5&page=1`);
  await checkHolded('holded.warehouses', `${holdedBase}/api/invoicing/v1/warehouses`);
  await checkHolded('holded.taxes', `${holdedBase}/api/invoicing/v1/taxes`);
  await checkHolded('holded.numbering_invoice', `${holdedBase}/api/invoicing/v1/numberingseries/invoice`);
  await checkHolded('holded.numbering_estimate', `${holdedBase}/api/invoicing/v1/numberingseries/estimate`);
  await checkHolded('holded.treasury', `${holdedBase}/api/invoicing/v1/treasury`);
  await checkHolded('holded.crm_funnels', `${holdedBase}/api/crm/v1/funnels`);
  await checkHolded('holded.crm_leads', `${holdedBase}/api/crm/v1/leads?limit=5&page=1`);
  await checkHolded('holded.projects', `${holdedBase}/api/projects/v1/projects?limit=5&page=1`);
  await checkHolded('holded.chart_of_accounts', `${holdedBase}/api/accounting/v1/chartofaccounts?includeEmpty=1&limit=5&page=1`);
  await checkHolded('holded.daily_ledger', `${holdedBase}/api/accounting/v1/dailyledger?starttmp=${thirtyDaysAgo}&endtmp=${now}&page=1&limit=5`);
  await checkHolded('holded.employees', `${holdedBase}/api/team/v1/employees?limit=5&page=1`);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log('');
  console.log(`Summary: ${passed} passed, ${failed} failed, ${results.length} total checks.`);

  if (failed > 0) {
    console.log('');
    console.log('Failures:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  - ${r.name} [${r.status}]: ${r.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All Claude connector smoke checks passed.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
