import { classifyExpense } from './classify';

jest.mock('@/lib/db-queries', () => ({
  getExpenseCategories: jest.fn(),
}));

import { getExpenseCategories } from '@/lib/db-queries';

const mockedGetExpenseCategories = getExpenseCategories as jest.MockedFunction<typeof getExpenseCategories>;

describe('classifyExpense', () => {
  beforeEach(() => {
    mockedGetExpenseCategories.mockReset();
    mockedGetExpenseCategories.mockResolvedValue([
      { id: 1, code: 'other', name: 'Otros', is_deductible: true },
      { id: 2, code: 'office', name: 'Oficina', is_deductible: true },
      { id: 3, code: 'software', name: 'Software', is_deductible: true },
      { id: 4, code: 'marketing', name: 'Marketing', is_deductible: true },
      { id: 5, code: 'travel', name: 'Viajes', is_deductible: true },
      { id: 6, code: 'professional', name: 'Profesional', is_deductible: true },
      { id: 7, code: 'insurance', name: 'Seguros', is_deductible: true },
      { id: 8, code: 'taxes', name: 'Impuestos', is_deductible: false },
      { id: 9, code: 'banking', name: 'Banca', is_deductible: false },
      { id: 10, code: 'training', name: 'Formación', is_deductible: true },
    ]);
  });

  it('returns undefined if no categories exist', async () => {
    mockedGetExpenseCategories.mockResolvedValueOnce([]);
    await expect(classifyExpense('Factura 123')).resolves.toBeUndefined();
  });

  it('classifies bank fees as bank_fee + iva_no_deducible', async () => {
    const res = await classifyExpense('Comisión mantenimiento cuenta bancaria 12,50€');
    expect(res).toBeDefined();
    expect(res!.docType).toBe('bank_fee');
    expect(res!.taxCategory).toBe('iva_no_deducible');
    expect(res!.code).toBe('banking');
    expect(res!.signals.hasVat).toBe(false);
    expect(res!.signals.keywordsMatched.join(' ')).toMatch(/comisi|mantenim|banc/i);
  });

  it('classifies payroll as payroll + iva_no_deducible', async () => {
    const res = await classifyExpense('Nómina Febrero 2026 - Seguridad Social');
    expect(res).toBeDefined();
    expect(res!.docType).toBe('payroll');
    expect(res!.taxCategory).toBe('iva_no_deducible');
    expect(res!.signals.hasVat).toBe(false);
  });

  it('classifies invoice with IVA as invoice + iva_deducible', async () => {
    const res = await classifyExpense('Factura 2026/001 Base imponible 100 IVA 21% Total 121 CIF B12345678');
    expect(res).toBeDefined();
    expect(res!.docType).toBe('invoice');
    expect(res!.taxCategory).toBe('iva_deducible');
    expect(res!.signals.hasVat).toBe(true);
    expect(res!.signals.hasTaxId).toBe(true);
    expect(res!.signals.hasInvoiceWord).toBe(true);
  });

  it('invoice with non-deductible hints becomes iva_no_deducible', async () => {
    const res = await classifyExpense('Factura multa sanción 100 IVA 21%');
    expect(res).toBeDefined();
    expect(res!.docType).toBe('invoice');
    expect(res!.taxCategory).toBe('iva_no_deducible');

    const hints = res!.signals.nonDeductibleHintsMatched;
    if (Array.isArray(hints)) {
      expect(hints.length).toBeGreaterThan(0);
    }
  });

  it('classifies ticket keywords as ticket', async () => {
    const res = await classifyExpense('Ticket TPV VISA restaurante 24,90€');
    expect(res).toBeDefined();
    expect(res!.docType).toBe('ticket');
    expect(res!.signals.hasTicketWord).toBe(true);
  });

  it('matches category heuristics: software -> software', async () => {
    const res = await classifyExpense('Suscripción software licencia anual 99€');
    expect(res).toBeDefined();
    expect(res!.code).toBe('software');
  });
});
