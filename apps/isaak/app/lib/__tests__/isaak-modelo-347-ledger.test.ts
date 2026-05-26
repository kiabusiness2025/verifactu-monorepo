import {
  compute347FromLedger,
  UMBRAL_347,
  type LedgerEntryFor347,
} from '../isaak-modelo-347-ledger';

function row(overrides: Partial<LedgerEntryFor347> = {}): LedgerEntryFor347 {
  // Por defecto: invoice_out sin retención (amount = taxBase + IVA).
  const taxBase = overrides.taxBase ?? '1000.00';
  const baseN = Number.parseFloat(taxBase);
  const vatRate = overrides.vatRate ?? '21.00';
  const rateN = Number.parseFloat(vatRate);
  const vatAmount =
    overrides.vatAmount ?? ((baseN * rateN) / 100).toFixed(2);
  const amount =
    overrides.amount ?? (baseN + Number.parseFloat(vatAmount)).toFixed(2);
  return {
    docType: 'invoice_out',
    amount,
    taxBase,
    vatRate,
    vatAmount,
    entryDate: '2026-02-15',
    counterpartyNif: 'B12345678',
    counterpartyName: 'Cliente Acme SL',
    ...overrides,
    // re-apply computed amount/vatAmount if user only overrode taxBase
    ...(overrides.amount == null && overrides.vatAmount == null
      ? { amount, vatAmount }
      : {}),
  };
}

describe('compute347FromLedger — umbral y agrupación', () => {
  it(`exporta el cliente con > ${UMBRAL_347}€ anuales`, () => {
    const rows: LedgerEntryFor347[] = [
      row({ taxBase: '2000.00', entryDate: '2026-02-15' }), // T1
      row({ taxBase: '2000.00', entryDate: '2026-08-15' }), // T3
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(1);
    expect(out.result.lineasClientes[0]?.totalAnual).toBe(4000);
    expect(out.result.lineasClientes[0]?.trimestres).toEqual({ T1: 2000, T2: 0, T3: 2000, T4: 0 });
    expect(out.result.lineasClientes[0]?.operaciones).toBe(2);
  });

  it(`excluye contrapartes ≤ ${UMBRAL_347}€ anuales`, () => {
    const rows: LedgerEntryFor347[] = [
      row({ taxBase: '1000.00' }),
      row({ taxBase: '1000.00', entryDate: '2026-08-15' }),
      // total: 2000 → debajo de 3005.06
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(0);
    expect(out.result.contrapartesExcluidasPorUmbral).toBe(1);
  });

  it('umbral aplicado por separado a cliente y proveedor con mismo NIF', () => {
    const rows: LedgerEntryFor347[] = [
      row({ docType: 'invoice_out', taxBase: '4000.00' }),
      row({ docType: 'invoice_in', taxBase: '3500.00', amount: '4235.00' }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(1);
    expect(out.result.lineasProveedores).toHaveLength(1);
  });

  it('excluye operaciones intracomunitarias (van al 349)', () => {
    const rows: LedgerEntryFor347[] = [
      row({ counterpartyNif: 'PT123456789', taxBase: '5000.00', vatRate: '0.00' }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(0);
  });

  it('excluye operaciones con retención (van al 190/180)', () => {
    const rows: LedgerEntryFor347[] = [
      row({
        docType: 'invoice_in',
        taxBase: '4000.00',
        vatAmount: '840.00',
        amount: '4240.00', // bruto 4840 - retención 600 = 4240
      }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasProveedores).toHaveLength(0);
  });

  it('desglosa correctamente por trimestre', () => {
    const rows: LedgerEntryFor347[] = [
      row({ taxBase: '1000.00', entryDate: '2026-02-15' }), // T1
      row({ taxBase: '1000.00', entryDate: '2026-05-15' }), // T2
      row({ taxBase: '1000.00', entryDate: '2026-09-15' }), // T3
      row({ taxBase: '1500.00', entryDate: '2026-11-15' }), // T4
      // total: 4500 > umbral
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(1);
    expect(out.result.lineasClientes[0]?.trimestres).toEqual({
      T1: 1000,
      T2: 1000,
      T3: 1000,
      T4: 1500,
    });
  });

  it('excluye operaciones de años distintos', () => {
    const rows: LedgerEntryFor347[] = [
      row({ taxBase: '5000.00', entryDate: '2025-12-31' }), // ejercicio anterior
      row({ taxBase: '5000.00', entryDate: '2026-02-15' }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes[0]?.totalAnual).toBe(5000);
  });

  it('excluye filas sin counterpartyNif', () => {
    const rows: LedgerEntryFor347[] = [
      row({ counterpartyNif: null, taxBase: '5000.00' }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(0);
  });

  it('ordena líneas de mayor a menor importe', () => {
    const rows: LedgerEntryFor347[] = [
      row({ counterpartyNif: 'A1', taxBase: '5000.00' }),
      row({ counterpartyNif: 'B1', taxBase: '8000.00' }),
      row({ counterpartyNif: 'C1', taxBase: '3500.00' }),
    ];
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes.map((l) => l.nif)).toEqual(['B1', 'A1', 'C1']);
  });

  it('advierte si no hay líneas que superen el umbral', () => {
    const out = compute347FromLedger({ ejercicio: 2026, ledgerRows: [] });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineasClientes).toHaveLength(0);
    expect(out.result.advertencias.some((a) => a.includes('umbral'))).toBe(true);
  });
});
