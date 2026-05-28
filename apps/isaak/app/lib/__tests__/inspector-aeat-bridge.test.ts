import {
  INSPECTOR_SKIPPED_TOOLS,
  isInspectableWriteTool,
  toolUseToRuleContext,
} from '../inspector-aeat-bridge';

describe('isInspectableWriteTool', () => {
  it('returns true for tools the bridge covers', () => {
    expect(isInspectableWriteTool('holded_create_invoice_draft')).toBe(true);
    expect(isInspectableWriteTool('isaak_ledger_create_entry')).toBe(true);
  });

  it('returns false for tools explicitly skipped', () => {
    for (const t of INSPECTOR_SKIPPED_TOOLS) {
      expect(isInspectableWriteTool(t)).toBe(false);
    }
  });

  it('returns false for unknown tools', () => {
    expect(isInspectableWriteTool('whatever')).toBe(false);
    expect(isInspectableWriteTool('')).toBe(false);
  });
});

describe('toolUseToRuleContext — holded_create_invoice_draft', () => {
  it('aggregates items into amount/vatBase/vatAmount and firstTaxRate', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'holded_create_invoice_draft',
      toolInput: {
        contactId: 'c-1',
        items: [
          { name: 'Consultoría mayo', units: 10, subtotal: 80, tax: 21 },
          { name: 'Soporte', units: 1, subtotal: 200, tax: 21 },
        ],
        date: '2026-05-01',
      },
    });
    expect(ctx).not.toBeNull();
    if (!ctx) return;
    expect(ctx.action).toBe('invoice_out');
    if (ctx.action !== 'invoice_out') return;
    expect(ctx.data.amount).toBe('1210.00');
    expect(ctx.data.vatBase).toBe('1000.00');
    expect(ctx.data.vatAmount).toBe('210.00');
    expect(ctx.data.vatRate).toBe('21.00');
    expect(ctx.data.description).toContain('Consultoría mayo');
    expect(ctx.data.date).toBe('2026-05-01');
  });

  it('returns null when no items are present', () => {
    expect(
      toolUseToRuleContext({
        toolName: 'holded_create_invoice_draft',
        toolInput: { contactId: 'c-1', items: [] },
      }),
    ).toBeNull();
  });

  it('falls back to notes if no item names', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'holded_create_invoice_draft',
      toolInput: {
        contactId: 'c-1',
        items: [{ units: 1, subtotal: 100, tax: 21 }],
        notes: 'Factura mensual',
      },
    });
    if (ctx?.action !== 'invoice_out') throw new Error('expected invoice_out');
    expect(ctx.data.description).toBe('Factura mensual');
  });

  it('falls back to today when date is invalid', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'holded_create_invoice_draft',
      toolInput: {
        contactId: 'c-1',
        items: [{ name: 'x', units: 1, subtotal: 100, tax: 21 }],
        date: 'malformed',
      },
      now: new Date('2026-05-25T10:00:00Z'),
    });
    if (ctx?.action !== 'invoice_out') throw new Error('expected invoice_out');
    expect(ctx.data.date).toBe('2026-05-25');
  });
});

describe('toolUseToRuleContext — isaak_ledger_create_entry', () => {
  it('maps docType=invoice_in to invoice_in context with full decimals', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'isaak_ledger_create_entry',
      toolInput: {
        docType: 'invoice_in',
        amount: '1210.00',
        taxBase: '1000.00',
        vatRate: '21.00',
        vatAmount: '210.00',
        description: 'Gasoil camión reparto',
        sourceSystem: 'manual',
        entryDate: '2026-05-01',
        counterpartyNif: 'B12345678',
      },
    });
    if (ctx?.action !== 'invoice_in') throw new Error('expected invoice_in');
    expect(ctx.data.amount).toBe('1210.00');
    expect(ctx.data.vatRate).toBe('21.00');
    expect(ctx.data.counterpartyNif).toBe('B12345678');
    expect(ctx.data.description).toContain('Gasoil');
  });

  it('maps docType=invoice_out to invoice_out context', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'isaak_ledger_create_entry',
      toolInput: {
        docType: 'invoice_out',
        amount: '500.00',
        description: 'Servicios mayo',
        sourceSystem: 'manual',
        entryDate: '2026-05-01',
      },
    });
    expect(ctx?.action).toBe('invoice_out');
  });

  it('maps docType=journal to journal context with debit/credit', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'isaak_ledger_create_entry',
      toolInput: {
        docType: 'journal',
        amount: '100.00',
        description: 'Asiento',
        sourceSystem: 'manual',
        entryDate: '2026-05-01',
        accountDebit: '430',
        accountCredit: '700',
      },
    });
    if (ctx?.action !== 'journal') throw new Error('expected journal');
    expect(ctx.data.accountDebit).toBe('430');
    expect(ctx.data.accountCredit).toBe('700');
  });

  it('maps docType=tax_payment to tax_payment context with default model', () => {
    const ctx = toolUseToRuleContext({
      toolName: 'isaak_ledger_create_entry',
      toolInput: {
        docType: 'tax_payment',
        amount: '500.00',
        description: 'Ingreso 303 Q1',
        sourceSystem: 'manual',
        entryDate: '2026-04-15',
      },
    });
    if (ctx?.action !== 'tax_payment') throw new Error('expected tax_payment');
    expect(ctx.data.amount).toBe('500.00');
    expect(ctx.data.model).toBe('303');
  });

  it('returns null when docType is unrecognized', () => {
    expect(
      toolUseToRuleContext({
        toolName: 'isaak_ledger_create_entry',
        toolInput: { docType: 'unknown', amount: '1', description: 'x', sourceSystem: 'manual' },
      }),
    ).toBeNull();
  });

  it('returns null when amount is missing or invalid', () => {
    expect(
      toolUseToRuleContext({
        toolName: 'isaak_ledger_create_entry',
        toolInput: { docType: 'invoice_in', description: 'x', sourceSystem: 'manual' },
      }),
    ).toBeNull();
    expect(
      toolUseToRuleContext({
        toolName: 'isaak_ledger_create_entry',
        toolInput: { docType: 'invoice_in', amount: 'not-a-number', description: 'x', sourceSystem: 'manual' },
      }),
    ).toBeNull();
  });
});

describe('toolUseToRuleContext — other tools', () => {
  it('returns null for tools not covered yet', () => {
    expect(
      toolUseToRuleContext({
        toolName: 'holded_register_payment',
        toolInput: { documentId: 'x', amount: 100 },
      }),
    ).toBeNull();
    expect(
      toolUseToRuleContext({
        toolName: 'holded_create_contact',
        toolInput: { name: 'Acme' },
      }),
    ).toBeNull();
    expect(toolUseToRuleContext({ toolName: 'unknown_tool', toolInput: {} })).toBeNull();
  });
});
