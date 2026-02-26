import { getPreview130 } from '@/lib/aeat/books';
import { parsePeriod } from '@/lib/aeat/period';
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
    const period = request.nextUrl.searchParams.get('period');
    const format = parseExportFormat(request.nextUrl.searchParams.get('format'));
    const parsed = parsePeriod(period);
    const preview = await getPreview130(auth.tenantId, parsed.from, parsed.to, parsed.label);

    const rows = [
      ['Periodo', preview.period],
      ['Ingresos', preview.ingresos],
      ['Gastos', preview.gastos],
      ['Rendimiento neto', preview.rendimientoNeto],
      ['Porcentaje aplicado', preview.porcentajeAplicado],
      ['Pago fraccionado estimado', preview.pagoFraccionadoEstimado],
    ];

    return buildExportResponse({
      filenameBase: `aeat-130-${preview.period}`,
      format,
      rows,
      sheetName: 'Modelo 130',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo exportar 130' },
      { status: 400 }
    );
  }
}
