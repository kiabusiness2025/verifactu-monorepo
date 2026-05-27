import {
  compute190FromLedger,
  type LedgerEntryFor190,
} from '../isaak-modelo-190-ledger';

function row(overrides: Partial<LedgerEntryFor190> = {}): LedgerEntryFor190 {
  return {
    docType: 'invoice_in',
    amount: '1060.00',
    taxBase: '1000.00',
    vatAmount: '210.00',
    entryDate: '2026-02-15',
    description: 'Honorarios profesional Q1',
    counterpartyNif: '12345678A',
    counterpartyName: 'Juan Profesional',
    ...overrides,
  };
}

describe('compute190FromLedger — rollup anual', () => {
  it('clasifica payroll como clave A (trabajadores)', () => {
    const rows: LedgerEntryFor190[] = [
      row({
        docType: 'payroll',
        taxBase: '24000.00',
        vatAmount: '0.00',
        amount: '20400.00', // retención 3600
        description: 'Nómina anual empleado',
        counterpartyNif: '11111111X',
        counterpartyName: 'Empleado Uno',
      }),
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
    expect(out.result.lineas[0]?.clave).toBe('A');
    expect(out.result.lineas[0]?.retencionAnual).toBe(3600);
    expect(out.result.perceptoresTrabajadores).toBe(1);
    expect(out.result.perceptoresProfesionales).toBe(0);
  });

  it('clasifica invoice_in con retención como clave G (profesionales)', () => {
    const rows: LedgerEntryFor190[] = [row()];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.clave).toBe('G');
    expect(out.result.perceptoresProfesionales).toBe(1);
  });

  it('agrega 4 trimestres del mismo profesional', () => {
    const rows: LedgerEntryFor190[] = [
      row({ entryDate: '2026-02-15' }),
      row({ entryDate: '2026-05-15' }),
      row({ entryDate: '2026-08-15' }),
      row({ entryDate: '2026-11-15' }),
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
    expect(out.result.lineas[0]?.operaciones).toBe(4);
    expect(out.result.lineas[0]?.retencionAnual).toBe(600); // 150*4
  });

  it('separa trabajadores y profesionales en líneas distintas (mismo NIF)', () => {
    // Caso hipotético: un perceptor con dos roles
    const rows: LedgerEntryFor190[] = [
      row({
        docType: 'payroll',
        taxBase: '5000.00',
        vatAmount: '0.00',
        amount: '4400.00', // ret 600
        counterpartyNif: '12345678Z',
      }),
      row({
        docType: 'invoice_in',
        taxBase: '1000.00',
        vatAmount: '210.00',
        amount: '1060.00', // ret 150
        counterpartyNif: '12345678Z',
      }),
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(2);
    expect(out.result.lineas.map((l) => l.clave).sort()).toEqual(['A', 'G']);
  });

  it('ordena: primero A (trabajadores), luego G; dentro de cada clave por mayor retención', () => {
    const rows: LedgerEntryFor190[] = [
      row({ counterpartyNif: 'G1', amount: '1060.00' }), // G, ret 150
      row({
        docType: 'payroll',
        counterpartyNif: 'A1',
        taxBase: '5000.00',
        vatAmount: '0.00',
        amount: '4400.00',
      }), // A, ret 600
      row({ counterpartyNif: 'G2', taxBase: '2000.00', vatAmount: '420.00', amount: '2120.00' }), // G, ret 300
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas.map((l) => l.clave)).toEqual(['A', 'G', 'G']);
    expect(out.result.lineas[1]?.nif).toBe('G2'); // mayor retención dentro de G
    expect(out.result.lineas[2]?.nif).toBe('G1');
  });

  it('excluye operaciones sin retención', () => {
    const rows: LedgerEntryFor190[] = [
      row({ amount: '1210.00' }), // sin retención
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
  });

  it('excluye operaciones sin NIF', () => {
    const rows: LedgerEntryFor190[] = [row({ counterpartyNif: null })];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
  });

  it('excluye operaciones de años distintos', () => {
    const rows: LedgerEntryFor190[] = [
      row({ entryDate: '2025-12-31' }),
      row({ entryDate: '2026-02-15' }),
    ];
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.operaciones).toBe(1);
  });

  it('advierte si no hay perceptores con retención', () => {
    const out = compute190FromLedger({ ejercicio: 2026, ledgerRows: [] });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
    expect(out.result.advertencias.some((a) => a.includes('No se detectaron'))).toBe(true);
  });
});
