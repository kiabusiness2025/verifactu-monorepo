import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { buildWorkbookBuffer, type XlsxCell } from '@/app/lib/export/xlsx';

export const runtime = 'nodejs';

const EMITTED_VERIFACTU_STATUSES = ['validated', 'accepted', 'accepted_with_errors'];

type PeriodKey =
  | 'current_month'
  | 'previous_month'
  | 'current_quarter'
  | 'previous_quarter'
  | 'current_year'
  | 'previous_year'
  | 'custom'
  | 'all';

function parsePeriod(value: string | null): PeriodKey {
  switch (value) {
    case 'current_month':
    case 'previous_month':
    case 'current_quarter':
    case 'previous_quarter':
    case 'current_year':
    case 'previous_year':
    case 'custom':
    case 'all':
      return value;
    default:
      return 'current_month';
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function getDateRange(period: PeriodKey, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === 'all') {
    return null;
  }

  if (period === 'current_month') {
    return {
      from: new Date(year, month, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year, month + 1, 0)),
    };
  }

  if (period === 'previous_month') {
    return {
      from: new Date(year, month - 1, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year, month, 0)),
    };
  }

  if (period === 'current_quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: new Date(year, quarterStartMonth, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year, quarterStartMonth + 3, 0)),
    };
  }

  if (period === 'previous_quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const prevQuarterStart = new Date(year, quarterStartMonth - 3, 1, 0, 0, 0, 0);
    return {
      from: prevQuarterStart,
      to: endOfDay(new Date(prevQuarterStart.getFullYear(), prevQuarterStart.getMonth() + 3, 0)),
    };
  }

  if (period === 'current_year') {
    return {
      from: new Date(year, 0, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year, 11, 31)),
    };
  }

  if (period === 'previous_year') {
    return {
      from: new Date(year - 1, 0, 1, 0, 0, 0, 0),
      to: endOfDay(new Date(year - 1, 11, 31)),
    };
  }

  return null;
}

function toNullableNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : value.toNumber();
  return Number.isFinite(n) ? n : null;
}

function clampLimit(value: string | null) {
  const raw = Number(value || 50);
  if (!Number.isFinite(raw)) return 50;
  return Math.max(10, Math.min(200, Math.floor(raw)));
}

function clampExportLimit(value: string | null) {
  const raw = Number(value || 5000);
  if (!Number.isFinite(raw)) return 5000;
  return Math.max(100, Math.min(10000, Math.floor(raw)));
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n');
  return `\uFEFF${content}`;
}

function periodLabel(period: PeriodKey, dateFrom: string, dateTo: string) {
  switch (period) {
    case 'current_month':
      return 'Mes actual';
    case 'previous_month':
      return 'Mes anterior';
    case 'current_quarter':
      return 'Trimestre actual';
    case 'previous_quarter':
      return 'Trimestre anterior';
    case 'current_year':
      return 'Ano actual';
    case 'previous_year':
      return 'Ano anterior';
    case 'all':
      return 'Todo el historico';
    case 'custom':
      return dateFrom && dateTo ? `Personalizado (${dateFrom} a ${dateTo})` : 'Personalizado';
    default:
      return 'Mes actual';
  }
}

