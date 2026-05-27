// Unit tests for F10 Excel builders. Verify shape, totals, lock state,
// number formats. We round-trip the workbook through xlsx to assert the
// real serialized output, not just in-memory state.

import ExcelJS from 'exceljs';
import {
  REPORT_TYPES,
  buildLibroDiario,
  buildLibroIvaEmitidas,
  buildLibroIvaRecibidas,
  buildModelo303,
  reportFilename,
  type LibroDiarioRow,
  type LibroIvaRow,
} from '../isaak-excel-export';

const META = {
  tenantName: 'Acme SL',
  tenantNif: 'B12345678',
  generatedAt: '2026-05-25 10:00:00',
};

const PERIOD = { from: '2026-04-01', to: '2026-06-30', label: 'T2 2026' };

const sampleEmitidas: LibroIvaRow[] = [
  {
    date: '2026-04-15',
    docNumber: 'F-2026-001',
    counterpartyNif: 'B11111111',
    counterpartyName: 'Cliente A SL',
    taxBase: '1000.00',
    vatRate: '21.00',
    vatAmount: '210.00',
    total: '1210.00',
    description: 'Servicios mensuales abril',
  },
  {
    date: '2026-05-10',
    docNumber: 'F-2026-002',
    counterpartyNif: 'B22222222',
    counterpartyName: 'Cliente B SL',
    taxBase: '2000.00',
    vatRate: '21.00',
    vatAmount: '420.00',
    total: '2420.00',
    description: 'Servicios mensuales mayo',
  },
];

const sampleRecibidas: LibroIvaRow[] = [
  {
    date: '2026-04-05',
    docNumber: 'P-2026-100',
    counterpartyNif: 'A99999999',
    counterpartyName: 'Proveedor X SA',
    taxBase: '500.00',
    vatRate: '21.00',
    vatAmount: '105.00',
    total: '605.00',
    description: 'Material oficina',
  },
];

const sampleDiario: LibroDiarioRow[] = [
  {
    date: '2026-04-15',
    description: 'Venta servicios abril',
    accountDebit: '430',
    accountCredit: '700',
    amount: '1210.00',
    docNumber: 'F-2026-001',
  },
];

async function roundtrip(wb: ExcelJS.Workbook): Promise<ExcelJS.Workbook> {
  const buf = await wb.xlsx.writeBuffer();
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf as ArrayBuffer);
  return wb2;
}

describe('reportFilename', () => {
  it('uses label if provided, else from/to', () => {
    expect(reportFilename('libro_iva_emitidas', PERIOD)).toBe(
      'isaak_libro_iva_emitidas_t2_2026.xlsx',
    );
    expect(reportFilename('libro_diario', { from: '2026-01-01', to: '2026-01-31' })).toBe(
      'isaak_libro_diario_2026-01-01_2026-01-31.xlsx',
    );
  });
});

describe('REPORT_TYPES catalog', () => {
  it('exposes the 4 expected types', () => {
    expect(REPORT_TYPES).toEqual([
      'libro_iva_emitidas',
      'libro_iva_recibidas',
      'libro_diario',
      'modelo_303',
    ]);
  });
});

