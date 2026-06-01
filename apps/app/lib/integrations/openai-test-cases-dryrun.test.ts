/** @jest-environment node */

/**
 * scripts/openai-test-cases-dryrun.ts
 *
 * Dry-run harness para los 10 test cases que el reviewer de OpenAI App Review
 * ejecutará. NO golpea api.holded.com en producción (sandbox blocked) — usa
 * mock fetch con respuestas realistas modeladas a partir de la spec OpenAPI
 * Holded + estructura observada en tests existentes.
 *
 * Lo que verifica:
 *   1. Cada handler MCP se invoca sin throw.
 *   2. El JSON-RPC result tiene la forma esperada (items, item, pdf, created).
 *   3. El `content[].text` que ChatGPT renderizará es legible.
 *   4. structuredContent contiene los campos prometidos al modelo via
 *      outputSchema (V3.H).
 *
 * Uso (desde apps/app):
 *   pnpm jest --runInBand --runTestsByPath scripts/openai-test-cases-dryrun.ts
 *
 * Reporta cada test con [PASS/FAIL] + sample del output.
 */

import { callHoldedMcpTool, holdedMcpTools, HoldedUserError } from '@/lib/integrations/holdedMcpTools';
import {
  getAllowedHoldedMcpToolNames,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';

const DEMO_API_KEY = '0ecf1267eacc89ff45acab1b8ca28396';

// Mocks realistas con CUIDs hex (24 chars hex puro — Holded interno).
const MOCK_INVOICE = {
  id: 'a1b2c3d4e5f60718293a4b5c',  // 24 hex chars
  docNumber: 'F0030',
  contactId: 'aaaa1111bbbb2222cccc3333',
  contactName: 'Demo Retail Norte SL',
  date: 1735689600,
  dueDate: 1738368000,
  total: 1210,
  subtotal: 1000,
  tax: 210,
  currency: 'EUR',
  status: 'approved',
  description: 'Servicios de consultoría enero 2026',
};

const MOCK_PURCHASE = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa', // 24 hex chars
  docNumber: 'P0045',
  contactId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  contactName: 'Proveedor Office Supplies SL',
  date: 1735776000,
  total: 605,
  subtotal: 500,
  tax: 105,
  currency: 'EUR',
  status: 'pending',
  description: 'Material oficina enero 2026',
  docType: 'purchase',
};

const MOCK_CONTACT = {
  id: 'aaaa1111bbbb2222cccc3333',
  name: 'Demo Retail Norte SL',
  tradeName: 'Demo Retail Norte',
  code: 'DEMO-001',
  email: 'compras@retailnorte.demo',
  phone: '+34 600 000 001',
  vatnumber: 'B12345678',
  type: 'client',
  clientRecord: 5,
  supplierRecord: 0,
};

const MOCK_ACCOUNT = {
  id: 'acc7050000',
  num: '70500000',
  name: 'Prestaciones de servicios',
  debe: 0,
  haber: 61835,
  saldo: -61835,
};

const MOCK_JOURNAL_ENTRY = {
  id: 'je-001',
  number: '001',
  date: 1704067200, // 2024-01-01
  description: 'Asiento apertura ejercicio 2024',
  lines: [
    { account: '11800000', debit: 0, credit: 155200, description: 'Aportación socios' },
    { account: '57200001', debit: 155200, credit: 0, description: 'Banco principal' },
  ],
};

// ───────────────────────────────────────────────────────────────────────────
// Mock fetch — interpreta la URL y devuelve datos realistas
// ───────────────────────────────────────────────────────────────────────────

function mockFetchResponse(body: unknown, contentType = 'application/json') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    text: async () => text,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => {
      const u8 = new TextEncoder().encode(text);
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    },
  } as unknown as Response;
}

