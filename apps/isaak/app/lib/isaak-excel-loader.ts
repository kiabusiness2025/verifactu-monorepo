// F10 — Loader que convierte filas del Isaak Ledger en estructuras
// listas para los builders Excel.
//
// Pure-ish: la única dependencia externa es Prisma. La transformación
// de filas a LibroIvaRow / LibroDiarioRow es pura y testeable
// inyectando filas sintéticas.

import { prisma } from './prisma';
import type {
  LibroDiarioRow,
  LibroIvaRow,
} from './isaak-excel-export';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type LedgerRowRaw = {
  docType: string;
  entryDate: Date;
  docNumber: string | null;
  counterpartyNif: string | null;
  counterpartyName: string | null;
  amount: unknown;
  taxBase: unknown;
  vatRate: unknown;
  vatAmount: unknown;
  description: string;
  accountDebit: string | null;
  accountCredit: string | null;
};

function decimalToString(v: unknown): string {
  if (v === null || v === undefined) return '0.00';
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v.toFixed(2);
  // Prisma Decimal → has toString()
  const asObj = v as { toString?: () => string };
  if (typeof asObj?.toString === 'function') {
    const n = Number.parseFloat(asObj.toString());
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }
  return '0.00';
}

function toIsoDate(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function ledgerRowToLibroIva(row: LedgerRowRaw): LibroIvaRow {
  return {
    date: toIsoDate(row.entryDate),
    docNumber: row.docNumber,
    counterpartyNif: row.counterpartyNif,
    counterpartyName: row.counterpartyName,
    taxBase: decimalToString(row.taxBase ?? row.amount),
    vatRate: decimalToString(row.vatRate ?? '0'),
    vatAmount: decimalToString(row.vatAmount ?? '0'),
    total: decimalToString(row.amount),
    description: row.description ?? '',
  };
}

export function ledgerRowToLibroDiario(row: LedgerRowRaw): LibroDiarioRow {
  return {
    date: toIsoDate(row.entryDate),
    description: row.description ?? '',
    accountDebit: row.accountDebit,
    accountCredit: row.accountCredit,
    amount: decimalToString(row.amount),
    docNumber: row.docNumber,
  };
}

export async function loadLedgerRowsForExport(input: {
  tenantId: string;
  periodFrom: string;
  periodTo: string;
  docTypes?: ReadonlyArray<string>;
}): Promise<LedgerRowRaw[]> {
  if (!input.tenantId) throw new Error('loadLedgerRowsForExport: tenantId required');
  if (!ISO_DATE_REGEX.test(input.periodFrom)) throw new Error('periodFrom must be YYYY-MM-DD');
  if (!ISO_DATE_REGEX.test(input.periodTo)) throw new Error('periodTo must be YYYY-MM-DD');

  const types = input.docTypes && input.docTypes.length > 0 ? input.docTypes : null;
  const filterClause = types ? 'AND doc_type = ANY($4::text[])' : '';
  const params: unknown[] = [input.tenantId, input.periodFrom, input.periodTo];
  if (types) params.push(types);

  const sql = `
    SELECT
      doc_type        AS "docType",
      entry_date      AS "entryDate",
      doc_number      AS "docNumber",
      counterparty_nif AS "counterpartyNif",
      counterparty_name AS "counterpartyName",
      amount,
      tax_base        AS "taxBase",
      vat_rate        AS "vatRate",
      vat_amount      AS "vatAmount",
      description,
      account_debit   AS "accountDebit",
      account_credit  AS "accountCredit"
    FROM isaak_ledger_entries
    WHERE tenant_id = $1::uuid
      AND entry_date >= $2::date
      AND entry_date <= $3::date
      ${filterClause}
    ORDER BY entry_date ASC, sequence ASC
  `.trim();

  return prisma.$queryRawUnsafe<LedgerRowRaw[]>(sql, ...params);
}

export async function loadTenantMeta(tenantId: string): Promise<{
  tenantName: string;
  tenantNif: string;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, legalName: true, nif: true },
  });
  return {
    tenantName: tenant?.legalName ?? tenant?.name ?? 'Empresa',
    tenantNif: tenant?.nif ?? '',
  };
}
