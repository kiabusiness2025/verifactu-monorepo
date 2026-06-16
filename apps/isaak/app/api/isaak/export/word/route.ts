// Word (DOCX) export endpoint.
//
// GET /api/isaak/export/word?reportType=libro_iva_emitidas&from=YYYY-MM-DD&to=YYYY-MM-DD
//
// Generates a .docx from the Isaak Ledger on-the-fly. Same auth and params
// as the Excel/PDF endpoints.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  loadLedgerRowsForExport,
  loadTenantMeta,
  ledgerRowToLibroIva,
  ledgerRowToLibroDiario,
} from '@/app/lib/isaak-excel-loader';
import { REPORT_TYPES, reportFilename, type ReportType } from '@/app/lib/isaak-excel-export';
import { buildWordReport } from '@/app/lib/isaak-word-export';

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
    const meta = await loadTenantMeta(session.tenantId);
    const period = { from, to, label: periodLabel };

    let headers: string[];
    let rows: string[][];
    let summary: string | undefined;

    if (reportType === 'libro_iva_emitidas') {
      const raw = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_out'],
      });
      const ivaRows = raw.map(ledgerRowToLibroIva);
      headers = ['Fecha', 'Nº doc.', 'NIF', 'Razón social', 'Base', 'IVA%', 'Cuota', 'Total'];
      rows = ivaRows.map((r) => [
        r.date,
        r.docNumber ?? '',
        r.counterpartyNif ?? '',
        r.counterpartyName ?? '',
        r.taxBase,
        r.vatRate,
        r.vatAmount,
        r.total,
      ]);
      const totalBase = ivaRows.reduce((s, r) => s + Number.parseFloat(r.taxBase || '0'), 0);
      const totalCuota = ivaRows.reduce((s, r) => s + Number.parseFloat(r.vatAmount || '0'), 0);
      summary = `Total facturas: ${ivaRows.length} | Base imponible: ${totalBase.toFixed(2)} € | IVA total: ${totalCuota.toFixed(2)} €`;
    } else if (reportType === 'libro_iva_recibidas') {
      const raw = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_in', 'expense'],
      });
      const ivaRows = raw.map(ledgerRowToLibroIva);
      headers = ['Fecha', 'Nº doc.', 'NIF', 'Razón social', 'Base', 'IVA%', 'Cuota', 'Total'];
      rows = ivaRows.map((r) => [
        r.date,
        r.docNumber ?? '',
        r.counterpartyNif ?? '',
        r.counterpartyName ?? '',
        r.taxBase,
        r.vatRate,
        r.vatAmount,
        r.total,
      ]);
      const totalBase = ivaRows.reduce((s, r) => s + Number.parseFloat(r.taxBase || '0'), 0);
      const totalCuota = ivaRows.reduce((s, r) => s + Number.parseFloat(r.vatAmount || '0'), 0);
      summary = `Total facturas: ${ivaRows.length} | Base imponible: ${totalBase.toFixed(2)} € | IVA soportado: ${totalCuota.toFixed(2)} €`;
    } else if (reportType === 'libro_diario') {
      const raw = await loadLedgerRowsForExport({
        tenantId: session.tenantId,
        periodFrom: from,
        periodTo: to,
      });
      const diarioRows = raw.map(ledgerRowToLibroDiario);
      headers = ['Fecha', 'Concepto', 'Debe', 'Haber', 'Importe', 'Nº doc.'];
      rows = diarioRows.map((r) => [
        r.date,
        r.description,
        r.accountDebit ?? '',
        r.accountCredit ?? '',
        r.amount,
        r.docNumber ?? '',
      ]);
      summary = `Total asientos: ${diarioRows.length}`;
    } else {
      // modelo_303
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
      const emitidas = out.map(ledgerRowToLibroIva);
      const recibidas = inn.map(ledgerRowToLibroIva);
      const devengado = emitidas.reduce((s, r) => s + Number.parseFloat(r.vatAmount || '0'), 0);
      const soportado = recibidas.reduce((s, r) => s + Number.parseFloat(r.vatAmount || '0'), 0);
      const resultado = devengado - soportado;
      headers = ['Concepto', 'Importe (€)'];
      rows = [
        ['IVA devengado (facturas emitidas)', devengado.toFixed(2)],
        ['IVA soportado (facturas recibidas)', soportado.toFixed(2)],
        ['Resultado', resultado.toFixed(2)],
      ];
      summary = `Resultado modelo 303: ${resultado.toFixed(2)} € ${resultado > 0 ? '(a ingresar)' : resultado < 0 ? '(a devolver)' : '(a cero)'}`;
    }

    const buf = await buildWordReport({
      title: reportFilename(reportType, period).replace('.xlsx', ''),
      tenantName: meta.tenantName,
      tenantNif: meta.tenantNif,
      period,
      headers,
      rows,
      summary,
    });

    const filename = reportFilename(reportType, period).replace('.xlsx', '.docx');

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[Isaak Export Word] failed', err);
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
