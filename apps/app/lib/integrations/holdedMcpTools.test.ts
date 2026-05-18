/** @jest-environment node */

jest.mock('./accounting', () => ({
  holdedAdapter: {
    listInvoices: jest.fn(),
    listInvoicesHistory: jest.fn(),
    listDocuments: jest.fn(),
    listDocumentsHistory: jest.fn(),
    createContact: jest.fn(),
    listContactAttachments: jest.fn(),
    getContactAttachment: jest.fn(),
    createDocument: jest.fn(),
    listDailyLedger: jest.fn(),
    listAccounts: jest.fn(),
    createDailyLedgerEntry: jest.fn(),
    createAccountingAccount: jest.fn(),
    sendDocument: jest.fn(),
    payDocument: jest.fn(),
    getDocumentPdf: jest.fn(),
    updateDocumentTracking: jest.fn(),
    updateDocumentPipeline: jest.fn(),
    shipDocumentAllItems: jest.fn(),
    shipDocumentByLines: jest.fn(),
    getDocumentShippedItems: jest.fn(),
    attachDocumentFile: jest.fn(),
    listWarehouseStock: jest.fn(),
    getProductMainImage: jest.fn(),
    listProductImages: jest.fn(),
    getProductSecondaryImage: jest.fn(),
    updateProductStock: jest.fn(),
    listProjectTasks: jest.fn(),
    listPayments: jest.fn(),
    listEmployees: jest.fn(),
    getEmployee: jest.fn(),
    createEmployee: jest.fn(),
    updateEmployee: jest.fn(),
    clockInEmployee: jest.fn(),
    clockOutEmployee: jest.fn(),
  },
}));

import { holdedAdapter } from './accounting';
import {
  HOLDED_MCP_TOOL_SCOPES,
  buildScopeString,
  getAllowedHoldedMcpToolNames,
  getHoldedMcpScopePreset,
} from './holdedMcpScopes';
import { callHoldedMcpTool, holdedMcpTools, HoldedUserError } from './holdedMcpTools';

const mockedHoldedAdapter = holdedAdapter as unknown as {
  listInvoices: jest.Mock;
  listInvoicesHistory: jest.Mock;
  listDocuments: jest.Mock;
  listDocumentsHistory: jest.Mock;
  createContact: jest.Mock;
  listContactAttachments: jest.Mock;
  getContactAttachment: jest.Mock;
  createDocument: jest.Mock;
  listDailyLedger: jest.Mock;
  listAccounts: jest.Mock;
  createDailyLedgerEntry: jest.Mock;
  createAccountingAccount: jest.Mock;
  sendDocument: jest.Mock;
  payDocument: jest.Mock;
  getDocumentPdf: jest.Mock;
  updateDocumentTracking: jest.Mock;
  updateDocumentPipeline: jest.Mock;
  shipDocumentAllItems: jest.Mock;
  shipDocumentByLines: jest.Mock;
  getDocumentShippedItems: jest.Mock;
  attachDocumentFile: jest.Mock;
  listWarehouseStock: jest.Mock;
  getProductMainImage: jest.Mock;
  listProductImages: jest.Mock;
  getProductSecondaryImage: jest.Mock;
  updateProductStock: jest.Mock;
  listProjectTasks: jest.Mock;
  listPayments: jest.Mock;
  listEmployees: jest.Mock;
  getEmployee: jest.Mock;
  createEmployee: jest.Mock;
  updateEmployee: jest.Mock;
  clockInEmployee: jest.Mock;
  clockOutEmployee: jest.Mock;
};

