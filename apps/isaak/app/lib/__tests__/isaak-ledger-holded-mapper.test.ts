import {
  HOLDED_DOC_TYPES,
  ledgerDocTypeForHolded,
  mapHoldedDocToAppendInput,
  toDecimalString,
  unixToIsoDate,
  type HoldedDocLike,
} from '../isaak-ledger-holded-mapper';

const TENANT = '11111111-1111-1111-1111-111111111111';

function holdedDoc(overrides: Partial<HoldedDocLike> = {}): HoldedDocLike {
  return {
    _id: 'h-abc123',
    docNumber: 'FAC-001',
    date: 1717200000, // 2024-06-01 00:00:00 UTC
    contact: { name: 'Acme SL', vatnumber: 'B12345678' },
    subtotal: 1000,
    tax: 210,
    total: 1210,
    currency: 'EUR',
    ...overrides,
  };
}

describe('unixToIsoDate', () => {
  it('converts unix seconds to YYYY-MM-DD in UTC', () => {
    expect(unixToIsoDate(1717200000)).toBe('2024-06-01');
    expect(unixToIsoDate(0)).toBeNull();
    expect(unixToIsoDate(-1)).toBeNull();
    expect(unixToIsoDate('not-a-number')).toBeNull();
    expect(unixToIsoDate(null)).toBeNull();
    expect(unixToIsoDate(NaN)).toBeNull();
  });
});

describe('toDecimalString', () => {
  it('formats numeric input to 2 decimals', () => {
    expect(toDecimalString(1210)).toBe('1210.00');
    expect(toDecimalString(0.1)).toBe('0.10');
    expect(toDecimalString(-50.5)).toBe('-50.50');
  });

  it('strips float drift from typical IVA computations', () => {
    expect(toDecimalString(1.21 * 100)).toBe('121.00');
  });

  it('parses well-formed decimal strings, rejects malformed', () => {
    expect(toDecimalString('1234.56')).toBe('1234.56');
    expect(toDecimalString('1,200')).toBeNull();
    expect(toDecimalString('twenty')).toBeNull();
  });

  it('returns null for nullish / non-finite input', () => {
    expect(toDecimalString(null)).toBeNull();
    expect(toDecimalString(undefined)).toBeNull();
    expect(toDecimalString(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toDecimalString(NaN)).toBeNull();
  });
});

describe('ledgerDocTypeForHolded', () => {
  it('maps sales documents to invoice_out', () => {
    expect(ledgerDocTypeForHolded('invoice')).toBe('invoice_out');
    expect(ledgerDocTypeForHolded('salesreceipt')).toBe('invoice_out');
    expect(ledgerDocTypeForHolded('creditnote')).toBe('invoice_out');
  });

  it('maps purchase documents to invoice_in', () => {
    expect(ledgerDocTypeForHolded('purchase')).toBe('invoice_in');
    expect(ledgerDocTypeForHolded('purchaserefund')).toBe('invoice_in');
  });

  it('returns null for non-fiscal docs (estimate, proforma, order)', () => {
    expect(ledgerDocTypeForHolded('estimate')).toBeNull();
    expect(ledgerDocTypeForHolded('proforma')).toBeNull();
    expect(ledgerDocTypeForHolded('purchaseorder')).toBeNull();
  });

  it('exposes all known Holded doc types', () => {
    expect(HOLDED_DOC_TYPES).toContain('invoice');
    expect(HOLDED_DOC_TYPES).toContain('purchaserefund');
    expect(HOLDED_DOC_TYPES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('mapHoldedDocToAppendInput', () => {
  it('maps a typical invoice (venta) with all fields', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc(),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.tenantId).toBe(TENANT);
    expect(result.input.docType).toBe('invoice_out');
    expect(result.input.entryDate).toBe('2024-06-01');
    expect(result.input.amount).toBe('1210.00');
    expect(result.input.taxBase).toBe('1000.00');
    expect(result.input.vatAmount).toBe('210.00');
    expect(result.input.counterpartyName).toBe('Acme SL');
    expect(result.input.counterpartyNif).toBe('B12345678');
    expect(result.input.docNumber).toBe('FAC-001');
    expect(result.input.sourceSystem).toBe('holded');
    expect(result.input.holdedId).toBe('h-abc123');
    expect(result.input.currency).toBe('EUR');
    // PGC inference: invoice → 430 Clientes / 700 Ventas
    expect(result.input.accountDebit).toBe('430');
    expect(result.input.accountCredit).toBe('700');
  });

  it('maps a purchase to invoice_in with PGC 600/400', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc({ _id: 'h-pur-1' }),
      holdedDocType: 'purchase',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.docType).toBe('invoice_in');
    expect(result.input.accountDebit).toBe('600');
    expect(result.input.accountCredit).toBe('400');
  });

  it('PGC inference — all fiscal doc types', () => {
    const cases: Array<[import('../isaak-ledger-holded-mapper').HoldedDocType, string, string]> = [
      ['invoice', '430', '700'],
      ['salesreceipt', '572', '700'],
      ['creditnote', '700', '430'],
      ['purchase', '600', '400'],
      ['purchaserefund', '400', '600'],
    ];
    for (const [docType, debit, credit] of cases) {
      const r = mapHoldedDocToAppendInput({
        doc: holdedDoc({ _id: `h-${docType}` }),
        holdedDocType: docType,
        tenantId: TENANT,
        createdBy: 'isaak-auto',
      });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.input.accountDebit).toBe(debit);
      expect(r.input.accountCredit).toBe(credit);
    }
  });

  it('rejects non-fiscal doc types (estimate)', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc(),
      holdedDocType: 'estimate',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/non_fiscal_doc_type/);
  });

  it('rejects docs without a Holded id', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc({ _id: '', id: undefined }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing_holded_id');
  });

  it('rejects docs with invalid or missing date', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc({ date: undefined }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_date');
  });

  it('rejects docs with invalid total', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc({ total: 'na' }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_total');
  });

  it('falls back to legacy field names (id, number, contactName)', () => {
    const result = mapHoldedDocToAppendInput({
      doc: {
        id: 'legacy-1',
        number: 'OLD-FAC-1',
        date: 1717200000,
        contactName: 'Old Provider SL',
        subtotal: 100,
        tax: 21,
        total: 121,
      },
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input.holdedId).toBe('legacy-1');
    expect(result.input.docNumber).toBe('OLD-FAC-1');
    expect(result.input.counterpartyName).toBe('Old Provider SL');
    expect(result.input.counterpartyNif).toBeNull();
  });

  it('uses default description when none provided', () => {
    const result = mapHoldedDocToAppendInput({
      doc: holdedDoc({ description: undefined, notes: undefined }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.description).toMatch(/Holded invoice FAC-001/);
    }
  });

  it('uppercases currency and defaults to EUR when missing', () => {
    const lower = mapHoldedDocToAppendInput({
      doc: holdedDoc({ currency: 'usd' }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    if (lower.ok) expect(lower.input.currency).toBe('USD');

    const missing = mapHoldedDocToAppendInput({
      doc: holdedDoc({ currency: undefined }),
      holdedDocType: 'invoice',
      tenantId: TENANT,
      createdBy: 'isaak-auto',
    });
    if (missing.ok) expect(missing.input.currency).toBe('EUR');
  });
});
