import {
  compute303FromLedger,
  quarterRangeISO,
  type LedgerEntryFor303,
} from '../isaak-modelo-303-ledger';

describe('quarterRangeISO', () => {
  it('Q1 → enero a marzo', () => {
    expect(quarterRangeISO(2026, '1T')).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });
  it('Q2 → abril a junio', () => {
    expect(quarterRangeISO(2026, '2T')).toEqual({ from: '2026-04-01', to: '2026-06-30' });
  });
  it('Q3 → julio a septiembre', () => {
    expect(quarterRangeISO(2026, '3T')).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });
  it('Q4 → octubre a diciembre', () => {
    expect(quarterRangeISO(2026, '4T')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
  });
  it('Otros años se respetan', () => {
    expect(quarterRangeISO(2025, '1T').from).toBe('2025-01-01');
  });
});

function row(overrides: Partial<LedgerEntryFor303> = {}): LedgerEntryFor303 {
  return {
    docType: 'invoice_out',
    amount: '1210.00',
    taxBase: '1000.00',
    vatRate: '21.00',
    vatAmount: '210.00',
    entryDate: '2026-04-15',
    ...overrides,
  };
}

describe('compute303FromLedger — happy path', () => {
  it('agrega ventas y compras del periodo y calcula resultado', () => {
    const rows: LedgerEntryFor303[] = [
      // Venta 21% en T2
      row({ docType: 'invoice_out', taxBase: '1000.00', vatRate: '21.00', vatAmount: '210.00', entryDate: '2026-04-15' }),
      // Venta 10% en T2
      row({ docType: 'invoice_out', taxBase: '500.00', vatRate: '10.00', vatAmount: '50.00', entryDate: '2026-05-10' }),
      // Compra 21% en T2
      row({ docType: 'invoice_in', taxBase: '200.00', vatRate: '21.00', vatAmount: '42.00', entryDate: '2026-04-20' }),
      // Compra 10% en T2 (expense)
      row({ docType: 'expense', taxBase: '100.00', vatRate: '10.00', vatAmount: '10.00', entryDate: '2026-06-01' }),
    ];
    const out = compute303FromLedger({ ejercicio: 2026, periodo: '2T', ledgerRows: rows });
    expect(out.skipped).toBe(false);
    if (out.skipped) return;
    expect(out.result.totalDevengado).toBe(260);
    expect(out.result.totalSoportado).toBe(52);
    expect(out.result.resultado).toBe(208);
    expect(out.result.repercutido).toHaveLength(2);
    expect(out.result.soportado).toHaveLength(2);
    expect(out.result.facturas).toBe(2);
    expect(out.result.compras).toBe(2);
  });

  it('descarta filas fuera del trimestre', () => {
    const rows: LedgerEntryFor303[] = [
      row({ entryDate: '2026-03-31' }), // fuera de T2
      row({ entryDate: '2026-04-01' }), // dentro
      row({ entryDate: '2026-06-30' }), // dentro
      row({ entryDate: '2026-07-01' }), // fuera de T2
    ];
    const out = compute303FromLedger({ ejercicio: 2026, periodo: '2T', ledgerRows: rows });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.facturas).toBe(2);
  });

  it('agrupa por tipo de IVA correctamente con redondeo', () => {
    const rows: LedgerEntryFor303[] = [
      row({ docType: 'invoice_out', taxBase: '100', vatRate: '21', vatAmount: '21', entryDate: '2026-04-01' }),
      row({ docType: 'invoice_out', taxBase: '200', vatRate: '21.00', vatAmount: '42', entryDate: '2026-04-15' }),
      row({ docType: 'invoice_out', taxBase: '50', vatRate: '10', vatAmount: '5', entryDate: '2026-04-20' }),
    ];
    const out = compute303FromLedger({ ejercicio: 2026, periodo: '2T', ledgerRows: rows });
    if (out.skipped) throw new Error('expected not skipped');
    const tramo21 = out.result.repercutido.find((t) => t.tipo === 21);
    const tramo10 = out.result.repercutido.find((t) => t.tipo === 10);
    expect(tramo21?.base).toBe(300);
    expect(tramo21?.cuota).toBe(63);
    expect(tramo10?.base).toBe(50);
    expect(tramo10?.cuota).toBe(5);
  });

  it('advertencia si resultado < 0 (a devolver/compensar)', () => {
    const rows: LedgerEntryFor303[] = [
      row({ docType: 'invoice_out', taxBase: '100', vatRate: '21', vatAmount: '21', entryDate: '2026-04-01' }),
      row({ docType: 'invoice_in', taxBase: '500', vatRate: '21', vatAmount: '105', entryDate: '2026-04-10' }),
    ];
    const out = compute303FromLedger({ ejercicio: 2026, periodo: '2T', ledgerRows: rows });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.resultado).toBe(-84);
    expect(out.result.advertencias.some((a) => /negativo|compensar|devolver/i.test(a))).toBe(true);
  });

  it('advertencia si no hay facturas emitidas', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [],
    });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.facturas).toBe(0);
    expect(out.result.advertencias.some((a) => /No se encontraron facturas/i.test(a))).toBe(true);
  });
});

describe('compute303FromLedger — régimenes que no presentan 303', () => {
  it('régimen recargo_equivalencia devuelve skipped', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [row()],
      profile: { vatRegime: 'recargo_equivalencia' },
    });
    expect(out.skipped).toBe(true);
    if (out.skipped) {
      expect(out.reason).toBe('régimen_recargo_equivalencia');
    }
  });

  it('régimen exento devuelve skipped', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [row()],
      profile: { vatRegime: 'exento' },
    });
    expect(out.skipped).toBe(true);
  });
});

describe('compute303FromLedger — advertencias por régimen especial', () => {
  it('criterio de caja añade advertencia', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [row()],
      profile: { vatRegime: 'criterio_caja' },
    });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.advertencias.some((a) => /criterio de caja/i.test(a))).toBe(true);
  });

  it('prorrata añade advertencia', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [row()],
      profile: { vatRegime: 'prorrata' },
    });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.advertencias.some((a) => /prorrata/i.test(a))).toBe(true);
  });
});

describe('compute303FromLedger — sin perfil (default régimen general)', () => {
  it('aplica reglas estándar sin advertencias de régimen', () => {
    const out = compute303FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: [row()],
    });
    if (out.skipped) throw new Error('expected not skipped');
    expect(out.result.advertencias.some((a) => /prorrata|criterio de caja/i.test(a))).toBe(false);
  });
});
