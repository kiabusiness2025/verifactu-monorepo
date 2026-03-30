import type { fetchHoldedSnapshot } from '@/app/lib/holded-integration';

export type HoldedSnapshot = Awaited<ReturnType<typeof fetchHoldedSnapshot>>;

export type HoldedAnalyticsSummary = {
  monthSales: number;
  monthExpenses: number | null;
  monthMargin: number | null;
  quarterSales: number;
  quarterExpenses: number | null;
  quarterMargin: number | null;
  pendingCollectionsAmount: number;
  pendingCollectionsCount: number;
  invoices: number;
  contacts: number;
  accounts: number;
  expenseSignals: number;
  insight: string;
};

export type HoldedRangeSummary = {
  sales: number;
  expenses: number | null;
  margin: number | null;
  pendingCollectionsAmount: number;
  pendingCollectionsCount: number;
  invoices: number;
  expenseSignals: number;
};

function extractNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readDocumentAmount(document: Record<string, unknown>) {
  const candidates = [
    document.amountGross,
    document.total,
    document.totalWithTax,
    document.amount,
    document.totalAmount,
    document.totalFormatted,
  ];

  for (const candidate of candidates) {
    const value = extractNumber(candidate);
    if (value !== 0) return value;
  }

  return 0;
}

function readDocumentStatus(document: Record<string, unknown>) {
  const candidates = [document.status, document.docStatus, document.paymentStatus];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return '';
}