function installMockFetch() {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method || 'GET').toUpperCase();

    // POS-10: POST /documents/invoice (create draft) — debe matchear ANTES
    // del GET list para diferenciar create vs list al mismo URL.
    if (method === 'POST' && url.includes('/api/invoicing/v1/documents/invoice')) {
      return mockFetchResponse({
        id: 'newdraft1234567890abcdef',
        docNumber: 'F0031',
        status: 'draft',
      });
    }

    // ORDEN IMPORTANTE: /pdf debe matchear ANTES que cualquier path de /documents
    // porque /documents/{type}/{id}/pdf también contiene /documents/{type}/{id}.
    if (url.includes('/pdf')) {
      const pdfBytes = new Uint8Array(Buffer.from('%PDF-1.4\nfake pdf body\n%%EOF', 'utf8'));
      const isolated = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      );
      return {
        ok: true,
        status: 200,
        text: async () => '',
        headers: {
          get: (h: string) =>
            h.toLowerCase() === 'content-type'
              ? 'application/pdf'
              : h.toLowerCase() === 'content-disposition'
                ? 'attachment; filename="invoice-F0030.pdf"'
                : null,
        },
        arrayBuffer: async () => isolated,
      } as unknown as Response;
    }
    // POS-02: GET /documents/invoice/{id}
    if (url.includes(`/documents/invoice/${MOCK_INVOICE.id}`)) {
      return mockFetchResponse(MOCK_INVOICE);
    }
    // POS-04: GET /documents/purchase/{id}
    if (url.includes(`/documents/purchase/${MOCK_PURCHASE.id}`)) {
      return mockFetchResponse(MOCK_PURCHASE);
    }
    // POS-01: GET /documents/invoice (list)
    if (url.includes('/api/invoicing/v1/documents/invoice')) {
      return mockFetchResponse([MOCK_INVOICE]);
    }
    // POS-03: GET /documents/purchase (list)
    if (url.includes('/documents/purchase')) {
      return mockFetchResponse([MOCK_PURCHASE]);
    }
    // POS-07: GET /contacts/{id}
    if (url.includes(`/contacts/${MOCK_CONTACT.id}`)) {
      return mockFetchResponse(MOCK_CONTACT);
    }
    // POS-06: GET /contacts (list)
    if (url.includes('/api/invoicing/v1/contacts')) {
      return mockFetchResponse([MOCK_CONTACT]);
    }
    // POS-08: GET /chartofaccounts
    if (url.includes('/chartofaccounts')) {
      return mockFetchResponse([MOCK_ACCOUNT]);
    }
    // POS-09: GET /dailyledger
    if (url.includes('/dailyledger')) {
      return mockFetchResponse([MOCK_JOURNAL_ENTRY]);
    }
    // POS-10: POST /documents/invoice (create draft) — solo si NO matchea
    // ningún path con id (los matchers anteriores ya filtraron esos casos).
    if (url.includes('/documents/invoice')) {
      return mockFetchResponse({ id: 'newdraft1234567890abcdef', docNumber: 'F0031', status: 'draft' });
    }

    return mockFetchResponse({});
  }) as unknown as typeof fetch;
}

// ───────────────────────────────────────────────────────────────────────────
// Test cases POS-01..POS-10
// ───────────────────────────────────────────────────────────────────────────

