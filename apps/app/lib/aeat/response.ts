import { toCsv, type CsvCell } from '@/lib/export/csv';
import { buildWorkbookBuffer, type XlsxCell } from '@/lib/export/xlsx';
import { NextResponse } from 'next/server';

export type ExportFormat = 'csv' | 'xlsx';

export function parseExportFormat(value: string | null): ExportFormat {
  if (value === 'xlsx') return 'xlsx';
  return 'csv';
}

export function buildExportResponse(args: {
  filenameBase: string;
  format: ExportFormat;
  rows: (CsvCell | XlsxCell)[][];
  sheetName?: string;
}) {
  const { filenameBase, format, rows, sheetName } = args;

  if (format === 'xlsx') {
    const file = buildWorkbookBuffer(rows as XlsxCell[][], sheetName);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
        'Cache-Control': 'no-cache',
      },
    });
  }

  const csv = toCsv(rows as CsvCell[][]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
