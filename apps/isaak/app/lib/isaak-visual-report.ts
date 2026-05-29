// Builds visual artifact data (charts + tables) from the Isaak Ledger.
// Called by the isaak_generate_visual_report LLM tool.

import { loadLedgerRowsForExport } from './isaak-excel-loader';
import { makeVisualArtifact, type IsaakArtifact } from './isaak-artifact';

export type VisualReportType =
  | 'sales_by_month'
  | 'expense_breakdown'
  | 'cash_flow'
  | 'iva_trimestral';

export const VISUAL_REPORT_TYPES: VisualReportType[] = [
  'sales_by_month',
  'expense_breakdown',
  'cash_flow',
  'iva_trimestral',
];

function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  const s = (v as { toString?: () => string })?.toString?.();
  if (s) {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function quarterLabel(d: Date): string {
  return `T${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

function sortQuarters(a: string, b: string): number {
  const [qa, ya] = a.split(' ');
  const [qb, yb] = b.split(' ');
  const yearDiff = Number(ya) - Number(yb);
  return yearDiff !== 0 ? yearDiff : qa.localeCompare(qb);
}

function fmtEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function buildVisualReportData(
  tenantId: string,
  reportType: VisualReportType,
  from: string,
  to: string,
  title?: string
): Promise<IsaakArtifact> {
  const dlParams = new URLSearchParams({ reportType, from, to }).toString();
  const downloadLinks = {
    excel: `/api/isaak/export/excel?${dlParams}`,
    pdf: `/api/isaak/export/pdf?${dlParams}`,
    word: `/api/isaak/export/word?${dlParams}`,
  };

  if (reportType === 'sales_by_month') {
    const rows = await loadLedgerRowsForExport({
      tenantId,
      periodFrom: from,
      periodTo: to,
      docTypes: ['invoice_out'],
    });

    const byMonth = new Map<string, number>();
    for (const row of rows) {
      const key = toYearMonth(new Date(row.entryDate));
      byMonth.set(key, (byMonth.get(key) ?? 0) + toNum(row.amount));
    }
    const sorted = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    return {
      ...makeVisualArtifact({
        title: title ?? 'Ventas por mes',
        chartType: 'bar',
        chartData: sorted.map(([mes, ventas]) => ({ mes, ventas: round2(ventas) })),
        chartKeys: { nameKey: 'mes', valueKeys: ['ventas'] },
        tableHeaders: ['Mes', 'Ventas (€)'],
        tableRows: sorted.map(([mes, v]) => [mes, fmtEur(v)]),
        summary: `Total ventas: ${fmtEur(total)} € en el periodo ${from} – ${to}.`,
      }),
      downloadLinks,
    };
  }

  if (reportType === 'expense_breakdown') {
    const rows = await loadLedgerRowsForExport({
      tenantId,
      periodFrom: from,
      periodTo: to,
      docTypes: ['invoice_in', 'expense'],
    });

    const bySupplier = new Map<string, number>();
    for (const row of rows) {
      const key = row.counterpartyName?.trim() || row.description?.slice(0, 30) || 'Sin nombre';
      bySupplier.set(key, (bySupplier.get(key) ?? 0) + toNum(row.amount));
    }
    const sorted = Array.from(bySupplier.entries()).sort(([, a], [, b]) => b - a);
    const top8 = sorted.slice(0, 8);
    const othersTotal = sorted.slice(8).reduce((s, [, v]) => s + v, 0);
    if (othersTotal > 0) top8.push(['Otros', othersTotal]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);

    return {
      ...makeVisualArtifact({
        title: title ?? 'Desglose de gastos',
        chartType: 'pie',
        chartData: top8.map(([categoria, importe]) => ({ categoria, importe: round2(importe) })),
        chartKeys: { nameKey: 'categoria', valueKeys: ['importe'] },
        tableHeaders: ['Categoría / Proveedor', 'Importe (€)', '%'],
        tableRows: top8.map(([cat, v]) => [
          cat,
          fmtEur(v),
          total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%',
        ]),
        summary: `Total gastos: ${fmtEur(total)} € en el periodo ${from} – ${to}.`,
      }),
      downloadLinks,
    };
  }

  if (reportType === 'cash_flow') {
    const [outRows, inRows] = await Promise.all([
      loadLedgerRowsForExport({
        tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_out'],
      }),
      loadLedgerRowsForExport({
        tenantId,
        periodFrom: from,
        periodTo: to,
        docTypes: ['invoice_in', 'expense'],
      }),
    ]);

    const months = new Set<string>();
    const incomeByMonth = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();

    for (const row of outRows) {
      const key = toYearMonth(new Date(row.entryDate));
      months.add(key);
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + toNum(row.amount));
    }
    for (const row of inRows) {
      const key = toYearMonth(new Date(row.entryDate));
      months.add(key);
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + toNum(row.amount));
    }

    const sorted = Array.from(months).sort();
    const totalIncome = sorted.reduce((s, m) => s + (incomeByMonth.get(m) ?? 0), 0);
    const totalExpense = sorted.reduce((s, m) => s + (expenseByMonth.get(m) ?? 0), 0);

    return {
      ...makeVisualArtifact({
        title: title ?? 'Flujo de caja',
        chartType: 'line',
        chartData: sorted.map((mes) => ({
          mes,
          ingresos: round2(incomeByMonth.get(mes) ?? 0),
          gastos: round2(expenseByMonth.get(mes) ?? 0),
        })),
        chartKeys: { nameKey: 'mes', valueKeys: ['ingresos', 'gastos'] },
        tableHeaders: ['Mes', 'Ingresos (€)', 'Gastos (€)', 'Flujo neto (€)'],
        tableRows: sorted.map((mes) => {
          const inc = incomeByMonth.get(mes) ?? 0;
          const exp = expenseByMonth.get(mes) ?? 0;
          return [mes, fmtEur(inc), fmtEur(exp), fmtEur(inc - exp)];
        }),
        summary: `Ingresos: ${fmtEur(totalIncome)} € | Gastos: ${fmtEur(totalExpense)} € | Flujo neto: ${fmtEur(totalIncome - totalExpense)} €.`,
      }),
      downloadLinks,
    };
  }

  // iva_trimestral
  const [outRows, inRows] = await Promise.all([
    loadLedgerRowsForExport({
      tenantId,
      periodFrom: from,
      periodTo: to,
      docTypes: ['invoice_out'],
    }),
    loadLedgerRowsForExport({
      tenantId,
      periodFrom: from,
      periodTo: to,
      docTypes: ['invoice_in', 'expense'],
    }),
  ]);

  const quarters = new Set<string>();
  const devByQ = new Map<string, number>();
  const sopByQ = new Map<string, number>();

  for (const row of outRows) {
    const key = quarterLabel(new Date(row.entryDate));
    quarters.add(key);
    devByQ.set(key, (devByQ.get(key) ?? 0) + toNum(row.vatAmount));
  }
  for (const row of inRows) {
    const key = quarterLabel(new Date(row.entryDate));
    quarters.add(key);
    sopByQ.set(key, (sopByQ.get(key) ?? 0) + toNum(row.vatAmount));
  }

  const sorted = Array.from(quarters).sort(sortQuarters);
  const totalDev = sorted.reduce((s, q) => s + (devByQ.get(q) ?? 0), 0);
  const totalSop = sorted.reduce((s, q) => s + (sopByQ.get(q) ?? 0), 0);
  const resultado = totalDev - totalSop;

  return {
    ...makeVisualArtifact({
      title: title ?? 'IVA trimestral',
      chartType: 'bar',
      chartData: sorted.map((trimestre) => ({
        trimestre,
        devengado: round2(devByQ.get(trimestre) ?? 0),
        soportado: round2(sopByQ.get(trimestre) ?? 0),
      })),
      chartKeys: { nameKey: 'trimestre', valueKeys: ['devengado', 'soportado'] },
      tableHeaders: ['Trimestre', 'IVA devengado (€)', 'IVA soportado (€)', 'Resultado (€)'],
      tableRows: sorted.map((q) => {
        const dev = devByQ.get(q) ?? 0;
        const sop = sopByQ.get(q) ?? 0;
        return [q, fmtEur(dev), fmtEur(sop), fmtEur(dev - sop)];
      }),
      summary: `IVA devengado: ${fmtEur(totalDev)} € | Soportado: ${fmtEur(totalSop)} € | Resultado: ${fmtEur(resultado)} € ${resultado > 0 ? '(a ingresar)' : resultado < 0 ? '(a devolver)' : ''}.`,
    }),
    downloadLinks,
  };
}
