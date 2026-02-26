import { getPurchasesBookRows } from '@/lib/aeat/books';
import { parseFromTo } from '@/lib/aeat/period';
import { buildExportResponse, parseExportFormat } from '@/lib/aeat/response';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    const format = parseExportFormat(request.nextUrl.searchParams.get('format'));
    const range = parseFromTo(from, to);

    const rows = await getPurchasesBookRows(auth.tenantId, range.from, range.to);

    const sheetRows = [
      [
        'Fecha',
        'Nº justificante',
        'Proveedor',
        'NIF/CIF',
        'Base',
        'Tipo IVA',
        'Cuota IVA',
        'Total',
        'DocType',
        'TaxCategory',
        'AEAT Concept',
        'AEAT Key',
      ],
      ...rows.map((row) => [
        row.fecha,
        row.numeroJustificante,
        row.proveedor,
        row.nif,
        row.base,
        row.tipoIva,
        row.cuotaIva,
        row.total,
        row.docType,
        row.taxCategory,
        row.aeatConcept,
        row.aeatKey,
      ]),
    ];

    return buildExportResponse({
      filenameBase: `aeat-purchases-${range.label}`,
      format,
      rows: sheetRows,
      sheetName: 'Libro recibidas',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al exportar libro de gastos' },
      { status: 400 }
    );
  }
}