describe('holdedMcpTools', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes the validated invoicing tools in the MCP catalog', () => {
    const names = holdedMcpTools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'holded_list_documents',
        'holded_create_contact',
        'holded_list_treasury_accounts',
        'holded_list_expense_accounts',
        'holded_list_products',
        'holded_list_sales_channels',
        'holded_list_warehouses',
        'holded_list_payments',
        'holded_list_taxes',
        'holded_list_contact_groups',
        'holded_list_remittances',
        'holded_list_services',
        'holded_list_employees',
        'holded_get_employee',
        'holded_create_employee',
        'holded_update_employee',
        'holded_clock_in_employee',
        'holded_clock_out_employee',
        'holded_list_daily_ledger',
        'holded_send_document',
        'holded_pay_document',
        'holded_get_document_pdf',
        'holded_list_contact_attachments',
        'holded_get_contact_attachment',
        'holded_create_accounting_account',
        'holded_ship_document_all_items',
        'holded_get_document_shipped_items',
        'holded_list_warehouse_stock',
        'holded_get_product_main_image',
        'holded_list_product_images',
        'holded_get_product_secondary_image',
        'holded_update_product_stock',
      ])
    );
  });

  it('keeps the scope map aligned with the MCP tool catalog', () => {
    const toolNames = [...holdedMcpTools.map((tool) => tool.name)].sort();
    const scopedToolNames = [...Object.keys(HOLDED_MCP_TOOL_SCOPES)].sort();

    expect(scopedToolNames).toEqual(toolNames);
  });

  it('builds the full OpenAI scope string without duplicates', () => {
    const scopes = buildScopeString(getHoldedMcpScopePreset('full'));

    expect(scopes).toContain('mcp.read');
    expect(scopes).toContain('holded.documents.write');
    expect(scopes).toContain('holded.projects.read');
    expect(scopes.split(' ').length).toBe(new Set(scopes.split(' ')).size);
  });

  it('grants invoices and accounting by default without opening unrelated modules', () => {
    const scopes = getHoldedMcpScopePreset('invoicing_accounting');
    const toolNames = getAllowedHoldedMcpToolNames(scopes);

    expect(scopes).toEqual(
      expect.arrayContaining([
        'mcp.read',
        'holded.invoices.write',
        'holded.documents.write',
        'holded.accounts.read',
        'holded.accounts.write',
        'holded.contacts.attachments.read',
        'holded.treasury.write',
        'holded.expenses.write',
        'holded.numbering.write',
        'holded.products.media.read',
        'holded.payments.write',
      ])
    );
    expect(scopes).not.toContain('holded.crm.read');
    expect(scopes).not.toContain('holded.projects.read');
    expect(scopes).not.toContain('holded.saleschannels.write');
    expect(scopes).not.toContain('holded.warehouses.write');

    expect(toolNames).toEqual(
      expect.arrayContaining([
        'holded_list_documents',
        'holded_create_document',
        'holded_create_contact',
        'holded_list_contact_attachments',
        'holded_get_contact_attachment',
        'holded_send_document',
        'holded_pay_document',
        'holded_get_document_pdf',
        'holded_list_daily_ledger',
        'holded_list_accounts',
        'holded_create_accounting_account',
        'holded_get_product_main_image',
        'holded_list_product_images',
        'holded_get_product_secondary_image',
        'holded_update_product_stock',
        'holded_update_treasury_account',
        'holded_create_expense_account',
        'holded_update_numbering_series',
        'holded_create_payment',
      ])
    );
    expect(toolNames).not.toContain('holded_list_bookings');
    expect(toolNames).not.toContain('holded_list_projects');
    expect(toolNames).not.toContain('holded_create_sales_channel');
    expect(toolNames).not.toContain('holded_update_warehouse');
    expect(toolNames).not.toContain('holded_create_contact_group');
    expect(toolNames).not.toContain('holded_clock_in_employee');
  });

  it('keeps the legacy openai_review_v2 preset stable at 14 tools (submission v1 reference)', () => {
    // openai_review_v2 fue el default público entre 2026-05-07 y 2026-05-18.
    // Lo mantenemos sin tocar para que cualquier PAT o cliente histórico que
    // siga pidiendo este preset explícitamente vea el mismo conjunto. El
    // default público actual es `claude_parity` — ver test abajo.
    const toolNames = [
      ...getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('openai_review_v2')),
    ].sort();

    expect(toolNames).toEqual(
      [
        'holded_create_invoice_draft',
        'holded_get_contact',
        'holded_get_invoice',
        'holded_get_project',
        'holded_list_accounts',
        'holded_list_bookings',
        'holded_list_contacts',
        'holded_list_crm_funnels',
        'holded_list_daily_ledger',
        'holded_list_invoices',
        'holded_list_leads',
        'holded_list_project_tasks',
        'holded_list_projects',
        'holded_list_time_records',
      ].sort()
    );
  });

  it('keeps the public claude_parity preset (current default) aligned 1:1 with tool-hint-justifications.json', () => {
    // 2026-05-18: DEFAULT_PUBLIC_SCOPE_PRESET pasó a `claude_parity` con la
    // submission v2 a OpenAI que combina los fixes del PR #88 + paridad
    // funcional con el conector Claude. El manifest declarado en
    // `docs/openai-submission/tool-hint-justifications.json` DEBE contener
    // EXACTAMENTE este mismo conjunto. Si este test falla, o bien:
    //   - actualiza el manifest para añadir/quitar la tool, O
    //   - revierte el cambio del preset.
    // Un mismatch runtime ↔ manifest es causa textbook de rejection en App Review.
    const toolNames = [
      ...getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('claude_parity')),
    ].sort();

    expect(toolNames).toEqual(
      [
        'holded_create_invoice_draft',
        'holded_get_contact',
        'holded_get_document',
        'holded_get_document_pdf',
        'holded_get_document_shipped_items',
        'holded_get_employee',
        'holded_get_invoice',
        'holded_get_product',
        'holded_get_project',
        'holded_get_treasury_account',
        'holded_get_warehouse',
        'holded_list_accounts',
        'holded_list_bookings',
        'holded_list_contacts',
        'holded_list_crm_funnels',
        'holded_list_daily_ledger',
        'holded_list_documents',
        'holded_list_employees',
        'holded_list_invoices',
        'holded_list_leads',
        'holded_list_numbering_series',
        'holded_list_products',
        'holded_list_project_tasks',
        'holded_list_projects',
        'holded_list_taxes',
        'holded_list_time_records',
        'holded_list_treasury_accounts',
        'holded_list_warehouse_stock',
        'holded_list_warehouses',
      ].sort()
    );

    expect(toolNames).toHaveLength(29);
  });

  it('normalizes draft invoice payloads before sending them to Holded', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_712_016_000_000);

    try {
      mockedHoldedAdapter.createDocument.mockResolvedValue({ id: 'doc-1' });

      const result = await callHoldedMcpTool('demo-key', 'holded_create_invoice_draft', {
        confirm: true,
        payload: {
          contactId: ' 69c5037c6ec42f8c1301f957 ',
          subject: 'Factura de prueba',
          products: [
            {
              name: 'Servicio de prueba',
              quantity: '1',
              price: '1000',
              tax: '21',
            },
          ],
        },
      });

      expect(mockedHoldedAdapter.createDocument).toHaveBeenCalledWith(
        'demo-key',
        'invoice',
        expect.objectContaining({
          contactId: '69c5037c6ec42f8c1301f957',
          date: 1_712_016_000,
          approveDoc: false,
          subject: 'Factura de prueba',
          lines: [
            expect.objectContaining({
              desc: 'Servicio de prueba',
              units: 1,
              price: 1000,
              tax: 21,
            }),
          ],
        })
      );
      expect(result).toEqual({ created: { id: 'doc-1' } });
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('forces draft invoice creation to approveDoc=false even if payload tries to override it', async () => {
    mockedHoldedAdapter.createDocument.mockResolvedValue({ id: 'doc-draft' });

    await callHoldedMcpTool('demo-key', 'holded_create_invoice_draft', {
      confirm: true,
      payload: {
        contactId: '69c5037c6ec42f8c1301f957',
        subject: 'Factura segura',
        approveDoc: true,
        lines: [
          {
            desc: 'Servicio',
            units: 1,
            price: 100,
          },
        ],
      },
    });

    expect(mockedHoldedAdapter.createDocument).toHaveBeenCalledWith(
      'demo-key',
      'invoice',
      expect.objectContaining({
        approveDoc: false,
      })
    );
  });

  it('fails fast when draft payloads omit any usable line items', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_create_invoice_draft', {
        confirm: true,
        payload: {
          contactId: '69c5037c6ec42f8c1301f957',
        },
      })
    ).rejects.toThrow('payload.lines or payload.products must be a non-empty array');
  });

  it('requires a bounded timestamp range for daily ledger listing', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_list_daily_ledger', {
        page: 1,
        endTimestamp: 1_704_153_599,
      })
    ).rejects.toThrow('Either startTimestamp (Unix seconds) or startDate (YYYY-MM-DD) is required');

    await expect(
      callHoldedMcpTool('demo-key', 'holded_list_daily_ledger', {
        page: 1,
        startTimestamp: 1_704_067_200,
      })
    ).rejects.toThrow('Either endTimestamp (Unix seconds) or endDate (YYYY-MM-DD) is required');
  });

  it('passes the required timestamp range to the daily ledger adapter', async () => {
    mockedHoldedAdapter.listDailyLedger.mockResolvedValue([{ id: 'entry-1' }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_daily_ledger', {
      page: 3,
      startTimestamp: 1_704_067_200,
      endTimestamp: 1_704_153_599,
    });

    expect(mockedHoldedAdapter.listDailyLedger).toHaveBeenCalledWith('demo-key', {
      page: 3,
      starttmp: 1_704_067_200,
      endtmp: 1_704_153_599,
      limit: 25,
    });
    expect(result).toEqual({ items: [{ id: 'entry-1' }] });
  });

  it('paginates the chart of accounts with defaults when no paging args are passed', async () => {
    mockedHoldedAdapter.listAccounts.mockResolvedValue([{ id: '70000001' }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_accounts', {});

    expect(mockedHoldedAdapter.listAccounts).toHaveBeenCalledWith('demo-key', {
      page: 1,
      limit: 25,
      includeEmpty: true,
    });
    expect(result).toEqual({ items: [{ id: '70000001' }] });
  });

  it('forwards explicit page and limit to the chart of accounts adapter', async () => {
    mockedHoldedAdapter.listAccounts.mockResolvedValue([{ id: '70000002' }]);

    await callHoldedMcpTool('demo-key', 'holded_list_accounts', { page: 3, limit: 50 });

    expect(mockedHoldedAdapter.listAccounts).toHaveBeenCalledWith('demo-key', {
      page: 3,
      limit: 50,
      includeEmpty: true,
    });
  });

  it('routes list document calls through the shared Holded adapter', async () => {
    mockedHoldedAdapter.listDocuments.mockResolvedValue([{ id: 'doc-1' }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_documents', {
      page: 2,
      limit: 10,
      docType: 'estimate',
    });

    expect(mockedHoldedAdapter.listDocuments).toHaveBeenCalledWith('demo-key', {
      page: 2,
      limit: 10,
      status: undefined,
      docType: 'estimate',
    });
    expect(result).toEqual({ items: [{ id: 'doc-1' }] });
  });

  it('normalizes email payloads before sending a Holded document', async () => {
    mockedHoldedAdapter.sendDocument.mockResolvedValue({ ok: true });

    const result = await callHoldedMcpTool('demo-key', 'holded_send_document', {
      confirm: true,
      docType: 'invoice',
      documentId: 'doc-1',
      payload: {
        emails: [' billing@example.com ', 'ops@example.com'],
        subject: 'Documento listo',
        docIds: 'doc-a; doc-b',
      },
    });

    expect(mockedHoldedAdapter.sendDocument).toHaveBeenCalledWith('demo-key', 'invoice', 'doc-1', {
      emails: ['billing@example.com', 'ops@example.com'],
      subject: 'Documento listo',
      docIds: ['doc-a', 'doc-b'],
    });
    expect(result).toEqual({ sent: { ok: true } });
  });

  it('normalizes pay-document payloads before sending them to Holded', async () => {
    mockedHoldedAdapter.payDocument.mockResolvedValue({ ok: true });

    const result = await callHoldedMcpTool('demo-key', 'holded_pay_document', {
      confirm: true,
      docType: 'purchase',
      documentId: 'doc-2',
      payload: {
        date: '1712016000',
        amount: '125.5',
        treasury: ' treasury-1 ',
        desc: ' Pago proveedor abril ',
      },
    });

    expect(mockedHoldedAdapter.payDocument).toHaveBeenCalledWith('demo-key', 'purchase', 'doc-2', {
      date: 1712016000,
      amount: 125.5,
      treasury: 'treasury-1',
      desc: 'Pago proveedor abril',
    });
    expect(result).toEqual({ paid: { ok: true } });
  });

  it('passes timestamp filters to payment listing', async () => {
    mockedHoldedAdapter.listPayments.mockResolvedValue([{ id: 'payment-1' }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_payments', {
      page: 2,
      limit: 20,
      startTimestamp: '1712016000',
      endTimestamp: 1714607999,
    });

    expect(mockedHoldedAdapter.listPayments).toHaveBeenCalledWith('demo-key', {
      page: 2,
      limit: 20,
      starttmp: 1712016000,
      endtmp: 1714607999,
    });
    expect(result).toEqual({ items: [{ id: 'payment-1' }] });
  });

  it('routes employee CRUD and clock actions through the Holded adapter', async () => {
    mockedHoldedAdapter.listEmployees.mockResolvedValue([{ id: 'employee-1' }]);
    mockedHoldedAdapter.getEmployee.mockResolvedValue({ id: 'employee-1' });
    mockedHoldedAdapter.createEmployee.mockResolvedValue({ id: 'employee-2' });
    mockedHoldedAdapter.updateEmployee.mockResolvedValue({ ok: true });
    mockedHoldedAdapter.clockInEmployee.mockResolvedValue({ ok: true });
    mockedHoldedAdapter.clockOutEmployee.mockResolvedValue({ ok: true });

    const listed = await callHoldedMcpTool('demo-key', 'holded_list_employees', {
      page: 2,
      limit: 5,
    });
    const item = await callHoldedMcpTool('demo-key', 'holded_get_employee', {
      employeeId: 'employee-1',
    });
    const created = await callHoldedMcpTool('demo-key', 'holded_create_employee', {
      confirm: true,
      payload: { name: 'Ada Lovelace' },
    });
    const updated = await callHoldedMcpTool('demo-key', 'holded_update_employee', {
      confirm: true,
      employeeId: 'employee-1',
      payload: { email: 'ada@example.com' },
    });
    const clockIn = await callHoldedMcpTool('demo-key', 'holded_clock_in_employee', {
      confirm: true,
      employeeId: 'employee-1',
      payload: { location: 'office' },
    });
    const clockOut = await callHoldedMcpTool('demo-key', 'holded_clock_out_employee', {
      confirm: true,
      employeeId: 'employee-1',
    });

    expect(mockedHoldedAdapter.listEmployees).toHaveBeenCalledWith('demo-key', {
      page: 2,
      limit: 5,
    });
    expect(mockedHoldedAdapter.getEmployee).toHaveBeenCalledWith('demo-key', 'employee-1');
    expect(mockedHoldedAdapter.createEmployee).toHaveBeenCalledWith('demo-key', {
      name: 'Ada Lovelace',
    });
    expect(mockedHoldedAdapter.updateEmployee).toHaveBeenCalledWith('demo-key', 'employee-1', {
      email: 'ada@example.com',
    });
    expect(mockedHoldedAdapter.clockInEmployee).toHaveBeenCalledWith('demo-key', 'employee-1', {
      location: 'office',
    });
    expect(mockedHoldedAdapter.clockOutEmployee).toHaveBeenCalledWith('demo-key', 'employee-1', {});
    expect(listed).toEqual({ items: [{ id: 'employee-1' }] });
    expect(item).toEqual({ item: { id: 'employee-1' } });
    expect(created).toEqual({ created: { id: 'employee-2' } });
    expect(updated).toEqual({ updated: { ok: true } });
    expect(clockIn).toEqual({ clockIn: { ok: true } });
    expect(clockOut).toEqual({ clockOut: { ok: true } });
  });

  it('requires date and amount for pay-document calls', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_pay_document', {
        confirm: true,
        docType: 'invoice',
        documentId: 'doc-2',
        payload: {
          treasury: 'treasury-1',
        },
      })
    ).rejects.toThrow('payload.date must be a valid unix timestamp');

    await expect(
      callHoldedMcpTool('demo-key', 'holded_pay_document', {
        confirm: true,
        docType: 'invoice',
        documentId: 'doc-2',
        payload: {
          date: 1712016000,
        },
      })
    ).rejects.toThrow('payload.amount must be a valid number');
  });

  it('returns PDF metadata through the MCP tool wrapper', async () => {
    mockedHoldedAdapter.getDocumentPdf.mockResolvedValue({
      base64: 'JVBERg==',
      contentType: 'application/pdf',
      fileName: 'invoice-doc-1.pdf',
      size: 4,
    });

    const result = await callHoldedMcpTool('demo-key', 'holded_get_document_pdf', {
      docType: 'invoice',
      documentId: 'doc-1',
    });

    expect(mockedHoldedAdapter.getDocumentPdf).toHaveBeenCalledWith('demo-key', 'invoice', 'doc-1');
    expect(result).toEqual({
      pdf: {
        base64: 'JVBERg==',
        contentType: 'application/pdf',
        fileName: 'invoice-doc-1.pdf',
        size: 4,
      },
    });
  });

  it('returns contact attachment metadata and binary content through the MCP wrappers', async () => {
    mockedHoldedAdapter.listContactAttachments.mockResolvedValue([{ fileName: 'contract.pdf' }]);
    mockedHoldedAdapter.getContactAttachment.mockResolvedValue({
      base64: 'JVBERg==',
      contentType: 'application/pdf',
      fileName: 'contract.pdf',
      size: 4,
    });

    const listed = await callHoldedMcpTool('demo-key', 'holded_list_contact_attachments', {
      contactId: 'contact-1',
    });
    const downloaded = await callHoldedMcpTool('demo-key', 'holded_get_contact_attachment', {
      contactId: 'contact-1',
      fileName: 'contract.pdf',
    });

    expect(mockedHoldedAdapter.listContactAttachments).toHaveBeenCalledWith(
      'demo-key',
      'contact-1'
    );
    expect(mockedHoldedAdapter.getContactAttachment).toHaveBeenCalledWith(
      'demo-key',
      'contact-1',
      'contract.pdf'
    );
    expect(listed).toEqual({ items: [{ fileName: 'contract.pdf' }] });
    expect(downloaded).toEqual({
      attachment: {
        base64: 'JVBERg==',
        contentType: 'application/pdf',
        fileName: 'contract.pdf',
        size: 4,
      },
    });
  });

  it('returns product media through the MCP wrappers', async () => {
    mockedHoldedAdapter.getProductMainImage.mockResolvedValue({
      base64: 'iVBORw==',
      contentType: 'image/png',
      fileName: 'product-main.png',
      size: 4,
    });
    mockedHoldedAdapter.listProductImages.mockResolvedValue(['detail-1.png', 'detail-2.png']);
    mockedHoldedAdapter.getProductSecondaryImage.mockResolvedValue({
      base64: 'iVBORw==',
      contentType: 'image/png',
      fileName: 'detail-1.png',
      size: 4,
    });

    const mainImage = await callHoldedMcpTool('demo-key', 'holded_get_product_main_image', {
      productId: 'product-1',
    });
    const images = await callHoldedMcpTool('demo-key', 'holded_list_product_images', {
      productId: 'product-1',
    });
    const secondaryImage = await callHoldedMcpTool(
      'demo-key',
      'holded_get_product_secondary_image',
      {
        productId: 'product-1',
        imageFileName: 'detail-1.png',
      }
    );

    expect(mockedHoldedAdapter.getProductMainImage).toHaveBeenCalledWith('demo-key', 'product-1');
    expect(mockedHoldedAdapter.listProductImages).toHaveBeenCalledWith('demo-key', 'product-1');
    expect(mockedHoldedAdapter.getProductSecondaryImage).toHaveBeenCalledWith(
      'demo-key',
      'product-1',
      'detail-1.png'
    );
    expect(mainImage).toEqual({
      image: {
        base64: 'iVBORw==',
        contentType: 'image/png',
        fileName: 'product-main.png',
        size: 4,
      },
    });
    expect(images).toEqual({ items: ['detail-1.png', 'detail-2.png'] });
    expect(secondaryImage).toEqual({
      image: {
        base64: 'iVBORw==',
        contentType: 'image/png',
        fileName: 'detail-1.png',
        size: 4,
      },
    });
  });

  it('updates product stock through the MCP wrapper', async () => {
    mockedHoldedAdapter.updateProductStock.mockResolvedValue({ ok: true });

    const result = await callHoldedMcpTool('demo-key', 'holded_update_product_stock', {
      confirm: true,
      productId: 'product-1',
      payload: {
        stock: {
          warehouseId: 'warehouse-1',
          units: 5,
        },
      },
    });

    expect(mockedHoldedAdapter.updateProductStock).toHaveBeenCalledWith('demo-key', 'product-1', {
      stock: {
        warehouseId: 'warehouse-1',
        units: 5,
      },
    });
    expect(result).toEqual({ updated: { ok: true } });
  });

  it('requires payload.stock for product stock updates', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_update_product_stock', {
        confirm: true,
        productId: 'product-1',
        payload: {
          units: 5,
        },
      })
    ).rejects.toThrow('payload.stock must be an object');
  });

  it('routes shipping actions through the Holded adapter', async () => {
    mockedHoldedAdapter.shipDocumentAllItems.mockResolvedValue({ ok: true });
    mockedHoldedAdapter.shipDocumentByLines.mockResolvedValue({ ok: true });
    mockedHoldedAdapter.getDocumentShippedItems.mockResolvedValue([{ sku: 'A1', shipped: 2 }]);

    const shipAll = await callHoldedMcpTool('demo-key', 'holded_ship_document_all_items', {
      confirm: true,
      documentId: 'sales-1',
    });
    const shipByLines = await callHoldedMcpTool('demo-key', 'holded_ship_document_by_lines', {
      confirm: true,
      documentId: 'sales-2',
      payload: {
        lines: [{ itemLinePosition: 0, quantity: 2 }],
      },
    });
    const shippedItems = await callHoldedMcpTool('demo-key', 'holded_get_document_shipped_items', {
      docType: 'salesorder',
      documentId: 'sales-3',
    });

    expect(mockedHoldedAdapter.shipDocumentAllItems).toHaveBeenCalledWith('demo-key', 'sales-1');
    expect(mockedHoldedAdapter.shipDocumentByLines).toHaveBeenCalledWith('demo-key', 'sales-2', {
      lines: [{ itemLinePosition: 0, quantity: 2 }],
    });
    expect(mockedHoldedAdapter.getDocumentShippedItems).toHaveBeenCalledWith(
      'demo-key',
      'salesorder',
      'sales-3'
    );
    expect(shipAll).toEqual({ shipped: { ok: true } });
    expect(shipByLines).toEqual({ shipped: { ok: true } });
    expect(shippedItems).toEqual({ items: [{ sku: 'A1', shipped: 2 }] });
  });

  it('normalizes document attachment payloads before upload', async () => {
    mockedHoldedAdapter.attachDocumentFile.mockResolvedValue({ ok: true });

    const result = await callHoldedMcpTool('demo-key', 'holded_attach_document_file', {
      confirm: true,
      docType: 'invoice',
      documentId: 'doc-9',
      payload: {
        fileName: 'invoice.pdf',
        base64: 'JVBERg==',
        contentType: 'application/pdf',
        setMain: true,
      },
    });

    expect(mockedHoldedAdapter.attachDocumentFile).toHaveBeenCalledWith(
      'demo-key',
      'invoice',
      'doc-9',
      {
        fileName: 'invoice.pdf',
        base64: 'JVBERg==',
        contentType: 'application/pdf',
        setMain: true,
      }
    );
    expect(result).toEqual({ attached: { ok: true } });
  });

  it('requires payload.lines for shipping by lines', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_ship_document_by_lines', {
        confirm: true,
        documentId: 'sales-2',
        payload: {},
      })
    ).rejects.toThrow('payload.lines must be a non-empty array');
  });

  it('lists warehouse stock through the Holded adapter', async () => {
    mockedHoldedAdapter.listWarehouseStock.mockResolvedValue([{ sku: 'A1', stock: 8 }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_warehouse_stock', {
      warehouseId: 'warehouse-1',
    });

    expect(mockedHoldedAdapter.listWarehouseStock).toHaveBeenCalledWith('demo-key', 'warehouse-1');
    expect(result).toEqual({ items: [{ sku: 'A1', stock: 8 }] });
  });

  it('validates accounting account payloads before creation', async () => {
    mockedHoldedAdapter.createAccountingAccount.mockResolvedValue({ id: '70000001' });

    const result = await callHoldedMcpTool('demo-key', 'holded_create_accounting_account', {
      confirm: true,
      payload: {
        prefix: '7000',
        name: 'Ventas demo',
        color: '#009966',
      },
    });

    expect(mockedHoldedAdapter.createAccountingAccount).toHaveBeenCalledWith('demo-key', {
      prefix: 7000,
      name: 'Ventas demo',
      color: '#009966',
    });
    expect(result).toEqual({ created: { id: '70000001' } });
  });

  it('requires at least two lines for daily ledger entries', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_create_daily_ledger_entry', {
        confirm: true,
        payload: {
          date: 1_712_016_000,
          lines: [{ account: '70000001', credit: 1000 }],
        },
      })
    ).rejects.toThrow('payload.lines must include at least 2 entry lines');
  });

  it('scans historical invoice pages when year is requested', async () => {
    mockedHoldedAdapter.listInvoicesHistory.mockResolvedValue({
      items: [{ id: 'inv-2025' }],
      history: {
        appliedRange: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z',
          year: 2025,
        },
        pagesScanned: 3,
        scanLimit: 12,
        reachedEnd: false,
        matchedItems: 8,
        returnedItems: 1,
        oldestScannedDate: '2025-01-14T00:00:00.000Z',
        newestScannedDate: '2026-04-01T00:00:00.000Z',
      },
    });

    const result = await callHoldedMcpTool('demo-key', 'holded_list_invoices', {
      year: 2025,
      limit: 10,
    });

    expect(mockedHoldedAdapter.listInvoicesHistory).toHaveBeenCalledWith('demo-key', {
      page: 1,
      limit: 10,
      status: undefined,
      year: 2025,
      from: undefined,
      to: undefined,
    });
    expect(result).toEqual({
      items: [{ id: 'inv-2025' }],
      history: {
        appliedRange: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-12-31T23:59:59.999Z',
          year: 2025,
        },
        pagesScanned: 3,
        scanLimit: 12,
        reachedEnd: false,
        matchedItems: 8,
        returnedItems: 1,
        oldestScannedDate: '2025-01-14T00:00:00.000Z',
        newestScannedDate: '2026-04-01T00:00:00.000Z',
      },
    });
  });

  it('requires confirm=true for write tools', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_create_contact', {
        payload: { name: 'Demo Contact' },
      })
    ).rejects.toThrow('Awaiting your confirmation');
  });

  it('throws HoldedUserError(confirmation_required) so the route can render it gracefully', async () => {
    try {
      await callHoldedMcpTool('demo-key', 'holded_create_invoice_draft', {
        confirm: false,
        payload: { contactId: 'c1', lines: [{ desc: 'x', units: 1, price: 1 }] },
      });
      throw new Error('expected HoldedUserError but call succeeded');
    } catch (err) {
      expect(err).toBeInstanceOf(HoldedUserError);
      expect((err as HoldedUserError).code).toBe('confirmation_required');
    }
  });

  it('returns a graceful not_found for holded_get_invoice when neither id nor docNumber matches', async () => {
    mockedHoldedAdapter.listInvoices.mockResolvedValue([]);
    mockedHoldedAdapter.listInvoicesHistory.mockResolvedValue({
      items: [],
      history: {
        appliedRange: { from: '', to: '' },
        pagesScanned: 0,
        scanLimit: 12,
        reachedEnd: true,
        matchedItems: 0,
        returnedItems: 0,
        oldestScannedDate: null,
        newestScannedDate: null,
      },
    });

    const result = (await callHoldedMcpTool('demo-key', 'holded_get_invoice', {
      invoiceId: 'test-invalid-invoice-id',
    })) as { error?: string; entity?: string; id?: string };

    expect(result.error).toBe('not_found');
    expect(result.entity).toBe('invoice');
    expect(result.id).toBe('test-invalid-invoice-id');
  });

  it('returns a graceful not_found for holded_list_project_tasks when Holded rejects the project id', async () => {
    const err = Object.assign(new Error('Holded API request failed with status 400: invalid id'), {
      status: 400,
    });
    mockedHoldedAdapter.listProjectTasks.mockRejectedValue(err);

    const result = (await callHoldedMcpTool('demo-key', 'holded_list_project_tasks', {
      projectId: 'test-invalid-project-id',
    })) as { error?: string; entity?: string };

    expect(result.error).toBe('not_found');
    expect(result.entity).toBe('project');
  });

  it('requires projectId for project task listing', async () => {
    await expect(callHoldedMcpTool('demo-key', 'holded_list_project_tasks', {})).rejects.toThrow(
      'projectId is required'
    );
  });
});
