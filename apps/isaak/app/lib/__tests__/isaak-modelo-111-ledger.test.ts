import {
  compute111FromLedger,
  type LedgerEntryFor111,
} from '../isaak-modelo-111-ledger';

function row(overrides: Partial<LedgerEntryFor111> = {}): LedgerEntryFor111 {
  return {
    docType: 'invoice_in',
    amount: '1060.00',
    taxBase: '1000.00',
    vatAmount: '210.00',
    entryDate: '2026-02-15',
    description: null,
    ...overrides,
  };
}

describe('compute111FromLedger — retención implícita', () => {
  it('factura profesional 1000 base + 21% IVA - 15% IRPF → retención 150', () => {
    // taxBase=1000, vatAmount=210 → bruto=1210, retención=150 → amount=1060
    const rows: LedgerEntryFor111[] = [
      row({ docType: 'invoice_in', taxBase: '1000.00', vatAmount: '210.00', amount: '1060.00' }),
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.profesionales.perceptores).toBe(1);
    expect(out.result.profesionales.basesRetenciones).toBe(1000);
    expect(out.result.profesionales.importeRetenciones).toBe(150);
    expect(out.result.resultado).toBe(150);
  });

  it('factura SIN retención (amount == taxBase + IVA) → no aparece en 111', () => {
    const rows: LedgerEntryFor111[] = [
      row({ docType: 'invoice_in', taxBase: '1000.00', vatAmount: '210.00', amount: '1210.00' }),
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.profesionales.perceptores).toBe(0);
    expect(out.result.resultado).toBe(0);
  });

  it('agrega múltiples facturas profesionales', () => {
    const rows: LedgerEntryFor111[] = [
      row({ taxBase: '1000.00', vatAmount: '210.00', amount: '1060.00' }), // ret 150
      row({ taxBase: '500.00', vatAmount: '105.00', amount: '530.00' }), //  ret 75
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.profesionales.perceptores).toBe(2);
    expect(out.result.profesionales.basesRetenciones).toBe(1500);
    expect(out.result.profesionales.importeRetenciones).toBe(225);
  });

  it('payroll con bruto/líquido detecta retención IRPF', () => {
    // Nómina: bruto 2000, líquido (neto) 1700 → retención = 300 (sin IVA)
    const rows: LedgerEntryFor111[] = [
      row({
        docType: 'payroll',
        taxBase: '2000.00',
        vatAmount: '0.00',
        amount: '1700.00',
        description: 'Nómina febrero 2026',
      }),
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.trabajadores.perceptores).toBe(1);
    expect(out.result.trabajadores.basesRetenciones).toBe(2000);
    expect(out.result.trabajadores.importeRetenciones).toBe(300);
  });

  it('separa trabajadores y profesionales', () => {
    const rows: LedgerEntryFor111[] = [
      row({ docType: 'payroll', taxBase: '2000.00', vatAmount: '0.00', amount: '1700.00' }),
      row({ docType: 'invoice_in', taxBase: '1000.00', vatAmount: '210.00', amount: '1060.00' }),
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.trabajadores.importeRetenciones).toBe(300);
    expect(out.result.profesionales.importeRetenciones).toBe(150);
    expect(out.result.totalRetenciones).toBe(450);
  });

  it('filtra por trimestre', () => {
    const rows: LedgerEntryFor111[] = [
      row({ entryDate: '2026-02-15', taxBase: '1000.00', amount: '1060.00' }), // 1T
      row({ entryDate: '2026-04-15', taxBase: '500.00', amount: '530.00' }), // 2T
    ];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.profesionales.perceptores).toBe(1);
    expect(out.result.profesionales.importeRetenciones).toBe(150);
  });

  it('advierte si no hay nóminas ni profesionales con retención', () => {
    const rows: LedgerEntryFor111[] = [];
    const out = compute111FromLedger({ ejercicio: 2026, periodo: '1T', ledgerRows: rows });
    if (out.skipped) throw new Error('should not skip');
    expect(out.result.totalRetenciones).toBe(0);
    expect(out.result.advertencias.some((a) => a.toLowerCase().includes('no se han detectado'))).toBe(true);
  });
});