export async function GET(request: NextRequest) {
  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const q = (params.get('q') || '').trim();
  const customer = (params.get('customer') || '').trim();
  const status = (params.get('status') || 'all').trim().toLowerCase();
  const period = parsePeriod(params.get('period'));
  const dateFrom = (params.get('dateFrom') || '').trim();
  const dateTo = (params.get('dateTo') || '').trim();
  const sortByRaw = (params.get('sortBy') || 'issueDate').trim();
  const sortDirRaw = (params.get('sortDir') || 'desc').trim().toLowerCase();
  const format = (params.get('format') || 'json').trim().toLowerCase();
  const limit = clampLimit(params.get('limit'));
  const exportLimit = clampExportLimit(params.get('exportLimit'));

  const sortBy: 'issueDate' | 'number' | 'customerName' | 'amountGross' | 'updatedAt' =
    sortByRaw === 'number' ||
    sortByRaw === 'customerName' ||
    sortByRaw === 'amountGross' ||
    sortByRaw === 'updatedAt'
      ? sortByRaw
      : 'issueDate';
  const sortDir: Prisma.SortOrder = sortDirRaw === 'asc' ? 'asc' : 'desc';

  const andWhere: Prisma.InvoiceWhereInput[] = [
    {
      OR: [{ status: 'issued' }, { verifactuStatus: { in: EMITTED_VERIFACTU_STATUSES } }],
    },
  ];

  if (status !== 'all') {
    andWhere.push({ verifactuStatus: status });
  }

  if (customer) {
    andWhere.push({
      customerName: {
        contains: customer,
        mode: 'insensitive',
      },
    });
  }

  if (q) {
    andWhere.push({
      OR: [
        { number: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerNif: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (period === 'custom') {
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    if (
      fromDate &&
      !Number.isNaN(fromDate.getTime()) &&
      toDate &&
      !Number.isNaN(toDate.getTime())
    ) {
      andWhere.push({
        issueDate: {
          gte: startOfDay(fromDate),
          lte: endOfDay(toDate),
        },
      });
    }
  } else {
    const range = getDateRange(period);
    if (range) {
      andWhere.push({
        issueDate: {
          gte: range.from,
          lte: range.to,
        },
      });
    }
  }

  const where: Prisma.InvoiceWhereInput = {
    tenantId: session.tenantId,
    AND: andWhere,
  };

  const selectFields = {
    id: true,
    number: true,
    issueDate: true,
    customerName: true,
    customerNif: true,
    currency: true,
    amountNet: true,
    amountTax: true,
    amountGross: true,
    status: true,
    verifactuStatus: true,
    verifactuHash: true,
    verifactuSubmissionId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  const rowTake = format === 'xlsx' || format === 'csv' ? exportLimit : limit;

  const [rows, total, customerRows] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      take: rowTake,
      select: selectFields,
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [{ status: 'issued' }, { verifactuStatus: { in: EMITTED_VERIFACTU_STATUSES } }],
      },
      select: { customerName: true },
      orderBy: { customerName: 'asc' },
      distinct: ['customerName'],
      take: 200,
    }),
  ]);

  if (format === 'xlsx' || format === 'csv') {
    const appliedPeriod = periodLabel(period, dateFrom, dateTo);

    const header: XlsxCell[] = [
      'ID factura',
      'Numero',
      'Fecha',
      'Cliente',
      'NIF cliente',
      'Moneda',
      'Estado emision',
      'Estado interno',
      'Base imponible',
      'IVA',
      'Total',
      'Hash VeriFactu',
      'ID envio',
      'Creada',
      'Actualizada',
    ];

    const bodyRows: XlsxCell[][] = rows.map((row) => [
      row.id,
      row.number,
      row.issueDate.toISOString().slice(0, 10),
      row.customerName,
      row.customerNif || '',
      row.currency,
      row.verifactuStatus || '',
      row.status,
      toNullableNumber(row.amountNet),
      toNullableNumber(row.amountTax),
      toNullableNumber(row.amountGross),
      row.verifactuHash || '',
      row.verifactuSubmissionId || '',
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ]);

    const exportRows: XlsxCell[][] = [
      ['Periodo aplicado', appliedPeriod],
      ['Filtros', `Estado=${status}; Cliente=${customer || 'todos'}; Buscar=${q || 'vacio'}`],
      [],
      header,
      ...bodyRows,
    ];

    if (format === 'csv') {
      const csvRows = exportRows.map((row) => row.map((cell) => String(cell ?? '')));
      return new NextResponse(toCsv(csvRows), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="facturas-emitidas-filtrado.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const workbook = buildWorkbookBuffer(exportRows, {
      sheetName: 'Facturas emitidas',
      headerRows: 4,
      moneyColumns: [8, 9, 10],
      columnWidths: [40, 20, 14, 30, 16, 10, 18, 16, 14, 14, 14, 72, 28, 26, 26],
    });
    const bytes = new Uint8Array(workbook);
    const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="facturas-emitidas-filtrado.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      items: rows.map((row) => ({
        id: row.id,
        number: row.number,
        issueDate: row.issueDate.toISOString().slice(0, 10),
        customerName: row.customerName,
        customerNif: row.customerNif,
        amountNet: toNullableNumber(row.amountNet),
        amountTax: toNullableNumber(row.amountTax),
        amountGross: toNullableNumber(row.amountGross),
        status: row.status,
        verifactuStatus: row.verifactuStatus,
        verifactuHash: row.verifactuHash,
        verifactuSubmissionId: row.verifactuSubmissionId,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      customers: customerRows.map((row) => row.customerName).filter(Boolean),
      filters: {
        q,
        customer,
        status,
        period,
        dateFrom,
        dateTo,
        sortBy,
        sortDir,
        limit,
      },
    },
  });
}
