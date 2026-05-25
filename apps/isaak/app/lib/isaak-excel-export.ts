// F10 — Excel solo lectura (exceljs).
//
// Genera libros y modelos en formato xlsx desde el Isaak Ledger.
//
// Política "read-only por defecto":
//   * sheet.protect(password) bloquea toda la hoja
//   * celdas de datos: cell.protection = { locked: true }  (default)
//   * celda de notas del empresario: locked=false (única editable)
//
// El password de protección es local al fichero (no es secreto): solo
// sirve para que el cliente no edite por accidente las celdas de
// datos. Cualquiera con la contraseña podría desbloquear; la fuente
// de verdad sigue siendo el ledger.

import ExcelJS from 'exceljs';

const SHEET_PASSWORD = 'isaak-readonly';

export type LibroIvaRow = {
  date: string; // 'YYYY-MM-DD'
  docNumber: string | null;
  counterpartyNif: string | null;
  counterpartyName: string | null;
  taxBase: string; // decimal as string
  vatRate: string; // '21.00' | '10.00' | '0.00' etc.
  vatAmount: string;
  total: string;
  description: string;
};

export type LibroDiarioRow = {
  date: string;
  description: string;
  accountDebit: string | null;
  accountCredit: string | null;
  amount: string;
  docNumber: string | null;
};

export type ReportPeriod = {
  from: string; // 'YYYY-MM-DD'
  to: string;
  label?: string; // 'T2 2026' | 'Mayo 2026' | etc.
};

export type ReportMeta = {
  tenantName: string;
  tenantNif: string;
  generatedAt: string; // ISO timestamp
};

// ─── Helpers compartidos ────────────────────────────────────────────────

function applyHeader(
  worksheet: ExcelJS.Worksheet,
  title: string,
  period: ReportPeriod,
  meta: ReportMeta
): void {
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF2361D8' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.protection = { locked: true };

  worksheet.mergeCells('A2:G2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `${meta.tenantName} · NIF ${meta.tenantNif} · Periodo ${period.label ?? `${period.from} → ${period.to}`}`;
  subCell.font = { size: 11, color: { argb: 'FF555555' } };
  subCell.protection = { locked: true };

  worksheet.mergeCells('A3:G3');
  const genCell = worksheet.getCell('A3');
  genCell.value = `Generado por Isaak el ${meta.generatedAt}. Documento informativo de solo lectura.`;
  genCell.font = { size: 10, italic: true, color: { argb: 'FF888888' } };
  genCell.protection = { locked: true };

  worksheet.getRow(4).height = 5; // separador
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2361D8' } };
    cell.protection = { locked: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1A4FB3' } },
      bottom: { style: 'thin', color: { argb: 'FF1A4FB3' } },
    };
  });
}

function setColumnWidths(
  worksheet: ExcelJS.Worksheet,
  widths: ReadonlyArray<number>
): void {
  for (let i = 0; i < widths.length; i++) {
    worksheet.getColumn(i + 1).width = widths[i]!;
  }
}

function writeHeaderRow(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  headers: ReadonlyArray<string>
): ExcelJS.Row {
  const row = worksheet.getRow(rowNumber);
  for (let i = 0; i < headers.length; i++) {
    row.getCell(i + 1).value = headers[i]!;
  }
  row.commit();
  styleHeaderRow(row);
  return row;
}

function applyReadOnlyProtection(worksheet: ExcelJS.Worksheet): void {
  // Activa la protección de hoja. Las celdas con locked=true quedan
  // bloqueadas; la columna "notas" (última, marcada explícitamente
  // con locked=false en cada fila de datos) sigue siendo editable.
  worksheet.protect(SHEET_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: true,
  });
}

function summarizeDecimal(values: ReadonlyArray<string>): number {
  let s = 0;
  for (const v of values) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) s += n;
  }
  return s;
}

// ─── Libro IVA Emitidas ─────────────────────────────────────────────────

