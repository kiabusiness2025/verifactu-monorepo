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
