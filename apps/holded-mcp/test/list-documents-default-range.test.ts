import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { installTestEnv, startTestServer, withHoldedFetchRecorder } from './helpers.ts';

installTestEnv();

/**
 * Soporte audit (2026-05-16): el default de la API de Holded para /documents
 * sólo devuelve documentos del ejercicio en curso y aprobados. Una cuenta con
 * 168 facturas de 2025 mostraba sólo 30 de 2026 sin filtro explícito.
 *
 * Fix: el connector aplica un default de "1 de enero del año anterior → hoy"
 * cuando ni starttmp ni endtmp se proporcionan, exponiendo el rango aplicado
 * en `rangeApplied.defaultsAppliedByConnector` para que el modelo lo razone.
 *
 * Soporte audit #2 (2026-05-18): el handler aplicaba `starttmp` del default
 * pero NO enviaba `endtmp`, asumiendo erróneamente que la API interpretaba
 * "hoy" por omisión. En realidad la API /documents devuelve 400 si recibe
 * sólo uno de los dos timestamps. El connector ahora envía SIEMPRE ambos en
 * cuanto aplica un default, idéntico al patrón ya existente para /dailyledger.
 */

async function callListDocuments(args: Record<string, unknown>) {
  const runtime = await startTestServer();
  const recorder = withHoldedFetchRecorder({ responseBody: [] });

  try {
    const { createTokenPair } = await import('../src/auth.ts');
    const tokenPair = await createTokenPair({
      holdedApiKey: 'holded-api-key-test',
      clientId: 'test-client',
      scope: 'holded:read holded:write',
    });

    const transport = new StreamableHTTPClientTransport(new URL(`${runtime.baseUrl}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${tokenPair.accessToken}` } },
    });

    const client = new Client({ name: 'holded-mcp-test', version: '1.0.0' });
    await client.connect(transport);

    const response = await client.callTool({ name: 'list_documents', arguments: args });

    await transport.close();

    const getCalls = recorder.calls.filter(
      (c) => c.method === 'GET' && c.url.includes('/documents/invoice')
    );
    assert.ok(getCalls.length >= 1, 'expected at least one GET to /documents/invoice');
    const callUrl = new URL(getCalls[0].url);

    const content = (response as { content?: Array<{ type: string; text: string }> }).content ?? [];
    const text = content.find((c) => c.type === 'text')?.text ?? '{}';
    const payload = JSON.parse(text) as Record<string, unknown>;

    return { callUrl, payload };
  } finally {
    recorder.restore();
    await runtime.close();
  }
}

test('list_documents applies default range "previous year Jan 1 → now" AND sends both timestamps when no date filter is given', async () => {
  const before = Math.floor(Date.now() / 1000);
  const { callUrl, payload } = await callListDocuments({ docType: 'invoice' });
  const after = Math.floor(Date.now() / 1000);

  const sentStarttmp = callUrl.searchParams.get('starttmp');
  const sentEndtmp = callUrl.searchParams.get('endtmp');

  // starttmp default = Jan 1 previous year
  const previousYear = new Date().getUTCFullYear() - 1;
  const expectedStart = Math.floor(Date.UTC(previousYear, 0, 1) / 1000);
  assert.equal(
    sentStarttmp,
    String(expectedStart),
    'connector should default starttmp to Jan 1 of the previous calendar year'
  );

  // endtmp MUST be sent too. Holded /documents returns 400 when one timestamp
  // is missing — the previous behaviour ("omit endtmp, Holded uses today") was
  // a wrong assumption that broke real prod calls (soporte audit 2026-05-18).
  assert.ok(sentEndtmp, 'endtmp must be sent alongside starttmp default');
  const sentEndtmpNum = Number(sentEndtmp);
  assert.ok(
    sentEndtmpNum >= before && sentEndtmpNum <= after,
    `endtmp default should be ~now (got ${sentEndtmp}, expected between ${before} and ${after})`
  );

  const rangeApplied = payload.rangeApplied as Record<string, unknown>;
  const dabc = rangeApplied.defaultsAppliedByConnector as Record<string, boolean>;
  assert.equal(dabc.starttmp, true);
  assert.equal(dabc.endtmp, true);
  assert.match(payload.note as string, /previous calendar year Jan 1/i);
});

test('list_documents honors explicit starttmp and auto-applies endtmp default to satisfy Holded API', async () => {
  const before = Math.floor(Date.now() / 1000);
  const { callUrl, payload } = await callListDocuments({
    docType: 'invoice',
    starttmp: '2024-01-01T00:00:00Z',
  });
  const after = Math.floor(Date.now() / 1000);

  // Jan 1 2024 UTC = 1704067200
  assert.equal(callUrl.searchParams.get('starttmp'), '1704067200');

  // endtmp filled by connector — Holded rejects 400 if only one is sent.
  const sentEndtmp = callUrl.searchParams.get('endtmp');
  assert.ok(sentEndtmp, 'endtmp must be auto-filled when caller provides starttmp only');
  const sentEndtmpNum = Number(sentEndtmp);
  assert.ok(sentEndtmpNum >= before && sentEndtmpNum <= after);

  const rangeApplied = payload.rangeApplied as Record<string, unknown>;
  const dabc = rangeApplied.defaultsAppliedByConnector as Record<string, boolean>;
  assert.equal(dabc.starttmp, false);
  assert.equal(dabc.endtmp, true);
  // Explanatory note specific to "only starttmp given" path.
  assert.match(payload.note as string, /defaulted endtmp/i);
});

test('list_documents honors explicit endtmp and auto-applies starttmp default to satisfy Holded API', async () => {
  const { callUrl, payload } = await callListDocuments({
    docType: 'invoice',
    endtmp: '2025-12-31T23:59:59Z',
  });

  // starttmp auto-filled by connector. Same fiscal-year rationale as the
  // "no dates given" path: default to Jan 1 of the previous calendar year.
  const previousYear = new Date().getUTCFullYear() - 1;
  const expectedStart = Math.floor(Date.UTC(previousYear, 0, 1) / 1000);
  assert.equal(callUrl.searchParams.get('starttmp'), String(expectedStart));
  assert.equal(callUrl.searchParams.get('endtmp'), '1767225599');

  const rangeApplied = payload.rangeApplied as Record<string, unknown>;
  const dabc = rangeApplied.defaultsAppliedByConnector as Record<string, boolean>;
  assert.equal(dabc.starttmp, true);
  assert.equal(dabc.endtmp, false);
  assert.match(payload.note as string, /defaulted starttmp/i);
});

test('list_documents response includes rangeApplied with the timestamps actually sent', async () => {
  const { payload } = await callListDocuments({
    docType: 'invoice',
    starttmp: '2025-01-01T00:00:00Z',
    endtmp: '2025-12-31T23:59:59Z',
  });

  const rangeApplied = payload.rangeApplied as Record<string, unknown>;
  assert.equal(rangeApplied.starttmp, '1735689600'); // 2025-01-01
  assert.equal(rangeApplied.endtmp, '1767225599'); // 2025-12-31 end of day
  assert.deepEqual(rangeApplied.defaultsAppliedByConnector, {
    starttmp: false,
    endtmp: false,
  });
});
