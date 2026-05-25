// F10 — Excel export endpoint (solo lectura).
//
// GET /api/isaak/export/excel?reportType=libro_iva_emitidas&from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Devuelve el .xlsx generado al vuelo desde el Isaak Ledger. tenantId
// se toma de la sesión.
//
// Idempotente: re-generar produce el mismo Excel (los datos del
// ledger son inmutables por hash chain). No persistimos los archivos.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  loadLedgerRowsForExport,
  loadTenantMeta,
  ledgerRowToLibroIva,
  ledgerRowToLibroDiario,
} from '@/app/lib/isaak-excel-loader';
import {
  REPORT_TYPES,
  buildLibroDiario,
  buildLibroIvaEmitidas,
  buildLibroIvaRecibidas,
  buildModelo303,
  reportFilename,
  type ReportType,
} from '@/app/lib/isaak-excel-export';

export const runtime = 'nodejs';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function requireSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const reportType = (url.searchParams.get('reportType') ?? '') as ReportType;
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  const periodLabel = url.searchParams.get('label') ?? undefined;

  if (!REPORT_TYPES.includes(reportType)) {
    return NextResponse.json(
      { error: 'invalid_report_type', allowed: REPORT_TYPES },
      { status: 400 }
    );
  }
  if (!ISO_DATE_REGEX.test(from) || !ISO_DATE_REGEX.test(to) || to < from) {
    return NextResponse.json(
      { error: 'invalid_period', message: 'from/to deben ser YYYY-MM-DD y from <= to' },
      { status: 400 }
    );
  }

  try {
    const meta = {
      ...(await loadTenantMeta(session.tenantId)),
      generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    const period = { from, to, label: periodLabel };

    let workbook;
    if (reportType === 'libro_iva_emitidas') {
      const rows = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_out'],
      });
      workbook = buildLibroIvaEmitidas({
        rows: rows.map(ledgerRowToLibroIva),
        period,
        meta,
      });
    } else if (reportType === 'libro_iva_recibidas') {
      const rows = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_in', 'expense'],
      });
      workbook = buildLibroIvaRecibidas({
        rows: rows.map(ledgerRowToLibroIva),
        period,
        meta,
      });
    } else if (reportType === 'libro_diario') {
      const rows = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
      });
      workbook = buildLibroDiario({
        rows: rows.map(ledgerRowToLibroDiario),
        period,
        meta,
      });
    } else {
      // modelo_303 — requiere las dos colecciones
      const [out, inn] = await Promise.all([
        loadLedgerRowsForExport({
          tenantId: session.tenantId,
          periodFrom: from,
          periodTo: to,
          docTypes: ['invoice_out'],
        }),
        loadLedgerRowsForExport({
          tenantId: session.tenantId,
          periodFrom: from,
          periodTo: to,
          docTypes: ['invoice_in', 'expense'],
        }),
      ]);
      workbook = buildModelo303({
        facturasEmitidas: out.map(ledgerRowToLibroIva),
        facturasRecibidas: inn.map(ledgerRowToLibroIva),
        period,
        meta,
      });
    }

    const buf = await workbook.xlsx.writeBuffer();
    const filename = reportFilename(reportType, period);

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[Isaak Export] failed', err);
    return NextResponse.json(
      { error: 'export_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
