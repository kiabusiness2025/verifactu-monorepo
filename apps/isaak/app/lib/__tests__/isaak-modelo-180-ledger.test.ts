import {
  compute180FromLedger,
  type LedgerEntryFor180,
} from '../isaak-modelo-180-ledger';

function row(overrides: Partial<LedgerEntryFor180> = {}): LedgerEntryFor180 {
  return {
    docType: 'invoice_in',
    amount: '1020.00',
    taxBase: '1000.00',
    vatAmount: '210.00',
    entryDate: '2026-02-15',
    description: 'Alquiler oficina',
    accountDebit: '621',
    counterpartyNif: 'B12345678',
    counterpartyName: 'Arrendador SL',
    ...overrides,
  };
}

describe('compute180FromLedger — rollup anual', () => {
  it('agrega 12 mensualidades del mismo arrendador en 1 línea', () => {
    const rows: LedgerEntryFor180[] = [];
    for (let m = 1; m <= 12; m++) {
      rows.push(
        row({ entryDate: `2026-${String(m).padStart(2, '0')}-15`, amount: '1020.00' }),
      );
    }
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
    expect(out.result.lineas[0]?.operaciones).toBe(12);
    expect(out.result.lineas[0]?.baseAnual).toBe(12000);
    expect(out.result.lineas[0]?.retencionAnual).toBe(2280); // 190*12
    expect(out.result.totalRetenciones).toBe(2280);
    expect(out.result.perceptores).toBe(1);
  });

  it('separa arrendadores distintos en líneas diferentes', () => {
    const rows: LedgerEntryFor180[] = [
      row({ counterpartyNif: 'B11111111', amount: '1020.00' }),
      row({ counterpartyNif: 'B22222222', amount: '510.00', taxBase: '500.00', vatAmount: '105.00' }),
    ];
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(2);
    expect(out.result.perceptores).toBe(2);
  });

  it('excluye filas sin NIF arrendador', () => {
    const rows: LedgerEntryFor180[] = [
      row({ counterpartyNif: null, amount: '1020.00' }),
    ];
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
  });

  it('excluye operaciones de años distintos', () => {
    const rows: LedgerEntryFor180[] = [
      row({ entryDate: '2025-12-31', amount: '1020.00' }), // ejercicio anterior
      row({ entryDate: '2026-02-15', amount: '1020.00' }),
    ];
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.operaciones).toBe(1);
  });

  it('ordena líneas por mayor retención anual', () => {
    const rows: LedgerEntryFor180[] = [
      row({ counterpartyNif: 'A1', amount: '510.00', taxBase: '500.00', vatAmount: '105.00' }), // ret 95
      row({ counterpartyNif: 'B1', amount: '1020.00' }), // ret 190
      row({ counterpartyNif: 'C1', amount: '255.00', taxBase: '250.00', vatAmount: '52.50' }), // ret ~47.5
    ];
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas.map((l) => l.nif)).toEqual(['B1', 'A1', 'C1']);
  });

  it('advierte si no hay alquileres con retención', () => {
    const out = compute180FromLedger({ ejercicio: 2026, ledgerRows: [] });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
    expect(out.result.advertencias.some((a) => a.includes('alquiler'))).toBe(true);
  });
});
