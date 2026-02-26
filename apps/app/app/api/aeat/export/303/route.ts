import { getPreview303 } from '@/lib/aeat/books';
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
    const preview = await getPreview303(auth.tenantId, parsed.from, parsed.to, parsed.label);

    const rows = [
      ['Periodo', preview.period],
      ['Base ventas', preview.baseVentas],
      ['Cuota IVA ventas', preview.cuotaVentas],
      ['Base gastos deducibles', preview.baseGastosDeducibles],
      ['Cuota IVA deducible', preview.cuotaGastosDeducibles],
      ['Resultado estimado', preview.resultado],
    ];

    return buildExportResponse({
      filenameBase: `aeat-303-${preview.period}`,
      format,
      rows,
      sheetName: 'Modelo 303',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo exportar 303' },
      { status: 400 }
    );
  }
}
