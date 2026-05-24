import { parseInvoiceJson } from '../isaak-ocr-invoice-parser';

const MODEL = 'gpt-4o';

describe('parseInvoiceJson', () => {
  it('parses a well-formed Spanish invoice with one tax row', () => {
    const raw = JSON.stringify({
      vendor: { name: 'Acme Distribuciones SL', taxId: 'B12345678' },
      customer: { name: 'Cliente SL', taxId: 'B98765432' },
      invoiceNumber: 'F2026-0042',
      issueDate: '2026-03-15',
      dueDate: '2026-04-15',
      currency: 'EUR',
      subtotal: 1000,
      taxes: [{ rate: 21, base: 1000, amount: 210 }],
      total: 1210,
      lines: [
        { description: 'Consultoría', quantity: 1, unitPrice: 1000, amount: 1000 },
      ],
      notes: null,
      confidence: 0.95,
    });
    const r = parseInvoiceJson(raw, MODEL, 1200);
    expect(r.vendor.name).toBe('Acme Distribuciones SL');
    expect(r.vendor.taxId).toBe('B12345678');
    expect(r.invoiceNumber).toBe('F2026-0042');
    expect(r.issueDate).toBe('2026-03-15');
    expect(r.subtotal).toBe(1000);
    expect(r.total).toBe(1210);
    expect(r.taxes).toEqual([{ rate: 21, base: 1000, amount: 210 }]);
    expect(r.lines.length).toBe(1);
    expect(r.confidence).toBeCloseTo(0.95);
  });

  it('parses European number formats with comma decimals', () => {
    const raw = JSON.stringify({
      total: '1.234,56',
      subtotal: '1.020,30',
    });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.total).toBe(1234.56);
    expect(r.subtotal).toBe(1020.3);
  });

  it('parses dd/mm/yyyy dates to ISO', () => {
    const raw = JSON.stringify({ issueDate: '15/03/2026', dueDate: '15/04/2026' });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.issueDate).toBe('2026-03-15');
    expect(r.dueDate).toBe('2026-04-15');
  });

  it('handles 2-digit year by assuming 20xx', () => {
    const raw = JSON.stringify({ issueDate: '15/3/26' });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.issueDate).toBe('2026-03-15');
  });

  it('returns nulls + parseError on invalid JSON', () => {
    const r = parseInvoiceJson('not json', MODEL, 100);
    expect(r.parseError).toBe('invalid_json');
    expect(r.total).toBeNull();
    expect(r.vendor.name).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it('returns nulls when JSON is not an object', () => {
    const r = parseInvoiceJson('[]', MODEL, 100);
    expect(r.parseError).toBe('not_object');
  });

  it('drops line items without description (no fabrication)', () => {
    const raw = JSON.stringify({
      lines: [
        { description: 'Valid line', amount: 100 },
        { description: '', amount: 50 },
        { quantity: 1, amount: 30 },
        null,
      ],
    });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0].description).toBe('Valid line');
  });

  it('drops tax rows with all null fields', () => {
    const raw = JSON.stringify({
      taxes: [
        { rate: 21, base: 100, amount: 21 },
        { rate: null, base: null, amount: null },
        { rate: 10, base: null, amount: null },
      ],
    });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.taxes.length).toBe(2);
  });

  it('clamps confidence above 1 (model returned percent)', () => {
    const r = parseInvoiceJson(JSON.stringify({ confidence: 85 }), MODEL, 100);
    expect(r.confidence).toBeCloseTo(0.85);
  });

  it('clamps negative confidence to 0', () => {
    const r = parseInvoiceJson(JSON.stringify({ confidence: -5 }), MODEL, 100);
    expect(r.confidence).toBe(0);
  });

  it('accepts taxId under multiple field aliases', () => {
    const raw = JSON.stringify({
      vendor: { name: 'A', cif: 'B11111111' },
      customer: { name: 'B', nif: 'X9999999Y' },
    });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.vendor.taxId).toBe('B11111111');
    expect(r.customer.taxId).toBe('X9999999Y');
  });

  it('strips euro symbol and thousands separator from numeric strings', () => {
    const raw = JSON.stringify({ total: '€ 1.000,00', subtotal: '826,45 €' });
    const r = parseInvoiceJson(raw, MODEL, 100);
    expect(r.total).toBe(1000);
    expect(r.subtotal).toBe(826.45);
  });

  it('caps lines at 50 entries (defense against runaway model)', () => {
    const lines = Array.from({ length: 80 }, (_, i) => ({
      description: `Line ${i}`,
      amount: 1,
    }));
    const r = parseInvoiceJson(JSON.stringify({ lines }), MODEL, 100);
    expect(r.lines.length).toBe(50);
  });
});
