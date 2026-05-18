/**
 * Regresión 18-may-2026 (soporte audit "291 facturas paginando").
 *
 * Antes del fix: `list_documents`, `list_contacts` y `list_products`
 * forwardeaban el parámetro `page` al query string de Holded, pero esos
 * endpoints NO soportan paginación nativa — page=2 devolvía [] (o el mismo
 * conjunto), y el conector truncaba lado-cliente a `limit` sin servir el
 * resto. El modelo no podía drenar listas grandes: para extraer 291 facturas
 * tenía que inventar workarounds (trocear por endtmp decreciente,
 * deduplicar por ID en cliente).
 *
 * Después del fix: el conector pagina 100% client-side. Hace UNA llamada a
 * Holded por el rango completo, slicea con `paginateInMemory` y devuelve
 * `pagination.{page, totalItems, totalPages, hasMore, nextPage}`. `page=N`
 * es ahora determinista mientras N <= totalPages.
 *
 * Estos tests verifican el comportamiento end-to-end vía el MCP server:
 *   - list_documents: 250 docs, limit=100 → page=1,2,3 cubren todo, sin
 *     que el connector reenvíe `?page=` a Holded.
 *   - list_contacts: 60 docs, limit=25 → page=1,2,3 cubren todo.
 *   - list_products: idem.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { installTestEnv, startTestServer, withHoldedFetchRecorder } from './helpers.ts';

installTestEnv();

function makeInvoices(n: number) {
  // Documentos ordenados por fecha descendente (más reciente primero), como
  // Holded los devuelve. Cada doc tiene un id estable para verificar slicing.
  const base = Math.floor(Date.UTC(2026, 2, 31) / 1000); // 31-mar-2026
  return Array.from({ length: n }, (_, i) => ({
    id: `inv-${String(i).padStart(4, '0')}`,
    docNumber: `F${String(n - i).padStart(4, '0')}`,
    date: base - i * 86400,
    total: 100 + i,
  }));
}

function makeContacts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `c-${String(i).padStart(4, '0')}`,
    name: `Contact ${i}`,
    createdAt: 1700000000 + i, // ascendente; el handler reordena por createdAt desc
  }));
}

async function callTool(toolName: string, args: Record<string, unknown>, responseBody: unknown) {
  const runtime = await startTestServer();
  const recorder = withHoldedFetchRecorder({ responseBody });

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

    const response = await client.callTool({ name: toolName, arguments: args });

    await transport.close();

    const content = (response as { content?: Array<{ type: string; text: string }> }).content ?? [];
    const text = content.find((c) => c.type === 'text')?.text ?? '{}';
    const payload = JSON.parse(text) as Record<string, unknown>;
    return { payload, calls: recorder.calls };
  } finally {
    recorder.restore();
    await runtime.close();
  }
}

test('list_documents: page=2 with 250 docs returns docs 100-199 (client-side slicing)', async () => {
  const docs = makeInvoices(250);
  const { payload, calls } = await callTool(
    'list_documents',
    {
      docType: 'invoice',
      starttmp: '2026-01-01T00:00:00Z',
      endtmp: '2026-12-31T23:59:59Z',
      limit: 100,
      page: '2',
    },
    docs
  );

  const documents = payload.documents as Array<{ id: string }>;
  assert.equal(documents.length, 100, 'should return exactly 100 docs on page 2');
  assert.equal(documents[0].id, 'inv-0100', 'page 2 first doc should be index 100');
  assert.equal(documents[99].id, 'inv-0199', 'page 2 last doc should be index 199');

  const pagination = payload.pagination as Record<string, unknown>;
  assert.equal(pagination.page, 2);
  assert.equal(pagination.pageSize, 100);
  assert.equal(pagination.totalItems, 250);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.hasMore, true);
  assert.equal(pagination.nextPage, 3);

  // ── Crítico: el conector NO debe haber forwardeado `?page=2` a Holded.
  // Holded /documents no soporta paginación nativa — esto era exactamente
  // el bug que confundía al modelo y le devolvía [] en page=2.
  const docCalls = calls.filter((c) => c.url.includes('/documents/invoice'));
  assert.equal(docCalls.length, 1, 'should make exactly ONE call to Holded for the full dataset');
  const callUrl = new URL(docCalls[0].url);
  assert.equal(callUrl.searchParams.get('page'), null, 'must NOT forward page to Holded');
  // 2026-01-01T00:00:00Z = 1767225600; 2026-12-31T23:59:59Z = 1798761599
  assert.equal(callUrl.searchParams.get('starttmp'), '1767225600');
  assert.equal(callUrl.searchParams.get('endtmp'), '1798761599');
});

test('list_documents: page=3 with 250 docs and limit=100 returns the last 50 + hasMore=false', async () => {
  const docs = makeInvoices(250);
  const { payload } = await callTool(
    'list_documents',
    {
      docType: 'invoice',
      starttmp: '2026-01-01T00:00:00Z',
      endtmp: '2026-12-31T23:59:59Z',
      limit: 100,
      page: '3',
    },
    docs
  );

  const documents = payload.documents as Array<{ id: string }>;
  assert.equal(documents.length, 50, 'last page should have the remaining 50 docs');
  assert.equal(documents[0].id, 'inv-0200');
  assert.equal(documents[49].id, 'inv-0249');

  const pagination = payload.pagination as Record<string, unknown>;
  assert.equal(pagination.page, 3);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.hasMore, false);
  assert.equal(pagination.nextPage, null);
});

test('list_documents: page past totalPages returns empty + helpful hint', async () => {
  const docs = makeInvoices(50);
  const { payload } = await callTool(
    'list_documents',
    {
      docType: 'invoice',
      starttmp: '2026-01-01T00:00:00Z',
      endtmp: '2026-12-31T23:59:59Z',
      limit: 25,
      page: '99',
    },
    docs
  );

  const documents = payload.documents as Array<unknown>;
  assert.equal(documents.length, 0);

  const pagination = payload.pagination as Record<string, unknown>;
  assert.equal(pagination.totalItems, 50);
  assert.equal(pagination.totalPages, 2);
  assert.equal(pagination.hasMore, false);
  assert.match(
    (pagination.hint as string) ?? '',
    /paged past the end|No .* on page/i,
    'should hint when paging past end'
  );
});

test('list_contacts: paginates client-side and does NOT forward page to Holded', async () => {
  const contacts = makeContacts(60);
  const { payload, calls } = await callTool('list_contacts', { limit: 25, page: '2' }, contacts);

  const items = payload.contacts as Array<{ id: string }>;
  assert.equal(items.length, 25);

  const pagination = payload.pagination as Record<string, unknown>;
  assert.equal(pagination.page, 2);
  assert.equal(pagination.totalItems, 60);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.hasMore, true);

  const contactCalls = calls.filter((c) => c.url.includes('/contacts'));
  assert.equal(contactCalls.length, 1, 'one call to Holded /contacts');
  const callUrl = new URL(contactCalls[0].url);
  assert.equal(callUrl.searchParams.get('page'), null, 'must NOT forward page to Holded');
});

test('list_products: page=2 with 80 products and limit=25 returns indices 25-49', async () => {
  const products = Array.from({ length: 80 }, (_, i) => ({ id: `p-${i}`, name: `Product ${i}` }));
  const { payload, calls } = await callTool('list_products', { limit: 25, page: '2' }, products);

  const items = payload.products as Array<{ id: string }>;
  assert.equal(items.length, 25);
  assert.equal(items[0].id, 'p-25');
  assert.equal(items[24].id, 'p-49');

  const pagination = payload.pagination as Record<string, unknown>;
  assert.equal(pagination.page, 2);
  assert.equal(pagination.totalItems, 80);
  assert.equal(pagination.totalPages, 4);
  assert.equal(pagination.hasMore, true);
  assert.equal(pagination.nextPage, 3);

  const productCalls = calls.filter((c) => c.url.includes('/products'));
  assert.equal(productCalls.length, 1);
  const callUrl = new URL(productCalls[0].url);
  assert.equal(callUrl.searchParams.get('page'), null, 'must NOT forward page to Holded');
});

test('list_documents with 291 docs and limit=100 (the support-reported case): can drain in 3 pages', async () => {
  // El caso real reportado: 291 facturas de compra de 2026. Antes del fix el
  // modelo se quedaba bloqueado en page=1 (recibía 100, page=2 vacío). Ahora
  // page=1+2+3 cubren todas sin solapamiento ni huecos.
  const docs = makeInvoices(291);
  const allIds = new Set<string>();

  for (const pageNum of [1, 2, 3]) {
    const { payload } = await callTool(
      'list_documents',
      {
        docType: 'purchase',
        starttmp: '2026-01-01T00:00:00Z',
        endtmp: '2026-12-31T23:59:59Z',
        limit: 100,
        page: String(pageNum),
      },
      docs
    );

    const documents = payload.documents as Array<{ id: string }>;
    for (const d of documents) allIds.add(d.id);

    const pagination = payload.pagination as Record<string, unknown>;
    assert.equal(pagination.totalItems, 291);
    assert.equal(pagination.totalPages, 3);
    assert.equal(pagination.hasMore, pageNum < 3);
  }

  assert.equal(allIds.size, 291, 'three pages should cover all 291 docs with no duplicates');
});
