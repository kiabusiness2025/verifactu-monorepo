import { normalizeCanonicalExpense } from './canonical';

describe('normalizeCanonicalExpense', () => {
  it('infers issueDate from uploadDate and adds warning', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Factura 1',
      amount: 121,
      uploadDate: '2026-03-01T10:00:00Z',
      // no issueDate, no date
      docType: 'invoice',
      taxCategory: 'iva_deducible',
      vatRate: 21,
      supplierName: 'Proveedor SL',
    });

    expect(res.date).toBe('2026-03-01');
    expect(res.warnings).toContain('issueDate_inferred_from_upload');
    expect(res.canonicalV2.issueDate).toBe('2026-03-01');
  });

  it('adds warning when supplierTaxId is missing', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Factura 1',
      issueDate: '2026-03-01',
      amount: 121,
      docType: 'invoice',
      taxCategory: 'iva_deducible',
      vatRate: 21,
      supplierName: 'Proveedor SL',
      supplierTaxId: null,
    });

    expect(res.canonicalV2.supplierTaxId).toBeNull();
    expect(res.warnings).toContain('missing_supplier_tax_id');
  });

  it('estimates net/vat amounts if only total + vatRate are present', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Factura 1',
      issueDate: '2026-03-01',
      amount: 121,
      vatRate: 21,
      docType: 'invoice',
      taxCategory: 'iva_deducible',
      supplierName: 'Proveedor SL',
      supplierTaxId: 'B12345678',
    });

    expect(res.canonicalV2.totalAmount).toBe(121);
    expect(res.canonicalV2.netAmount).toBeCloseTo(100, 2);
    expect(res.canonicalV2.vatAmount).toBeCloseTo(21, 2);
    expect(res.warnings).toContain('amounts_estimated');
  });

  it('adds warning if missing tax breakdown and no vatRate', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Gasto sin desglose',
      issueDate: '2026-03-01',
      amount: 50,
      // no vatRate, no netAmount/vatAmount
      docType: 'other',
      taxCategory: 'pendiente_confirmacion',
      supplierName: 'Proveedor SL',
      supplierTaxId: 'B12345678',
    });

    expect(res.warnings).toContain('missing_tax_breakdown');
    expect(res.canonicalV2.netAmount).toBeNull();
    expect(res.canonicalV2.vatAmount).toBeNull();
  });

  it('warns when non-invoice is marked as iva_deducible', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Ticket restaurante',
      issueDate: '2026-03-01',
      amount: 24.9,
      vatRate: 10,
      docType: 'ticket',
      taxCategory: 'iva_deducible',
      supplierName: 'Restaurante X',
      supplierTaxId: 'B12345678',
    });

    expect(res.docType).toBe('ticket');
    expect(res.taxCategory).toBe('iva_deducible');
    expect(res.warnings).toContain('non_invoice_marked_deductible_check');
  });

  it('bank_fee defaults to iva_no_deducible and produces consistent amounts', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Comisión mantenimiento cuenta',
      issueDate: '2026-03-01',
      amount: 12.5,
      docType: 'bank_fee',
      // sin vatRate / sin net/vat
      supplierName: 'Banco X',
      supplierTaxId: null,
    });

    // En vuestra versión actual, puede quedar net/vat en null con missing_tax_breakdown.
    // Con el patch recomendado, quedará net=total y vat=0. Comprobamos ambos casos.
    const net = res.canonicalV2.netAmount;
    const vat = res.canonicalV2.vatAmount;

    expect(res.docType).toBe('bank_fee');
    expect(res.taxCategory).toBe('iva_no_deducible');

    if (net !== null && vat !== null) {
      expect(net).toBeCloseTo(12.5, 2);
      expect(vat).toBeCloseTo(0, 2);
    } else {
      expect(res.warnings).toContain('missing_tax_breakdown');
    }
  });

  it('payroll defaults to iva_no_deducible', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Nómina marzo',
      issueDate: '2026-03-01',
      amount: 1500,
      docType: 'payroll',
      supplierName: 'Empresa SL',
      supplierTaxId: 'B12345678',
    });

    expect(res.docType).toBe('payroll');
    expect(res.taxCategory).toBe('iva_no_deducible');
  });

  it('converts vatRate percent to taxRate fraction for DB', () => {
    const res = normalizeCanonicalExpense({
      tenantId: 't1',
      description: 'Factura 1',
      issueDate: '2026-03-01',
      amount: 121,
      vatRate: 21,
      docType: 'invoice',
      taxCategory: 'iva_deducible',
      supplierName: 'Proveedor SL',
      supplierTaxId: 'B12345678',
    });

    expect(res.taxRate).toBeCloseTo(0.21, 4);
  });

  it('throws if tenantId is missing', () => {
    expect(() => normalizeCanonicalExpense({ description: 'x', amount: 1 } as any)).toThrow(/tenantId/i);
  });

  it('throws if description is missing', () => {
    expect(() =>
      normalizeCanonicalExpense({
        tenantId: 't1',
        description: '',
        amount: 1,
      }),
    ).toThrow(/description/i);
  });

  it('throws if amount is invalid', () => {
    expect(() =>
      normalizeCanonicalExpense({
        tenantId: 't1',
        description: 'x',
        amount: 0,
      }),
    ).toThrow(/amount/i);
  });
});