function readDocumentKind(document: Record<string, unknown>) {
  const candidates = [
    document.docType,
    document.documentType,
    document.type,
    document.kind,
    document.category,
    document.direction,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return '';
}

function readDocumentDate(document: Record<string, unknown>) {
  const candidates = [
    document.date,
    document.issueDate,
    document.docDate,
    document.createdAt,
    document.updatedAt,
  ];

  for (const candidate of candidates) {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate;
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const timestamp = candidate > 10_000_000_000 ? candidate : candidate * 1000;
      const parsed = new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function getCurrentQuarterRange(now = new Date()) {
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStartMonth, 1);
  const end = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
  return { start, end };
}

function getYearRange(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return { start, end };
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date >= start && date < end;
}

function inferDocumentDirection(document: Record<string, unknown>) {
  const kind = readDocumentKind(document);
  const searchable = [
    kind,
    typeof document.contactType === 'string' ? document.contactType.toLowerCase() : '',
    typeof document.seriesType === 'string' ? document.seriesType.toLowerCase() : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (
    ['expense', 'purchase', 'bill', 'supplier', 'vendor', 'gasto', 'compra', 'payroll'].some(
      (keyword) => searchable.includes(keyword)
    )
  ) {
    return 'expense' as const;
  }

  if (
    ['invoice', 'sale', 'income', 'customer', 'venta', 'ingreso'].some((keyword) =>
      searchable.includes(keyword)
    )
  ) {
    return 'sale' as const;
  }

  const amount = readDocumentAmount(document);
  if (amount < 0) return 'expense' as const;
  return 'sale' as const;
}

function isPendingCollectionStatus(status: string) {
  return ['pending', 'open', 'unpaid', 'overdue', 'partial'].some((keyword) =>
    status.includes(keyword)
  );
}

function buildInsight(summary: Omit<HoldedAnalyticsSummary, 'insight'>) {
  const fragments: string[] = [];

  if (summary.monthSales > 0) {
    fragments.push(
      `este mes ya veo ${summary.monthSales.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} EUR en ventas`
    );
  }

  if (summary.monthExpenses !== null && summary.monthExpenses > 0) {
    fragments.push(
      `${summary.monthExpenses.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} EUR en gastos`
    );
  }

  if (summary.pendingCollectionsAmount > 0) {
    fragments.push(
      `${summary.pendingCollectionsAmount.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} EUR pendientes de cobro`
    );
  }

  if (summary.monthMargin !== null) {
    const direction =
      summary.monthMargin >= 0 ? 'margen estimado positivo' : 'margen estimado en rojo';
    fragments.push(
      `${direction} de ${Math.abs(summary.monthMargin).toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} EUR`
    );
  }

  if (fragments.length > 0) {
    return `${fragments.join(', ')}. Si quieres, sigo con el trimestre, cobros pendientes o resultados.`;
  }

  if (summary.invoices > 0) {
    return 'Ya tengo una primera lectura real de tus documentos y puedo convertirla en resultados, cobros pendientes y prioridades concretas.';
  }

  return 'Ya puedo empezar a orientarte con una primera lectura real de ventas, facturas y contactos.';
}

export function buildRangeSummary(
  snapshot: HoldedSnapshot,
  start: Date,
  end: Date
): HoldedRangeSummary {
  let sales = 0;
  let expenses = 0;
  let pendingCollectionsAmount = 0;
  let pendingCollectionsCount = 0;
  let invoices = 0;
  let expenseSignals = 0;

  for (const document of snapshot.invoices) {
    if (!document || typeof document !== 'object') continue;

    const date = readDocumentDate(document);
    const amount = Math.abs(readDocumentAmount(document));
    const status = readDocumentStatus(document);
    const direction = inferDocumentDirection(document);

    if (direction === 'sale' && isPendingCollectionStatus(status)) {
      pendingCollectionsCount += 1;
      pendingCollectionsAmount += amount;
    }

    if (!date || !isWithinRange(date, start, end)) continue;

    invoices += 1;

    if (direction === 'expense') {
      expenses += amount;
      expenseSignals += 1;
    } else {
      sales += amount;
    }
  }

  return {
    sales,
    expenses: expenseSignals > 0 ? expenses : null,
    margin: expenseSignals > 0 ? sales - expenses : null,
    pendingCollectionsAmount,
    pendingCollectionsCount,
    invoices,
    expenseSignals,
  };
}

export function buildYearAnalyticsSummary(
  snapshot: HoldedSnapshot,
  year: number
): HoldedRangeSummary {
  const { start, end } = getYearRange(year);
  return buildRangeSummary(snapshot, start, end);
}

export function buildHoldedAnalyticsSummary(
  snapshot: HoldedSnapshot,
  now = new Date()
): HoldedAnalyticsSummary {
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange(now);
  const { start: quarterStart, end: quarterEnd } = getCurrentQuarterRange(now);

  let monthSales = 0;
  let monthExpenses = 0;
  let quarterSales = 0;
  let quarterExpenses = 0;
  let pendingCollectionsAmount = 0;
  let pendingCollectionsCount = 0;
  let expenseSignals = 0;

  for (const document of snapshot.invoices) {
    if (!document || typeof document !== 'object') continue;

    const date = readDocumentDate(document);
    const amount = Math.abs(readDocumentAmount(document));
    const status = readDocumentStatus(document);
    const direction = inferDocumentDirection(document);

    if (direction === 'sale' && isPendingCollectionStatus(status)) {
      pendingCollectionsCount += 1;
      pendingCollectionsAmount += amount;
    }

    if (!date) continue;

    if (isWithinRange(date, monthStart, monthEnd)) {
      if (direction === 'expense') {
        monthExpenses += amount;
        expenseSignals += 1;
      } else {
        monthSales += amount;
      }
    }

    if (isWithinRange(date, quarterStart, quarterEnd)) {
      if (direction === 'expense') {
        quarterExpenses += amount;
      } else {
        quarterSales += amount;
      }
    }
  }

  const summaryWithoutInsight = {
    monthSales,
    monthExpenses: expenseSignals > 0 ? monthExpenses : null,
    monthMargin: expenseSignals > 0 ? monthSales - monthExpenses : null,
    quarterSales,
    quarterExpenses: expenseSignals > 0 ? quarterExpenses : null,
    quarterMargin: expenseSignals > 0 ? quarterSales - quarterExpenses : null,
    pendingCollectionsAmount,
    pendingCollectionsCount,
    invoices: snapshot.invoices.length,
    contacts: snapshot.contacts.length,
    accounts: snapshot.accounts.length,
    expenseSignals,
  };

  return {
    ...summaryWithoutInsight,
    insight: buildInsight(summaryWithoutInsight),
  };
}
