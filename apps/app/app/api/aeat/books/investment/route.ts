import { getInvestmentBookRows } from '@/lib/aeat/books';
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

    const rows = await getInvestmentBookRows(auth.tenantId, range.from, range.to);

    const sheetRows = [
      [
        'Descripción del bien',
        'Fecha adquisición',
        'Valor adquisición',
        'Valor suelo',
        'Valor construcción',
        'Base amortizable',
        'Porcentaje amortización',
        'Amortización anual',
        'Amortización acumulada',
        'Valor pendiente',
        'Ejercicio',
        'Observaciones',
      ],
      ...rows.map((row) => [
        row.descripcionBien,
        row.fechaAdquisicion,
        row.valorAdquisicion,
        row.valorSuelo,
        row.valorConstruccion,
        row.baseAmortizable,
        row.porcentajeAmortizacion,
        row.amortizacionAnual,
        row.amortizacionAcumulada,
        row.valorPendiente,
        row.ejercicio,
        row.observaciones,
      ]),
    ];

    return buildExportResponse({
      filenameBase: `aeat-investment-${range.label}`,
      format,
      rows: sheetRows,
      sheetName: 'Libro bienes de inversión',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al exportar libro de inversión' },
      { status: 400 }
    );
  }
}