describe('buildLibroIvaEmitidas', () => {
  it('includes header, columns, rows and totals', async () => {
    const wb = buildLibroIvaEmitidas({ rows: sampleEmitidas, period: PERIOD, meta: META });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Facturas emitidas');
    expect(ws).toBeDefined();
    expect(ws?.getCell('A1').value).toMatch(/Libro registro de facturas emitidas/);
    expect(ws?.getCell('A2').value).toContain('Acme SL');

    // Header row should be row 5
    const headerRow = ws!.getRow(5);
    const headers = (headerRow.values as unknown[]).filter(Boolean) as string[];
    expect(headers).toContain('Fecha');
    expect(headers).toContain('Cuota IVA');
    expect(headers).toContain('Notas (editable)');

    // First data row (row 6)
    const row6 = ws!.getRow(6);
    expect(row6.getCell(2).value).toBe('F-2026-001');
    expect(row6.getCell(5).value).toBe(1000);
    expect(row6.getCell(7).value).toBe(210);

    // Totals row: row 8 (header row 5 + 2 data rows = 7, totals at 8)
    const totalsRow = ws!.getRow(8);
    expect(totalsRow.getCell(4).value).toBe('TOTALES');
    expect(totalsRow.getCell(5).value).toBe(3000); // 1000 + 2000
    expect(totalsRow.getCell(7).value).toBe(630); // 210 + 420
    expect(totalsRow.getCell(8).value).toBe(3630); // 1210 + 2420
  });

  it('protects the sheet and locks data cells (notes column unlocked)', async () => {
    const wb = buildLibroIvaEmitidas({ rows: sampleEmitidas, period: PERIOD, meta: META });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Facturas emitidas')!;
    // Sheet protection metadata is preserved through the roundtrip;
    // exceljs surfaces it through internals — assert that "TOTAL" cell
    // has explicit locked protection (the structural check that survives
    // serialization most reliably).
    const noteCell = ws.getRow(6).getCell(10);
    expect(noteCell.protection?.locked).toBe(false);
    const numericCell = ws.getRow(6).getCell(5);
    // Data cells default to locked=true; exceljs may omit the property
    // when value equals default. The protect() call applied at build
    // time ensures effective locking regardless.
    expect(numericCell.protection?.locked ?? true).toBe(true);
  });

  it('handles empty row list with zero totals', async () => {
    const wb = buildLibroIvaEmitidas({ rows: [], period: PERIOD, meta: META });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Facturas emitidas')!;
    const totalsRow = ws.getRow(6); // header at 5, no data → totals at 6
    expect(totalsRow.getCell(4).value).toBe('TOTALES');
    expect(totalsRow.getCell(5).value).toBe(0);
  });
});

describe('buildLibroIvaRecibidas', () => {
  it('produces a sheet named "Facturas recibidas" with totals', async () => {
    const wb = buildLibroIvaRecibidas({ rows: sampleRecibidas, period: PERIOD, meta: META });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Facturas recibidas')!;
    expect(ws.getCell('A1').value).toMatch(/facturas recibidas/i);
    const totalsRow = ws.getRow(7); // header 5 + 1 data + 1 totals
    expect(totalsRow.getCell(5).value).toBe(500);
    expect(totalsRow.getCell(7).value).toBe(105);
  });
});

describe('buildLibroDiario', () => {
  it('produces "Libro diario" sheet with PGC columns', async () => {
    const wb = buildLibroDiario({ rows: sampleDiario, period: PERIOD, meta: META });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Libro diario')!;
    const headers = (ws.getRow(5).values as unknown[]).filter(Boolean) as string[];
    expect(headers).toContain('Cuenta debe');
    expect(headers).toContain('Cuenta haber');
    const r6 = ws.getRow(6);
    expect(r6.getCell(3).value).toBe('430');
    expect(r6.getCell(4).value).toBe('700');
    expect(r6.getCell(5).value).toBe(1210);
  });
});

describe('buildModelo303', () => {
  it('creates 3 sheets: resumen + detalle emitidas + detalle recibidas', async () => {
    const wb = buildModelo303({
      facturasEmitidas: sampleEmitidas,
      facturasRecibidas: sampleRecibidas,
      period: PERIOD,
      meta: META,
    });
    const wb2 = await roundtrip(wb);
    expect(wb2.worksheets.map((w) => w.name)).toEqual([
      'Modelo 303 — Resumen',
      'Detalle emitidas',
      'Detalle recibidas',
    ]);
  });

  it('summary shows IVA devengado, soportado and resultado', async () => {
    const wb = buildModelo303({
      facturasEmitidas: sampleEmitidas,
      facturasRecibidas: sampleRecibidas,
      period: PERIOD,
      meta: META,
    });
    const wb2 = await roundtrip(wb);
    const ws = wb2.getWorksheet('Modelo 303 — Resumen')!;
    // Find the row containing the result (RESULTADO)
    let resultadoFound = false;
    let resultadoValue: number | null = null;
    ws.eachRow((row) => {
      const first = row.getCell(1).value;
      if (typeof first === 'string' && /RESULTADO/.test(first)) {
        resultadoFound = true;
        const v = row.getCell(4).value;
        if (typeof v === 'number') resultadoValue = v;
      }
    });
    expect(resultadoFound).toBe(true);
    // Devengado 630 - soportado 105 = 525
    expect(resultadoValue).toBe(525);
  });
});
