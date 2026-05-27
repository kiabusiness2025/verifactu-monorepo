import {
  compute349FromLedger,
  type LedgerEntryFor349,
} from '../isaak-modelo-349-ledger';

function row(overrides: Partial<LedgerEntryFor349> = {}): LedgerEntryFor349 {
  return {
    docType: 'invoice_out',
    amount: '1000.00',
    taxBase: '1000.00',
    vatRate: '0.00',
    vatAmount: '0.00',
    entryDate: '2026-02-15',
    counterpartyNif: 'PT123456789',
    counterpartyName: 'Cliente Portugal Lda',
    description: 'Venta de producto X',
    ...overrides,
  };
}

describe('compute349FromLedger — detección intracom', () => {
  it('factura emitida a NIF-IVA UE con IVA 0% → entregas intracom (E)', () => {
    const rows: LedgerEntryFor349[] = [row()];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
    expect(out.result.lineas[0]?.clave).toBe('E');
    expect(out.result.lineas[0]?.nifIva).toBe('PT123456789');
    expect(out.result.lineas[0]?.importe).toBe(1000);
    expect(out.result.totalEntregas).toBe(1000);
  });

  it('factura recibida de NIF-IVA UE → adquisiciones intracom (A)', () => {
    const rows: LedgerEntryFor349[] = [
      row({
        docType: 'invoice_in',
        counterpartyNif: 'DE123456789',
        counterpartyName: 'Proveedor Alemania GmbH',
        description: 'Compra de material',
      }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.clave).toBe('A');
    expect(out.result.totalAdquisiciones).toBe(1000);
  });

  it('servicio emitido a UE → S (servicios)', () => {
    const rows: LedgerEntryFor349[] = [
      row({ description: 'Consultoría estratégica Q1' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.clave).toBe('S');
  });

  it('servicio recibido de UE → I', () => {
    const rows: LedgerEntryFor349[] = [
      row({
        docType: 'invoice_in',
        counterpartyNif: 'IE1234567T',
        counterpartyName: 'AWS Ireland',
        description: 'SaaS subscription Cloud',
      }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas[0]?.clave).toBe('I');
  });

  it('excluye facturas a clientes españoles (no intracom)', () => {
    const rows: LedgerEntryFor349[] = [
      row({ counterpartyNif: 'B12345678', counterpartyName: 'Cliente España SL' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
  });

  it('excluye facturas UE con IVA aplicado (no son intracom puras)', () => {
    const rows: LedgerEntryFor349[] = [
      row({ vatRate: '21.00', vatAmount: '210.00', amount: '1210.00' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
  });

  it('agrega múltiples facturas a mismo NIF/clave en una sola línea', () => {
    const rows: LedgerEntryFor349[] = [
      row({ taxBase: '500.00' }),
      row({ taxBase: '700.00', entryDate: '2026-03-10' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
    expect(out.result.lineas[0]?.importe).toBe(1200);
    expect(out.result.lineas[0]?.operaciones).toBe(2);
  });

  it('separa líneas por clave (E vs S) para mismo NIF', () => {
    const rows: LedgerEntryFor349[] = [
      row({ description: 'Venta producto físico' }),
      row({ description: 'Consultoría estratégica', taxBase: '500.00' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(2);
    expect(out.result.lineas.map((l) => l.clave).sort()).toEqual(['E', 'S']);
  });

  it('filtra por trimestre', () => {
    const rows: LedgerEntryFor349[] = [
      row({ entryDate: '2026-02-15', taxBase: '500.00' }), // 1T
      row({ entryDate: '2026-04-15', taxBase: '700.00' }), // 2T
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.totalEntregas).toBe(500);
  });

  it('advierte si no hay líneas intracom en el periodo', () => {
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: [] });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(0);
    expect(out.result.advertencias.some((a) => a.includes('No se detectaron'))).toBe(true);
  });

  it('reconoce el prefijo XI (Irlanda del Norte post-Brexit)', () => {
    const rows: LedgerEntryFor349[] = [
      row({ counterpartyNif: 'XI123456789', counterpartyName: 'Ulster Manufacturing Ltd' }),
    ];
    const out = compute349FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.lineas).toHaveLength(1);
  });
});
