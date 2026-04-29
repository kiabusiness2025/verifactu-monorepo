/** @jest-environment node */

import { holdedAdapter, probeAccountingApiConnection } from './accounting';

describe('Holded accounting adapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('lists chart of accounts from the JSON endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });

    await holdedAdapter.listAccounts('demo-key', { page: 2, limit: 5 });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/accounting/v1/chartofaccounts?page=2&limit=5&includeEmpty=1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          key: 'demo-key',
        }),
      })
    );
  });

  it('lists the complete chart of accounts by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });

    await holdedAdapter.listAccounts('demo-key');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/accounting/v1/chartofaccounts?includeEmpty=1',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('probes accounting access against the chart of accounts endpoint', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await probeAccountingApiConnection('demo-key');
    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/invoice?limit=1&page=1'
    );
    expect(fetchCalls).toContain('https://api.holded.com/api/invoicing/v1/contacts?limit=1&page=1');
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/accounting/v1/chartofaccounts?limit=1&page=1'
    );
    expect(result.invoiceApi).toEqual({ ok: true, status: 200 });
    expect(result.contactsApi).toEqual({ ok: true, status: 200 });
    expect(result.accountingApi).toEqual({ ok: true, status: 200 });
    expect(result.ok).toBe(true);
  });

  it('allows dashboard validation without crm and projects access', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    const result = await probeAccountingApiConnection('demo-key', { profile: 'dashboard' });

    expect(result.ok).toBe(true);
    expect(result.missingCapabilities).toEqual([]);
  });

  it('requires crm and projects access for chatgpt validation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    const result = await probeAccountingApiConnection('demo-key', { profile: 'chatgpt' });

    expect(result.ok).toBe(false);
    expect(result.missingCapabilities).toEqual(['crmApi', 'projectsApi']);
    expect(result.error).toContain('agenda comercial');
    expect(result.error).toContain('proyectos');
  });

  it('scans additional invoice pages to reach a previous year', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            Array.from({ length: 100 }, (_, index) => ({
              id: `inv-2026-${index}`,
              date: '2026-03-15T00:00:00.000Z',
            }))
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { id: 'inv-2025-a', date: '2025-12-20T00:00:00.000Z' },
            { id: 'inv-2025-b', date: '2025-08-05T00:00:00.000Z' },
          ]),
      });

    const result = await holdedAdapter.listInvoicesHistory('demo-key', {
      year: 2025,
      limit: 10,
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/invoice?page=1&limit=100'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/invoice?page=2&limit=100'
    );
    expect(result.items).toEqual([
      { id: 'inv-2025-a', date: '2025-12-20T00:00:00.000Z' },
      { id: 'inv-2025-b', date: '2025-08-05T00:00:00.000Z' },
    ]);
    expect(result.history).toEqual(
      expect.objectContaining({
        pagesScanned: 2,
        matchedItems: 2,
        returnedItems: 2,
        appliedRange: expect.objectContaining({ year: 2025 }),
      })
    );
  });

  it('lists purchase documents through the typed purchase endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 'purchase-1', subject: 'Proveedor abril' }]),
    });

    const result = await holdedAdapter.listDocuments('demo-key', {
      page: 2,
      limit: 5,
      docType: 'purchase',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/invoicing/v1/documents/purchase?page=2&limit=5',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          key: 'demo-key',
        }),
      })
    );
    expect(result).toEqual([{ id: 'purchase-1', subject: 'Proveedor abril', docType: 'purchase' }]);
  });

  it('keeps purchase docType when scanning purchase history', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 'purchase-2025', date: '2025-04-10T00:00:00.000Z' }]),
    });

    const result = await holdedAdapter.listDocumentsHistory('demo-key', {
      year: 2025,
      limit: 10,
      docType: 'purchase',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/invoicing/v1/documents/purchase?page=1&limit=100',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          key: 'demo-key',
        }),
      })
    );
    expect(result.items).toEqual([
      { id: 'purchase-2025', date: '2025-04-10T00:00:00.000Z', docType: 'purchase' },
    ]);
  });

  it('merges invoice and estimate history when listing documents by year', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'inv-2025', date: '2025-11-02T00:00:00.000Z' }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ id: 'est-2025', date: '2025-12-10T00:00:00.000Z' }]),
      });

    const result = await holdedAdapter.listDocumentsHistory('demo-key', {
      year: 2025,
      limit: 10,
    });

    expect(result.items).toEqual([
      { id: 'est-2025', date: '2025-12-10T00:00:00.000Z', docType: 'estimate' },
      { id: 'inv-2025', date: '2025-11-02T00:00:00.000Z', docType: 'invoice' },
    ]);
    expect(result.history).toEqual(
      expect.objectContaining({
        pagesScanned: 2,
        matchedItems: 2,
        returnedItems: 2,
      })
    );
  });

  it('lists daily ledger entries with timestamp filters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });

    await holdedAdapter.listDailyLedger('demo-key', {
      page: 3,
      limit: 100,
      starttmp: 1_704_067_200,
      endtmp: 1_704_153_599,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/accounting/v1/dailyledger?page=3&limit=100&starttmp=1704067200&endtmp=1704153599',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          key: 'demo-key',
        }),
      })
    );
  });

  it('surfaces the Holded response body when daily ledger listing fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'starttmp and endtmp are required',
    });

    await expect(
      holdedAdapter.listDailyLedger('demo-key', {
        page: 1,
        limit: 100,
        starttmp: 1_704_067_200,
        endtmp: 1_704_153_599,
      })
    ).rejects.toThrow(
      'Holded API request failed with status 400: starttmp and endtmp are required'
    );
  });

  it('creates daily ledger entries through the accounting endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"id":"entry-1"}',
    });

    await holdedAdapter.createDailyLedgerEntry('demo-key', {
      date: 1_712_016_000,
      lines: [
        { account: '70000001', credit: 1000 },
        { account: '43000001', debit: 1000 },
      ],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/accounting/v1/entry',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          date: 1_712_016_000,
          lines: [
            { account: '70000001', credit: 1000 },
            { account: '43000001', debit: 1000 },
          ],
        }),
      })
    );
  });

  it('creates accounting accounts through the dedicated endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"id":"70000001"}',
    });

    await holdedAdapter.createAccountingAccount('demo-key', {
      prefix: 7000,
      name: 'Ventas demo',
      color: '#009966',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/accounting/v1/account',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          prefix: 7000,
          name: 'Ventas demo',
          color: '#009966',
        }),
      })
    );
  });

  it('returns document PDFs as base64 with metadata', async () => {
    const headerGet = jest.fn((name: string) => {
      if (name === 'content-type') return 'application/pdf';
      if (name === 'content-disposition') {
        return 'attachment; filename="invoice-doc-1.pdf"';
      }
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: headerGet },
      arrayBuffer: async () => Uint8Array.from([0x25, 0x50, 0x44, 0x46]).buffer,
    });

    const result = await holdedAdapter.getDocumentPdf('demo-key', 'invoice', 'doc-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-1/pdf',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/pdf, application/octet-stream, application/json',
          key: 'demo-key',
        }),
      })
    );
    expect(result).toEqual({
      base64: 'JVBERg==',
      contentType: 'application/pdf',
      fileName: 'invoice-doc-1.pdf',
      size: 4,
    });
  });

  it('lists and downloads contact attachments through the documented routes', async () => {
    const emptyHeaderGet = jest.fn(() => null);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '[{"fileName":"contract.pdf"}]',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: emptyHeaderGet },
        arrayBuffer: async () => Uint8Array.from([0x25, 0x50, 0x44, 0x46]).buffer,
      });

    const items = await holdedAdapter.listContactAttachments('demo-key', 'contact-1');
    const attachment = await holdedAdapter.getContactAttachment(
      'demo-key',
      'contact-1',
      'contract.pdf'
    );

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/contacts/contact-1/attachments/list'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/contacts/contact-1/attachments/get?filename=contract.pdf'
    );
    expect(items).toEqual([{ fileName: 'contract.pdf' }]);
    expect(attachment).toEqual({
      base64: 'JVBERg==',
      contentType: 'application/octet-stream',
      fileName: 'contract.pdf',
      size: 4,
    });
  });

  it('retrieves product media through the documented routes', async () => {
    const mainImageHeaderGet = jest.fn((name: string) => {
      if (name === 'content-type') return 'image/png';
      return null;
    });
    const secondaryImageHeaderGet = jest.fn(() => null);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: mainImageHeaderGet },
        arrayBuffer: async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '["detail-1.png","detail-2.png"]',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: secondaryImageHeaderGet },
        arrayBuffer: async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer,
      });

    const mainImage = await holdedAdapter.getProductMainImage('demo-key', 'product-1');
    const images = await holdedAdapter.listProductImages('demo-key', 'product-1');
    const secondaryImage = await holdedAdapter.getProductSecondaryImage(
      'demo-key',
      'product-1',
      'detail-1.png'
    );

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/products/product-1/image'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/products/product-1/imagesList'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/products/product-1/image/detail-1.png'
    );
    expect(mainImage).toEqual({
      base64: 'iVBORw==',
      contentType: 'image/png',
      fileName: 'product-1-main-image',
      size: 4,
    });
    expect(images).toEqual(['detail-1.png', 'detail-2.png']);
    expect(secondaryImage).toEqual({
      base64: 'iVBORw==',
      contentType: 'application/octet-stream',
      fileName: 'detail-1.png',
      size: 4,
    });
  });

  it('updates product stock through the documented route', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });

    await holdedAdapter.updateProductStock('demo-key', 'product-1', {
      stock: {
        warehouseId: 'warehouse-1',
        units: 5,
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/invoicing/v1/products/product-1/stock',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          stock: {
            warehouseId: 'warehouse-1',
            units: 5,
          },
        }),
      })
    );
  });

  it('posts document actions to the documented Holded routes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });

    await holdedAdapter.sendDocument('demo-key', 'invoice', 'doc-1', {
      emails: ['billing@example.com'],
    });
    await holdedAdapter.payDocument('demo-key', 'purchase', 'doc-pay', {
      date: 1_712_016_000,
      amount: 125.5,
      treasury: 'treasury-1',
    });
    await holdedAdapter.updateDocumentTracking('demo-key', 'salesorder', 'doc-2', {
      num: 'TRACK-001',
    });
    await holdedAdapter.updateDocumentPipeline('demo-key', 'invoice', 'doc-3', 'pipeline-review');

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-1/send'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/purchase/doc-pay/pay'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/salesorder/doc-2/updatetracking'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-3/pipeline/set'
    );
  });

  it('lists payments with the documented timestamp filters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });

    await holdedAdapter.listPayments('demo-key', {
      page: 2,
      limit: 20,
      starttmp: 1_712_016_000,
      endtmp: 1_714_607_999,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.holded.com/api/invoicing/v1/payments?page=2&limit=20&starttmp=1712016000&endtmp=1714607999',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  it('uses the documented team employee and clock-in routes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });

    await holdedAdapter.listEmployees('demo-key', { page: 2, limit: 10 });
    await holdedAdapter.getEmployee('demo-key', 'employee-1');
    await holdedAdapter.createEmployee('demo-key', { name: 'Ada Lovelace' });
    await holdedAdapter.updateEmployee('demo-key', 'employee-1', { email: 'ada@example.com' });
    await holdedAdapter.clockInEmployee('demo-key', 'employee-1', { location: 'office' });
    await holdedAdapter.clockOutEmployee('demo-key', 'employee-1', {
      latitude: 40.4168,
      longitude: -3.7038,
    });

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain('https://api.holded.com/api/team/v1/employees?page=2&limit=10');
    expect(fetchCalls).toContain('https://api.holded.com/api/team/v1/employees/employee-1');
    expect(fetchCalls).toContain('https://api.holded.com/api/team/v1/employees');
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/team/v1/employees/employee-1/times/clockin'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/team/v1/employees/employee-1/times/clockout'
    );
  });

  it('posts shipping and warehouse stock requests to the documented routes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });

    await holdedAdapter.shipDocumentAllItems('demo-key', 'sales-1');
    await holdedAdapter.shipDocumentByLines('demo-key', 'sales-2', {
      lines: [{ itemLinePosition: 0, quantity: 2 }],
    });
    await holdedAdapter.getDocumentShippedItems('demo-key', 'salesorder', 'sales-3');
    await holdedAdapter.listWarehouseStock('demo-key', 'warehouse-1');

    const fetchCalls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));

    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/salesorder/sales-1/shipall'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/salesorder/sales-2/shipbylines'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/documents/salesorder/sales-3/shippeditems'
    );
    expect(fetchCalls).toContain(
      'https://api.holded.com/api/invoicing/v1/warehouses/warehouse-1/stock'
    );
  });

  it('uploads document attachments through multipart form data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });

    await holdedAdapter.attachDocumentFile('demo-key', 'invoice', 'doc-9', {
      fileName: 'invoice.pdf',
      base64: 'JVBERg==',
      contentType: 'application/pdf',
      setMain: true,
    });

    const [, request] = (global.fetch as jest.Mock).mock.calls.at(-1) as [string, RequestInit];
    const formData = request.body as FormData;

    expect((global.fetch as jest.Mock).mock.calls.at(-1)?.[0]).toBe(
      'https://api.holded.com/api/invoicing/v1/documents/invoice/doc-9/attach'
    );
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual(
      expect.objectContaining({
        Accept: 'application/json',
        key: 'demo-key',
      })
    );
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('setMain')).toBe('true');
  });
});