export function buildLibroIvaEmitidas(args: {
  rows: ReadonlyArray<LibroIvaRow>;
  period: ReportPeriod;
  meta: ReportMeta;
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Isaak';
  wb.created = new Date();

  const ws = wb.addWorksheet('Facturas emitidas', { views: [{ state: 'frozen', ySplit: 5 }] });

  applyHeader(
    ws,
    'Libro registro de facturas emitidas (SII-compatible)',
    args.period,
    args.meta
  );

  setColumnWidths(ws, [12, 16, 14, 28, 14, 10, 12, 14, 32, 28]);
  writeHeaderRow(ws, 5, [
    'Fecha',
    'Nº factura',
    'NIF cliente',
    'Nombre cliente',
    'Base imponible',
    'Tipo IVA',
    'Cuota IVA',
    'Total',
    'Descripción',
    'Notas (editable)',
  ]);

  let r = 6;
  for (const row of args.rows) {
    const dataRow = ws.getRow(r++);
    dataRow.values = [
      row.date,
      row.docNumber ?? '',
      row.counterpartyNif ?? '',
      row.counterpartyName ?? '',
      Number.parseFloat(row.taxBase),
      Number.parseFloat(row.vatRate),
      Number.parseFloat(row.vatAmount),
      Number.parseFloat(row.total),
      row.description,
      '',
    ];
    dataRow.eachCell((cell, col) => {
      cell.protection = { locked: col !== 10 };
      if (col === 5 || col === 7 || col === 8) {
        cell.numFmt = '#,##0.00 €';
      }
      if (col === 6) cell.numFmt = '0.00%';
    });
  }

  // Totales
  const totalRow = ws.getRow(r);
  totalRow.values = [
    '',
    '',
    '',
    'TOTALES',
    summarizeDecimal(args.rows.map((x) => x.taxBase)),
    '',
    summarizeDecimal(args.rows.map((x) => x.vatAmount)),
    summarizeDecimal(args.rows.map((x) => x.total)),
    '',
    '',
  ];
  totalRow.font = { bold: true };
  totalRow.eachCell((cell, col) => {
    cell.protection = { locked: true };
    if (col === 5 || col === 7 || col === 8) cell.numFmt = '#,##0.00 €';
    cell.border = { top: { style: 'thin', color: { argb: 'FF1A4FB3' } } };
  });

  applyReadOnlyProtection(ws);
  return wb;
}

// ─── Libro IVA Recibidas ────────────────────────────────────────────────

export function buildLibroIvaRecibidas(args: {
  rows: ReadonlyArray<LibroIvaRow>;
  period: ReportPeriod;
  meta: ReportMeta;
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Isaak';
  wb.created = new Date();

  const ws = wb.addWorksheet('Facturas recibidas', { views: [{ state: 'frozen', ySplit: 5 }] });

  applyHeader(
    ws,
    'Libro registro de facturas recibidas (SII-compatible)',
    args.period,
    args.meta
  );

  setColumnWidths(ws, [12, 16, 14, 28, 14, 10, 18, 14, 32, 28]);
  writeHeaderRow(ws, 5, [
    'Fecha',
    'Nº factura',
    'NIF proveedor',
    'Nombre proveedor',
    'Base imponible',
    'Tipo IVA',
    'Cuota IVA deducible',
    'Total',
    'Descripción',
    'Notas (editable)',
  ]);

  let r = 6;
  for (const row of args.rows) {
    const dataRow = ws.getRow(r++);
    dataRow.values = [
      row.date,
      row.docNumber ?? '',
      row.counterpartyNif ?? '',
      row.counterpartyName ?? '',
      Number.parseFloat(row.taxBase),
      Number.parseFloat(row.vatRate),
      Number.parseFloat(row.vatAmount),
      Number.parseFloat(row.total),
      row.description,
      '',
    ];
    dataRow.eachCell((cell, col) => {
      cell.protection = { locked: col !== 10 };
      if (col === 5 || col === 7 || col === 8) cell.numFmt = '#,##0.00 €';
      if (col === 6) cell.numFmt = '0.00%';
    });
  }

  const totalRow = ws.getRow(r);
  totalRow.values = [
    '',
    '',
    '',
    'TOTALES',
    summarizeDecimal(args.rows.map((x) => x.taxBase)),
    '',
    summarizeDecimal(args.rows.map((x) => x.vatAmount)),
    summarizeDecimal(args.rows.map((x) => x.total)),
    '',
    '',
  ];
  totalRow.font = { bold: true };
  totalRow.eachCell((cell, col) => {
    cell.protection = { locked: true };
    if (col === 5 || col === 7 || col === 8) cell.numFmt = '#,##0.00 €';
    cell.border = { top: { style: 'thin', color: { argb: 'FF1A4FB3' } } };
  });

  applyReadOnlyProtection(ws);
  return wb;
}

// ─── Libro diario (PGC 2007) ────────────────────────────────────────────

export function buildLibroDiario(args: {
  rows: ReadonlyArray<LibroDiarioRow>;
  period: ReportPeriod;
  meta: ReportMeta;
}): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Isaak';
  wb.created = new Date();

  const ws = wb.addWorksheet('Libro diario', { views: [{ state: 'frozen', ySplit: 5 }] });

  applyHeader(ws, 'Libro diario contable (PGC 2007)', args.period, args.meta);

  setColumnWidths(ws, [12, 16, 14, 14, 14, 40, 28]);
  writeHeaderRow(ws, 5, [
    'Fecha',
    'Documento',
    'Cuenta debe',
    'Cuenta haber',
    'Importe',
    'Concepto',
    'Notas (editable)',
  ]);

  let r = 6;
  for (const row of args.rows) {
    const dataRow = ws.getRow(r++);
    dataRow.values = [
      row.date,
      row.docNumber ?? '',
      row.accountDebit ?? '',
      row.accountCredit ?? '',
      Number.parseFloat(row.amount),
      row.description,
      '',
    ];
    dataRow.eachCell((cell, col) => {
      cell.protection = { locked: col !== 7 };
      if (col === 5) cell.numFmt = '#,##0.00 €';
    });
  }

  const totalRow = ws.getRow(r);
  totalRow.values = ['', '', '', 'TOTAL', summarizeDecimal(args.rows.map((x) => x.amount)), '', ''];
  totalRow.font = { bold: true };
  totalRow.eachCell((cell, col) => {
    cell.protection = { locked: true };
    if (col === 5) cell.numFmt = '#,##0.00 €';
    cell.border = { top: { style: 'thin', color: { argb: 'FF1A4FB3' } } };
  });

  applyReadOnlyProtection(ws);
  return wb;
}

// ─── Modelo 303 (resumen IVA trimestral) ────────────────────────────────

export type Modelo303Input = {
  facturasEmitidas: ReadonlyArray<LibroIvaRow>;
  facturasRecibidas: ReadonlyArray<LibroIvaRow>;
  period: ReportPeriod;
  meta: ReportMeta;
};

export function buildModelo303(input: Modelo303Input): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Isaak';
  wb.created = new Date();

  // Hoja 1: resumen
  const ws = wb.addWorksheet('Modelo 303 — Resumen');
  applyHeader(ws, 'Modelo 303 — Autoliquidación IVA (resumen)', input.period, input.meta);

  // Cálculos por tipo de IVA
  const rates = [4, 5, 10, 21];
  ws.getRow(5).values = ['Concepto', 'Base', 'Tipo', 'Cuota'];
  styleHeaderRow(ws.getRow(5));
  let r = 6;

  // IVA devengado (emitidas)
  ws.getCell(`A${r++}`).value = '— IVA devengado (facturas emitidas)';
  ws.getCell(`A${r - 1}`).font = { bold: true };
  for (const rate of rates) {
    const filtered = input.facturasEmitidas.filter(
      (f) => Math.abs(Number.parseFloat(f.vatRate) - rate) < 0.01
    );
    if (filtered.length === 0) continue;
    const base = summarizeDecimal(filtered.map((f) => f.taxBase));
    const cuota = summarizeDecimal(filtered.map((f) => f.vatAmount));
    const row = ws.getRow(r++);
    row.values = [`Operaciones interiores al ${rate}%`, base, rate / 100, cuota];
    row.getCell(2).numFmt = '#,##0.00 €';
    row.getCell(3).numFmt = '0.00%';
    row.getCell(4).numFmt = '#,##0.00 €';
    row.eachCell((cell) => (cell.protection = { locked: true }));
  }

  // IVA soportado (recibidas)
  r++;
  ws.getCell(`A${r++}`).value = '— IVA soportado deducible (facturas recibidas)';
  ws.getCell(`A${r - 1}`).font = { bold: true };
  for (const rate of rates) {
    const filtered = input.facturasRecibidas.filter(
      (f) => Math.abs(Number.parseFloat(f.vatRate) - rate) < 0.01
    );
    if (filtered.length === 0) continue;
    const base = summarizeDecimal(filtered.map((f) => f.taxBase));
    const cuota = summarizeDecimal(filtered.map((f) => f.vatAmount));
    const row = ws.getRow(r++);
    row.values = [`Compras al ${rate}%`, base, rate / 100, cuota];
    row.getCell(2).numFmt = '#,##0.00 €';
    row.getCell(3).numFmt = '0.00%';
    row.getCell(4).numFmt = '#,##0.00 €';
    row.eachCell((cell) => (cell.protection = { locked: true }));
  }

  // Resultado
  const totalDevengado = summarizeDecimal(input.facturasEmitidas.map((f) => f.vatAmount));
  const totalSoportado = summarizeDecimal(input.facturasRecibidas.map((f) => f.vatAmount));
  const resultado = totalDevengado - totalSoportado;
  r++;
  const resRow = ws.getRow(r++);
  resRow.values = ['RESULTADO (Devengado − Soportado)', '', '', resultado];
  resRow.font = { bold: true, size: 13 };
  resRow.getCell(4).numFmt = '#,##0.00 €';
  resRow.getCell(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: resultado >= 0 ? 'FFFEE2E2' : 'FFDCFCE7' },
  };
  resRow.eachCell((cell) => (cell.protection = { locked: true }));

  // Hoja 2 + 3: detalle facturas (lectura)
  function buildDetailSheet(
    name: string,
    rows: ReadonlyArray<LibroIvaRow>,
    counterpartyHeader: string
  ): void {
    const wsDet = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    setColumnWidths(wsDet, [12, 14, 12, 28, 12, 8, 12, 12]);
    writeHeaderRow(wsDet, 1, ['Fecha', 'Nº', 'NIF', counterpartyHeader, 'Base', 'Tipo', 'Cuota', 'Total']);
    let row = 2;
    for (const r of rows) {
      const dataRow = wsDet.getRow(row++);
      dataRow.values = [
        r.date,
        r.docNumber ?? '',
        r.counterpartyNif ?? '',
        r.counterpartyName ?? '',
        Number.parseFloat(r.taxBase),
        Number.parseFloat(r.vatRate) / 100,
        Number.parseFloat(r.vatAmount),
        Number.parseFloat(r.total),
      ];
      dataRow.getCell(5).numFmt = '#,##0.00 €';
      dataRow.getCell(6).numFmt = '0.00%';
      dataRow.getCell(7).numFmt = '#,##0.00 €';
      dataRow.getCell(8).numFmt = '#,##0.00 €';
      dataRow.eachCell((c) => (c.protection = { locked: true }));
    }
    applyReadOnlyProtection(wsDet);
  }

  buildDetailSheet('Detalle emitidas', input.facturasEmitidas, 'Cliente');
  buildDetailSheet('Detalle recibidas', input.facturasRecibidas, 'Proveedor');

  applyReadOnlyProtection(ws);
  return wb;
}

export type ReportType =
  | 'libro_iva_emitidas'
  | 'libro_iva_recibidas'
  | 'libro_diario'
  | 'modelo_303';

export const REPORT_TYPES: ReadonlyArray<ReportType> = [
  'libro_iva_emitidas',
  'libro_iva_recibidas',
  'libro_diario',
  'modelo_303',
];

export function reportFilename(reportType: ReportType, period: ReportPeriod): string {
  const slug = period.label
    ? period.label.replace(/\s+/g, '_').toLowerCase()
    : `${period.from}_${period.to}`;
  return `isaak_${reportType}_${slug}.xlsx`;
}
