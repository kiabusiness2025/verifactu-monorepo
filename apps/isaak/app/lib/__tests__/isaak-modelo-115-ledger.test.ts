import {
  compute115FromLedger,
  type LedgerEntryFor115,
} from '../isaak-modelo-115-ledger';

function row(overrides: Partial<LedgerEntryFor115> = {}): LedgerEntryFor115 {
  return {
    docType: 'invoice_in',
    amount: '948.50', // 1000 + 210 IVA - 261.50 ret 19%/(1+IVA factor)... actually: bruto 1210, ret 19% sobre base = 190, amount = 1210-190-(IRPF) - wait, 19% sobre 1000 = 190; 1210 - 190 = 1020. Let me use cleaner numbers.
    taxBase: '1000.00',
    vatAmount: '210.00',
    entryDate: '2026-02-15',
    description: 'Alquiler oficina febrero 2026',
    accountDebit: '621',
    counterpartyNif: 'B12345678',
    counterpartyName: 'Arrendador SL',
    ...overrides,
  };
}

describe('compute115FromLedger — detección de alquileres con retención', () => {
  it('factura alquiler con cuenta 621 → detecta retención', () => {
    // bruto 1210, amount 1020 → retención 190 (= 19% sobre base 1000)
    const rows: LedgerEntryFor115[] = [
      row({ taxBase: '1000.00', vatAmount: '210.00', amount: '1020.00' }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(1);
    expect(out.result.basesRetenciones).toBe(1000);
    expect(out.result.importeRetenciones).toBe(190);
    expect(out.result.resultado).toBe(190);
  });

  it('detecta alquiler por descripción aunque no tenga cuenta 621', () => {
    const rows: LedgerEntryFor115[] = [
      row({
        accountDebit: null,
        description: 'Arrendamiento local comercial Q1',
        amount: '1020.00',
      }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(1);
  });

  it('ignora facturas sin retención', () => {
    const rows: LedgerEntryFor115[] = [
      row({ amount: '1210.00' }), // amount = base + iva, sin retención
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(0);
    expect(out.result.importeRetenciones).toBe(0);
  });

  it('ignora gastos sin relación con alquiler', () => {
    const rows: LedgerEntryFor115[] = [
      row({
        description: 'Compra material oficina',
        accountDebit: '600',
        amount: '1020.00',
      }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(0);
  });

  it('agrupa 3 mensualidades del mismo arrendador como 1 perceptor', () => {
    const rows: LedgerEntryFor115[] = [
      row({ entryDate: '2026-01-15', amount: '1020.00' }),
      row({ entryDate: '2026-02-15', amount: '1020.00' }),
      row({ entryDate: '2026-03-15', amount: '1020.00' }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(1);
    expect(out.result.basesRetenciones).toBe(3000);
    expect(out.result.importeRetenciones).toBe(570);
  });

  it('separa 2 arrendadores distintos', () => {
    const rows: LedgerEntryFor115[] = [
      row({ counterpartyNif: 'B11111111', amount: '1020.00' }),
      row({ counterpartyNif: 'B22222222', amount: '510.00', taxBase: '500.00', vatAmount: '105.00' }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(2);
  });

  it('filtra por trimestre', () => {
    const rows: LedgerEntryFor115[] = [
      row({ entryDate: '2026-02-15', amount: '1020.00' }), // 1T
      row({ entryDate: '2026-04-15', amount: '1020.00' }), // 2T
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.importeRetenciones).toBe(190);
  });

  it('advierte si no hay alquileres con retención', () => {
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: [] });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.resultado).toBe(0);
    expect(out.result.advertencias.some((a) => a.includes('alquiler'))).toBe(true);
  });

  it('advierte si hay alquiler sin NIF arrendador', () => {
    const rows: LedgerEntryFor115[] = [
      row({ counterpartyNif: null, amount: '1020.00' }),
    ];
    const out = compute115FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.arrendadores).toBe(0);
    expect(out.result.advertencias.some((a) => a.toLowerCase().includes('nif'))).toBe(true);
  });
});
