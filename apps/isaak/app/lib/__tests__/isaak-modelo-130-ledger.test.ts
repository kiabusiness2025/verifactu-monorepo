import {
  accumulatedRangeISO,
  compute130FromLedger,
  type LedgerEntryFor130,
} from '../isaak-modelo-130-ledger';
import type { TaxpayerProfileSnapshot } from '../inspector-aeat';

describe('accumulatedRangeISO', () => {
  it('1T → 1 enero a 31 marzo del mismo año', () => {
    expect(accumulatedRangeISO(2026, '1T')).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });
  it('2T → 1 enero a 30 junio (acumulado)', () => {
    expect(accumulatedRangeISO(2026, '2T')).toEqual({
      from: '2026-01-01',
      to: '2026-06-30',
    });
  });
  it('3T → 1 enero a 30 septiembre (acumulado)', () => {
    expect(accumulatedRangeISO(2026, '3T')).toEqual({
      from: '2026-01-01',
      to: '2026-09-30',
    });
  });
  it('4T → 1 enero a 31 diciembre (todo el año)', () => {
    expect(accumulatedRangeISO(2026, '4T')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
});

function row(overrides: Partial<LedgerEntryFor130> = {}): LedgerEntryFor130 {
  return {
    docType: 'invoice_out',
    amount: '1210.00',
    taxBase: '1000.00',
    vatAmount: '210.00',
    entryDate: '2026-02-15',
    description: 'Factura test',
    ...overrides,
  };
}

const autonomoProfile: TaxpayerProfileSnapshot = {
  taxpayerType: 'autonomo',
  territory: 'comun',
  vatRegime: 'general',
};

describe('compute130FromLedger — happy path', () => {
  it('1T: ingresos 1000, gastos 400, cuota = (1000-400)*20% = 120', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '1000.00', amount: '1210.00' }),
      row({ docType: 'invoice_in', taxBase: '400.00', amount: '484.00' }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    expect(out.skipped).toBe(false);
    if (out.skipped) return;
    expect(out.result.ingresosAcumulados).toBe(1000);
    expect(out.result.gastosAcumulados).toBe(400);
    expect(out.result.rendimientoNeto).toBe(600);
    expect(out.result.cuotaPrevia).toBe(120);
    expect(out.result.resultado).toBe(120);
  });

  it('aplica retenciones acumuladas (resta del resultado)', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '5000.00', amount: '6050.00' }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: rows,
      profile: autonomoProfile,
      retencionesAcumuladas: 750, // 15% sobre 5000
    });
    if (out.skipped) throw new Error('should not skip');
    // cuotaPrevia = 5000 * 0.2 = 1000; resultado = 1000 - 750 = 250
    expect(out.result.cuotaPrevia).toBe(1000);
    expect(out.result.retencionesAcumuladas).toBe(750);
    expect(out.result.resultado).toBe(250);
  });

  it('aplica pagos fraccionados previos (resta del resultado)', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '5000.00', amount: '6050.00' }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: rows,
      profile: autonomoProfile,
      ingresosACuenta: 200,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.resultado).toBe(800); // 1000 - 200
  });

  it('rendimiento neto negativo → resultado 0 con advertencia', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_in', taxBase: '5000.00', amount: '6050.00' }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.rendimientoNeto).toBe(-5000);
    expect(out.result.cuotaPrevia).toBe(0);
    expect(out.result.resultado).toBe(0);
    expect(out.result.advertencias.some((a) => a.includes('Rendimiento neto'))).toBe(true);
  });

  it('expense (sin factura) usa amount (no taxBase)', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '1000.00', amount: '1210.00' }),
      row({ docType: 'expense', taxBase: null, amount: '300.00', vatAmount: null }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.gastosAcumulados).toBe(300);
    expect(out.result.rendimientoNeto).toBe(700);
  });

  it('ingreso usa taxBase; si null, fallback a amount - vatAmount', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: null, amount: '1210.00', vatAmount: '210.00' }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.ingresosAcumulados).toBe(1000);
  });

  it('rango acumulado: 2T incluye facturas de enero a junio', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '500.00', entryDate: '2026-01-15' }),
      row({ docType: 'invoice_out', taxBase: '500.00', entryDate: '2026-05-15' }),
      row({ docType: 'invoice_out', taxBase: '999.00', entryDate: '2026-07-15' }), // fuera de 2T
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.ingresosAcumulados).toBe(1000); // 500 + 500
  });

  it('detecta automáticamente pagos previos del 130 desde tax_payment', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '5000.00', entryDate: '2026-05-15' }),
      row({
        docType: 'tax_payment',
        taxBase: null,
        amount: '100.00',
        entryDate: '2026-04-15',
        description: 'Pago modelo 130 1T 2026',
      }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: rows,
      profile: autonomoProfile,
    });
    if (out.skipped) throw new Error('should not skip');
    // cuotaPrevia = 5000 * 0.2 = 1000; resultado = 1000 - 100 (auto) = 900
    expect(out.result.ingresosACuenta).toBe(100);
    expect(out.result.resultado).toBe(900);
    expect(out.result.advertencias.some((a) => a.includes('automáticamente'))).toBe(true);
  });

  it('ingresosACuenta=0 explícito tiene prioridad sobre auto-detección', () => {
    const rows: LedgerEntryFor130[] = [
      row({ docType: 'invoice_out', taxBase: '5000.00', entryDate: '2026-05-15' }),
      row({
        docType: 'tax_payment',
        taxBase: null,
        amount: '100.00',
        entryDate: '2026-04-15',
        description: 'Pago modelo 130 1T',
      }),
    ];
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '2T',
      ledgerRows: rows,
      profile: autonomoProfile,
      ingresosACuenta: 0,
    });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.ingresosACuenta).toBe(0);
    expect(out.result.resultado).toBe(1000);
  });
});

describe('compute130FromLedger — régimen', () => {
  it('sociedad limitada → skipped (modelo 202, no 130)', () => {
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: [row()],
      profile: { taxpayerType: 'sl', territory: 'comun', vatRegime: 'general' },
    });
    expect(out.skipped).toBe(true);
    if (!out.skipped) return;
    expect(out.reason).toBe('no_aplica_no_autonomo');
  });

  it('sociedad anónima → skipped', () => {
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: [row()],
      profile: { taxpayerType: 'sa', territory: 'comun', vatRegime: 'general' },
    });
    expect(out.skipped).toBe(true);
  });

  it('comunidad de bienes → SÍ aplica (autónomo asimilado)', () => {
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: [row()],
      profile: { taxpayerType: 'comunidad_bienes', territory: 'comun', vatRegime: 'general' },
    });
    expect(out.skipped).toBe(false);
  });

  it('sin perfil fiscal: no skipped, pero añade advertencia', () => {
    const out = compute130FromLedger({
      ejercicio: 2026,
      periodo: '1T',
      ledgerRows: [row()],
    });
    expect(out.skipped).toBe(false);
    if (out.skipped) return;
    expect(
      out.result.advertencias.some((a) => a.includes('tipo de contribuyente')),
    ).toBe(true);
  });
});