describe('OpenAI App Review POS-01..POS-10 dry-run', () => {
  const originalFetch = global.fetch;
  beforeEach(() => installMockFetch());
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('POS-01 holded_list_invoices: returns items array', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_invoices', { limit: 5 });
    expect(result).toBeDefined();
    const items = (result as { items?: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
    expect(items!.length).toBeGreaterThan(0);
    expect((items![0] as { docNumber?: string }).docNumber).toBe('F0030');
    console.log('POS-01 ✓ items[0].docNumber=', (items![0] as { docNumber?: string }).docNumber);
  });

  it('POS-02 holded_get_invoice: returns single invoice item', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_get_invoice', {
      invoiceId: MOCK_INVOICE.id,
    });
    expect(result).toBeDefined();
    const item = (result as { item?: { docNumber?: string } }).item;
    expect(item?.docNumber).toBe('F0030');
    expect(item?.contactName).toBe('Demo Retail Norte SL');
    console.log('POS-02 ✓ item.docNumber=', item?.docNumber, 'total=', (item as { total?: number })?.total);
  });

  it('POS-03 holded_list_documents(docType=purchase): returns purchases', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_documents', {
      docType: 'purchase',
      limit: 5,
    });
    expect(result).toBeDefined();
    const items = (result as { items?: Array<{ docType?: string }> }).items;
    expect(Array.isArray(items)).toBe(true);
    expect(items![0].docType).toBe('purchase');
    expect((items![0] as { docNumber?: string }).docNumber).toBe('P0045');
    console.log('POS-03 ✓ purchase docNumber=', (items![0] as { docNumber?: string }).docNumber);
  });

  it('POS-04 holded_get_document(docType=purchase, id): returns purchase doc', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_get_document', {
      docType: 'purchase',
      documentId: MOCK_PURCHASE.id,
    });
    expect(result).toBeDefined();
    const item = (result as { item?: { docNumber?: string } }).item;
    expect(item?.docNumber).toBe('P0045');
    console.log('POS-04 ✓ doc.docNumber=', item?.docNumber);
  });

  it('POS-05 holded_get_document_pdf: returns validated PDF base64', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_get_document_pdf', {
      docType: 'invoice',
      documentId: MOCK_INVOICE.id,
    });
    expect(result).toBeDefined();
    const pdf = (result as { pdf?: { base64?: string; contentType?: string; fileName?: string } }).pdf;
    expect(pdf?.contentType).toBe('application/pdf');
    expect(pdf?.base64).toBeDefined();
    const decoded = Buffer.from(pdf!.base64!, 'base64').toString('latin1');
    expect(decoded.startsWith('%PDF-')).toBe(true);
    console.log('POS-05 ✓ pdf.fileName=', pdf?.fileName, 'magic=', decoded.slice(0, 5));
  });

  it('POS-06 holded_list_contacts: returns contacts list', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_contacts', { limit: 5 });
    expect(result).toBeDefined();
    const items = (result as { items?: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
    expect((items![0] as { name?: string }).name).toBe('Demo Retail Norte SL');
    console.log('POS-06 ✓ items[0].name=', (items![0] as { name?: string }).name);
  });

  it('POS-07 holded_get_contact: returns single contact', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_get_contact', {
      contactId: MOCK_CONTACT.id,
    });
    expect(result).toBeDefined();
    const item = (result as { item?: { name?: string; vatnumber?: string } }).item;
    expect(item?.name).toBe('Demo Retail Norte SL');
    expect(item?.vatnumber).toBe('B12345678');
    console.log('POS-07 ✓ item.vatnumber=', item?.vatnumber);
  });

  it('POS-08 holded_list_accounts: returns chart of accounts', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_accounts', { limit: 5 });
    expect(result).toBeDefined();
    const items = (result as { items?: Array<{ num?: string | number; name?: string }> }).items;
    expect(Array.isArray(items)).toBe(true);
    expect(items![0].num).toBe('70500000');
    console.log('POS-08 ✓ items[0]=', items![0].num, items![0].name);
  });

  it('POS-09 holded_list_daily_ledger (2025 fiscal year): returns entries sorted', async () => {
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_daily_ledger', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result).toBeDefined();
    const items = (result as { items?: unknown[] }).items;
    expect(Array.isArray(items)).toBe(true);
    expect((items![0] as { number?: string }).number).toBe('001');
    console.log('POS-09 ✓ items[0].number=', (items![0] as { number?: string }).number);
  });

  it('POS-10 holded_create_invoice_draft: requires confirm=true', async () => {
    // Sin confirm → debe lanzar HoldedUserError con code "confirmation_required".
    // El mensaje es user-friendly ("Awaiting your confirmation…"); el contrato
    // es el `code` del error, no su mensaje.
    let caught: HoldedUserError | null = null;
    try {
      await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Demo Retail Norte SL',
        lines: [{ desc: 'Servicio', units: 1, price: 100, tax: 21 }],
      });
    } catch (err) {
      caught = err as HoldedUserError;
    }
    expect(caught).toBeInstanceOf(HoldedUserError);
    expect(caught?.code).toBe('confirmation_required');

    // Con confirm: true → debe crear el draft.
    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
      contactName: 'Demo Retail Norte SL',
      lines: [{ desc: 'Servicio', units: 1, price: 100, tax: 21 }],
      confirm: true,
    });
    expect(result).toBeDefined();
    const created = (result as { created?: { id?: string; docNumber?: string } }).created;
    expect(created?.id).toBeDefined();
    expect(created?.docNumber).toBe('F0031');
    console.log('POS-10 ✓ created.id=', created?.id, 'docNumber=', created?.docNumber);
  });

  it('preset openai_review_invoicing_v1 expone las 10 tools del POS sweep', () => {
    const POS_TOOLS = [
      'holded_list_invoices',
      'holded_get_invoice',
      'holded_list_documents',
      'holded_get_document',
      'holded_get_document_pdf',
      'holded_list_contacts',
      'holded_get_contact',
      'holded_list_accounts',
      'holded_list_daily_ledger',
      'holded_create_invoice_draft',
    ];
    for (const name of POS_TOOLS) {
      const tool = holdedMcpTools.find((t) => t.name === name);
      expect(tool).toBeDefined();
      expect(tool!.outputSchema).toBeDefined();
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Negative test cases NEG-01..NEG-06
// ───────────────────────────────────────────────────────────────────────────
// Verifican que el conector REHÚSA o NO EXPONE los casos out-of-scope
// declarados en chatgpt-app-submission.json:negative_test_cases.
// ───────────────────────────────────────────────────────────────────────────

describe('OpenAI App Review NEG-01..NEG-06 boundary verification', () => {
  beforeEach(() => installMockFetch());

  it('NEG-01: holded_list_daily_ledger REQUIERE rango de fechas (rechaza unbounded)', async () => {
    // "Show my daily ledger." — sin rango explícito el modelo debe pedir
    // fechas ANTES de invocar. Si llama igualmente, el handler debe rechazar.
    await expect(
      callHoldedMcpTool(DEMO_API_KEY, 'holded_list_daily_ledger', {})
    ).rejects.toThrow();
    console.log('NEG-01 ✓ ledger sin rango → rechazo');
  });

  it('NEG-02: holded_create_invoice_draft NUNCA mintea sin confirm=true', async () => {
    // "Create an invoice draft for 100 euros plus VAT for an existing customer."
    // — sin confirm el handler tira HoldedUserError(confirmation_required) y
    // NO llama POST a Holded.
    const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length;

    let caught: HoldedUserError | null = null;
    try {
      await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Demo Retail Norte SL',
        lines: [{ desc: 'Servicio', units: 1, price: 100, tax: 21 }],
      });
    } catch (err) {
      caught = err as HoldedUserError;
    }
    expect(caught?.code).toBe('confirmation_required');

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.slice(fetchCallsBefore);
    const postCalls = fetchCalls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method?.toUpperCase() === 'POST'
    );
    expect(postCalls.length).toBe(0);
    console.log(
      `NEG-02 ✓ confirm requerido + cero POSTs durante el rechazo (n=${postCalls.length})`
    );
  });

  it('NEG-03: holded_send_document NO está expuesto en el preset', () => {
    // "Send the invoice to the customer." — el modelo no debe encontrar
    // tool de envío. Verificamos que send_document NO está en la lista
    // visible del preset openai_review_invoicing_v1.
    const allowedTools = new Set(
      getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('openai_review_invoicing_v1'))
    );
    expect(allowedTools.has('holded_send_document')).toBe(false);
    expect(allowedTools.has('holded_send_invoice')).toBe(false);
    console.log('NEG-03 ✓ send_document fuera del preset');
  });

  it('NEG-04: holded_delete_document NO está expuesto en el preset', () => {
    // "Delete one of my Holded invoices." — sin delete tool en la superficie,
    // el modelo debe rehusar.
    const allowedTools = new Set(
      getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('openai_review_invoicing_v1'))
    );
    expect(allowedTools.has('holded_delete_document')).toBe(false);
    expect(allowedTools.has('holded_delete_invoice')).toBe(false);
    console.log('NEG-04 ✓ delete_document fuera del preset');
  });

  it('NEG-05: ninguna tool del preset acepta tenantId/companyId como argumento', () => {
    // "Show invoices from another Holded company or tenant." — el conector
    // es estrictamente single-tenant. El tenant se resuelve del access_token
    // OAuth, NUNCA viene como argumento de tool. Si alguna tool aceptase
    // `tenantId` como param, abriría una vía para cross-tenant access.
    const presetNames = new Set(
      getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('openai_review_invoicing_v1'))
    );
    const presetTools = holdedMcpTools.filter((t) => presetNames.has(t.name));
    const FORBIDDEN_PROPS = ['tenantId', 'tenant_id', 'companyId', 'company_id', 'organizationId'];
    for (const tool of presetTools) {
      const props = Object.keys(tool.inputSchema?.properties ?? {});
      for (const forbidden of FORBIDDEN_PROPS) {
        expect(props).not.toContain(forbidden);
      }
    }
    console.log(`NEG-05 ✓ ${presetTools.length} tools sin tenantId/companyId param`);
  });

  it('NEG-06: ninguna tool del preset expone apiKey/secret/credential en su outputSchema', () => {
    // "Show me my Holded API key." — la API key Holded se cifra AES-256-GCM
    // en DB, se desencripta solo en el handler y nunca se incluye en el
    // output. Verificamos defensa en profundidad: los outputSchema declarados
    // no mencionan apiKey/secret/credential.
    const presetNames = new Set(
      getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('openai_review_invoicing_v1'))
    );
    const presetTools = holdedMcpTools.filter((t) => presetNames.has(t.name));
    for (const tool of presetTools) {
      const schemaStr = JSON.stringify(tool.outputSchema ?? {});
      expect(schemaStr).not.toMatch(/"api[_-]?key"/i);
      expect(schemaStr).not.toMatch(/"secret"/i);
      expect(schemaStr).not.toMatch(/"credential"/i);
      expect(schemaStr).not.toMatch(/"password"/i);
    }
    console.log(
      `NEG-06 ✓ ${presetTools.length} outputSchemas sin apiKey/secret/credential/password`
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// V3.G.4 regression — bugs reportados en producción 2026-06-01
// ───────────────────────────────────────────────────────────────────────────
// Bug A: holded_create_invoice_draft con contactName que no matchea exacto
//        creaba la factura para items[0] (cualquier contacto que Holded
//        devuelva primero) — usuario confirmó en producción que pidió
//        "Alfa Retail Madrid SL" y el conector creó para "Beta Eventos
//        Barcelona SL".
// Bug B: defensa adicional contra drafts de €0 (units o price <= 0).
// ───────────────────────────────────────────────────────────────────────────

describe('V3.G.4 — holded_create_invoice_draft contact resolution safety', () => {
  function mockListContactsResponse(contacts: Array<Record<string, unknown>>) {
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method || 'GET').toUpperCase();
      if (url.includes('/api/invoicing/v1/contacts') && method === 'GET') {
        return mockFetchResponse(contacts);
      }
      if (method === 'POST' && url.includes('/api/invoicing/v1/documents/invoice')) {
        return mockFetchResponse({
          id: 'newdraft1234567890abcdef',
          docNumber: 'F0031',
          status: 'draft',
        });
      }
      return mockFetchResponse({});
    }) as unknown as typeof fetch;
  }

  it('Bug A: con contactName que matchea parcial a múltiples, throw contact_ambiguous', async () => {
    // Holded devuelve dos contactos que CONTIENEN "retail" — ambos hacen
    // match parcial. Antes el conector elegía items[0] sin avisar. Ahora
    // exige al usuario que desambigüe.
    mockListContactsResponse([
      { id: 'beta-id', name: 'Beta Retail Barcelona SL' },
      { id: 'alfa-id', name: 'Alfa Retail Madrid SL' },
    ]);

    let caught: HoldedUserError | null = null;
    try {
      await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Retail', // partial match a múltiples
        lines: [{ desc: 'Consulting', units: 8, price: 90, tax: 21 }],
        confirm: true,
      });
    } catch (err) {
      caught = err as HoldedUserError;
    }
    expect(caught?.code).toBe('contact_ambiguous');
    expect(caught?.message).toMatch(/Multiple Holded contacts match/);
    expect(caught?.message).toContain('Beta Retail Barcelona SL');
    expect(caught?.message).toContain('Alfa Retail Madrid SL');
  });

  it('Bug A: con contactName que NO matchea ningún contacto, throw contact_not_found', async () => {
    // Antes habría fallback a items[0] aunque no matcheara — ahora rechaza.
    mockListContactsResponse([{ id: 'beta-id', name: 'Beta Eventos Barcelona SL' }]);

    let caught: HoldedUserError | null = null;
    try {
      await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Cliente Que No Existe SL',
        lines: [{ desc: 'Consulting', units: 8, price: 90, tax: 21 }],
        confirm: true,
      });
    } catch (err) {
      caught = err as HoldedUserError;
    }
    expect(caught?.code).toBe('contact_not_found');
  });

  it('Bug A: match exacto case-insensitive elige el contacto correcto y sobrescribe contactName con canónico', async () => {
    mockListContactsResponse([
      { id: 'beta-id', name: 'Beta Eventos Barcelona SL' },
      { id: 'alfa-id', name: 'Alfa Retail Madrid SL' },
    ]);

    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
      contactName: 'alfa retail madrid sl', // case insensitive
      lines: [{ desc: 'Consulting', units: 8, price: 90, tax: 21 }],
      confirm: true,
    });
    expect(result).toBeDefined();

    // Verificamos que el POST a /documents/invoice se hizo con el contactId
    // correcto (alfa-id), NO con beta-id.
    const fetchMock = global.fetch as jest.Mock;
    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method?.toUpperCase() === 'POST'
    );
    expect(postCall).toBeDefined();
    const postBody = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(postBody.contactId).toBe('alfa-id');
    // contactName se normalizó al nombre canónico del contacto encontrado.
    expect(postBody.contactName).toBe('Alfa Retail Madrid SL');
  });

  it('Bug A: match parcial UNICO se acepta sin pedir disambiguación', async () => {
    // Si solo 1 contacto matchea parcialmente, es razonable aceptarlo.
    mockListContactsResponse([
      { id: 'gamma-id', name: 'Gamma Foods SL' },
      { id: 'alfa-id', name: 'Alfa Retail Madrid SL' },
    ]);

    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
      contactName: 'Alfa', // partial, UNIQUE among items
      lines: [{ desc: 'Consulting', units: 8, price: 90, tax: 21 }],
      confirm: true,
    });
    expect(result).toBeDefined();

    const fetchMock = global.fetch as jest.Mock;
    const postCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method?.toUpperCase() === 'POST'
    );
    const postBody = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(postBody.contactId).toBe('alfa-id');
  });

  it('Bug B: line con units=0 lanza error claro, NO crea draft vacío', async () => {
    mockListContactsResponse([{ id: 'alfa-id', name: 'Alfa Retail Madrid SL' }]);

    await expect(
      callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Alfa Retail Madrid SL',
        lines: [{ desc: 'Consulting', units: 0, price: 90, tax: 21 }],
        confirm: true,
      })
    ).rejects.toThrow(/units must be greater than 0/);
  });

  it('Bug B: line con price=0 lanza error claro, NO crea draft vacío', async () => {
    mockListContactsResponse([{ id: 'alfa-id', name: 'Alfa Retail Madrid SL' }]);

    await expect(
      callHoldedMcpTool(DEMO_API_KEY, 'holded_create_invoice_draft', {
        contactName: 'Alfa Retail Madrid SL',
        lines: [{ desc: 'Consulting', units: 8, price: 0, tax: 21 }],
        confirm: true,
      })
    ).rejects.toThrow(/price must be greater than 0/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// V3.G.5 regression — bugs reportados por usuario en producción 2026-06-01
// ───────────────────────────────────────────────────────────────────────────
// Bug 6: parseIsoDateToUnix("2025-01-01") devolvía UTC midnight (1735689600).
//        Pero Holded almacena fechas a Madrid midnight (1735686000). Un
//        starttmp UTC midnight EXCLUYE los docs fechados ese mismo día.
// Bug 7: get_document_pdf solo intentaba /pdf renderizado. Si el documento
//        tenía PDF SUBIDO por el usuario (sin renderizar nativo), devolvía
//        no_attachment aunque el PDF estaba ahí.
// ───────────────────────────────────────────────────────────────────────────

describe('V3.G.5 — Madrid timezone + document attachments fallback', () => {
  beforeEach(() => installMockFetch());

  it('Bug 6: holded_list_daily_ledger con startDate="2025-01-01" pide Madrid midnight a Holded', async () => {
    // Verificamos que el query enviado a Holded usa Madrid midnight
    // (1735686000) en lugar de UTC midnight (1735689600). Diferencia: 3600
    // segundos (CET = UTC+1 en enero).
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(mockFetchResponse([]));

    await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_daily_ledger', {
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });

    const calls = fetchMock.mock.calls.map((c) => c[0] as string);
    // Primer fetch debe contener starttmp=1735686000 (Madrid midnight 2025-01-01).
    const firstCall = calls[0];
    expect(firstCall).toContain('starttmp=1735686000');
    // Y NO debe contener starttmp=1735689600 (UTC midnight, valor ANTIGUO buggy).
    expect(firstCall).not.toContain('starttmp=1735689600');
  });

  it('Bug 6: parseIsoDateToUnix de fecha en verano (DST CEST) usa offset +2h', async () => {
    // 2025-07-01 está en verano → Madrid es CEST (UTC+2).
    // Madrid midnight 2025-07-01 = 2025-06-30 22:00 UTC = 1751320800.
    // UTC midnight 2025-07-01 = 1751328000. Diferencia: 7200s (= 2h).
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(mockFetchResponse([]));

    await callHoldedMcpTool(DEMO_API_KEY, 'holded_list_daily_ledger', {
      startDate: '2025-07-01',
      endDate: '2025-07-31',
    });

    const firstCall = (fetchMock.mock.calls[0] as [string])[0];
    // Madrid midnight 2025-07-01 en CEST = 1751320800.
    expect(firstCall).toContain('starttmp=1751320800');
  });

  it('Bug 7: holded_get_document_pdf con /pdf vacío hace fallback a attachments', async () => {
    // Mock fetch que simula:
    //   1. /pdf → 200 + JSON {"status":0,"info":"No attachments found"} (no PDF nativo)
    //   2. /attachments/list → [{fileName: "factura-proveedor.pdf"}]
    //   3. /attachments/get → bytes %PDF- válidos
    const pdfBytes = new Uint8Array(Buffer.from('%PDF-1.4\nuploaded by user\n%%EOF', 'utf8'));
    const isolated = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength
    );
    const noPdfJson = JSON.stringify({ status: 0, info: 'No attachments found' });
    const noPdfBytes = new Uint8Array(Buffer.from(noPdfJson, 'utf8'));
    const noPdfIsolated = noPdfBytes.buffer.slice(
      noPdfBytes.byteOffset,
      noPdfBytes.byteOffset + noPdfBytes.byteLength
    );

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/attachments/list')) {
        return mockFetchResponse([{ fileName: 'factura-proveedor.pdf', size: 1234 }]);
      }
      if (url.includes('/attachments/get')) {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          headers: {
            get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/pdf' : null),
          },
          arrayBuffer: async () => isolated,
        } as unknown as Response;
      }
      if (url.endsWith('/pdf')) {
        // Simulamos respuesta "200 + JSON error" que es el bug original Holded.
        return {
          ok: true,
          status: 200,
          text: async () => noPdfJson,
          headers: {
            get: (h: string) =>
              h.toLowerCase() === 'content-type' ? 'application/json' : null,
          },
          arrayBuffer: async () => noPdfIsolated,
        } as unknown as Response;
      }
      return mockFetchResponse({});
    }) as unknown as typeof fetch;

    const result = await callHoldedMcpTool(DEMO_API_KEY, 'holded_get_document_pdf', {
      docType: 'purchase',
      documentId: '69fe16ff19098de62508fb80',
    });

    const pdfResult = result as {
      pdf?: { base64?: string; contentType?: string; fileName?: string };
      source?: string;
    };
    expect(pdfResult.source).toBe('attachment');
    expect(pdfResult.pdf?.fileName).toBe('factura-proveedor.pdf');
    expect(pdfResult.pdf?.contentType).toBe('application/pdf');
    const decoded = Buffer.from(pdfResult.pdf!.base64!, 'base64').toString('latin1');
    expect(decoded.startsWith('%PDF-')).toBe(true);
  });
});
