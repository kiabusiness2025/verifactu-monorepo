/** @jest-environment node */

/**
 * B6 (sesion 7 hardening) — Tests del smart lookup en holded_get_invoice (B5).
 *
 * El handler acepta tanto el cuid interno (24 chars hex) como el docNumber
 * visible (ej. F0030). Cuando recibe un docNumber, lista facturas en el
 * default endpoint, despues fallback a history del año en curso, y despues
 * al año anterior. Si nada matchea → error con guia para el modelo.
 */

jest.mock('./accounting', () => ({
  holdedAdapter: {
    getInvoice: jest.fn(),
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
import { callHoldedMcpTool } from './holdedMcpTools';

const mockedAdapter = holdedAdapter as unknown as {
  getInvoice: jest.Mock;
  listInvoices: jest.Mock;
  listInvoicesHistory: jest.Mock;
};

const API_KEY = 'a'.repeat(32);
const CUID = 'a'.repeat(24); // 24-char hex
const DOC_NUMBER = 'F0030';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('holded_get_invoice (B5 smart lookup)', () => {
  it('llama directamente a getInvoice cuando recibe un cuid de 24 hex chars', async () => {
    mockedAdapter.getInvoice.mockResolvedValueOnce({ id: CUID, docNumber: 'F0001', total: 100 });

    const result = await callHoldedMcpTool(API_KEY, 'holded_get_invoice', { invoiceId: CUID });

    expect(mockedAdapter.getInvoice).toHaveBeenCalledTimes(1);
    expect(mockedAdapter.getInvoice).toHaveBeenCalledWith(API_KEY, CUID);
    expect(mockedAdapter.listInvoices).not.toHaveBeenCalled();
    expect(mockedAdapter.listInvoicesHistory).not.toHaveBeenCalled();
    expect((result as { item?: unknown }).item).toEqual(
      expect.objectContaining({ id: CUID, docNumber: 'F0001' })
    );
  });

  it('busca en listInvoices cuando recibe un docNumber y resuelve con su id', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([
      { id: 'b'.repeat(24), docNumber: 'F0029' },
      { id: CUID, docNumber: 'F0030' },
    ]);
    mockedAdapter.getInvoice.mockResolvedValueOnce({
      id: CUID,
      docNumber: 'F0030',
      total: 250,
    });

    const result = await callHoldedMcpTool(API_KEY, 'holded_get_invoice', {
      invoiceId: DOC_NUMBER,
    });

    expect(mockedAdapter.listInvoices).toHaveBeenCalledTimes(1);
    expect(mockedAdapter.listInvoices).toHaveBeenCalledWith(API_KEY, { page: 1, limit: 100 });
    expect(mockedAdapter.getInvoice).toHaveBeenCalledTimes(1);
    expect(mockedAdapter.getInvoice).toHaveBeenCalledWith(API_KEY, CUID);
    expect((result as { item?: unknown }).item).toEqual(
      expect.objectContaining({ docNumber: 'F0030' })
    );
  });

  it('hace fallback a listInvoicesHistory del año en curso si no esta en la lista por defecto', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([{ id: 'b'.repeat(24), docNumber: 'F0029' }]);
    mockedAdapter.listInvoicesHistory.mockResolvedValueOnce({
      items: [{ id: CUID, docNumber: 'F0030' }],
    });
    mockedAdapter.getInvoice.mockResolvedValueOnce({ id: CUID, docNumber: 'F0030' });

    await callHoldedMcpTool(API_KEY, 'holded_get_invoice', { invoiceId: DOC_NUMBER });

    expect(mockedAdapter.listInvoicesHistory).toHaveBeenCalledTimes(1);
    const callArgs = mockedAdapter.listInvoicesHistory.mock.calls[0][1];
    expect(callArgs).toMatchObject({ page: 1, limit: 100 });
    expect(typeof callArgs.year).toBe('number');
    expect(mockedAdapter.getInvoice).toHaveBeenCalledWith(API_KEY, CUID);
  });

  it('hace fallback al año anterior si tampoco esta en el actual', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([]);
    mockedAdapter.listInvoicesHistory
      .mockResolvedValueOnce({ items: [] }) // current year empty
      .mockResolvedValueOnce({ items: [{ id: CUID, docNumber: 'F0030' }] });
    mockedAdapter.getInvoice.mockResolvedValueOnce({ id: CUID });

    await callHoldedMcpTool(API_KEY, 'holded_get_invoice', { invoiceId: DOC_NUMBER });

    expect(mockedAdapter.listInvoicesHistory).toHaveBeenCalledTimes(2);
    const firstYear = mockedAdapter.listInvoicesHistory.mock.calls[0][1].year;
    const secondYear = mockedAdapter.listInvoicesHistory.mock.calls[1][1].year;
    expect(secondYear).toBe(firstYear - 1);
  });

  it('devuelve una respuesta controlada not_found si nada matchea', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([]);
    mockedAdapter.listInvoicesHistory
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });

    // El smart lookup ya no lanza: devuelve un error controlado `not_found`
    // (mismo patrón que get_document) para que el modelo lo gestione.
    const result = await callHoldedMcpTool(API_KEY, 'holded_get_invoice', {
      invoiceId: 'F9999',
    });
    expect(result).toMatchObject({ error: 'not_found', id: 'F9999', entity: 'invoice' });

    expect(mockedAdapter.getInvoice).not.toHaveBeenCalled();
  });

  it('matchea por field "number" además de "docNumber" (compat con docs antiguos)', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([
      { _id: CUID, number: 'F0030' }, // sin field "id" ni "docNumber"
    ]);
    mockedAdapter.getInvoice.mockResolvedValueOnce({ id: CUID, number: 'F0030' });

    await callHoldedMcpTool(API_KEY, 'holded_get_invoice', { invoiceId: DOC_NUMBER });

    // Resuelve con _id como fallback cuando id no esta presente
    expect(mockedAdapter.getInvoice).toHaveBeenCalledWith(API_KEY, CUID);
  });

  it('matchea case-insensitive', async () => {
    mockedAdapter.listInvoices.mockResolvedValueOnce([{ id: CUID, docNumber: 'F0030' }]);
    mockedAdapter.getInvoice.mockResolvedValueOnce({ id: CUID });

    await callHoldedMcpTool(API_KEY, 'holded_get_invoice', { invoiceId: 'f0030' });

    expect(mockedAdapter.getInvoice).toHaveBeenCalledWith(API_KEY, CUID);
  });

  it('rechaza cuando invoiceId esta ausente', async () => {
    await expect(callHoldedMcpTool(API_KEY, 'holded_get_invoice', {})).rejects.toThrow();
  });
});
