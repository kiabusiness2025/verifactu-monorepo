// F9 Isaak Ledger — pure SQL strings + input normalizer.
//
// Separated from isaak-ledger-repo.ts so unit tests can validate the SQL
// shape and the normalization logic without instantiating Prisma. The repo
// imports from here and wires Prisma calls.
//
// Critical invariant: every query against isaak_ledger_entries MUST filter
// by tenant_id first. The SQL builders here pin that contract; tests assert
// it (mirroring the pattern from isaak-vector-utils for long-term memory).

import type { LedgerHashInput } from './isaak-ledger-hash';

export const LEDGER_DOC_TYPES = [
  'invoice_in',
  'invoice_out',
  'expense',
  'payroll',
  'journal',
  'tax_payment',
] as const;
export type LedgerDocType = (typeof LEDGER_DOC_TYPES)[number];

export const LEDGER_SOURCE_SYSTEMS = [
  'holded',
  'manual',
  'ocr',
  'banking',
  'isaak_auto',
] as const;
export type LedgerSourceSystem = (typeof LEDGER_SOURCE_SYSTEMS)[number];

export type AppendEntryInput = {
  tenantId: string;
  entryDate: string; // 'YYYY-MM-DD'
  docType: LedgerDocType;
  docNumber?: string | null;
  counterpartyNif?: string | null;
  counterpartyName?: string | null;
  amount: string; // decimal as string for precision
  currency?: string;
  taxBase?: string | null;
  vatRate?: string | null;
  vatAmount?: string | null;
  accountDebit?: string | null;
  accountCredit?: string | null;
  description: string;
  sourceSystem: LedgerSourceSystem;
  holdedId?: string | null;
  attachmentUrl?: string | null;
  createdBy: string;
};

export type NormalizedAppendInput = Required<
  Omit<AppendEntryInput, 'currency' | 'attachmentUrl'>
> & {
  currency: string;
  attachmentUrl: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

export function normalizeAppendInput(input: AppendEntryInput): NormalizedAppendInput {
  if (!input.tenantId || !UUID_REGEX.test(input.tenantId)) {
    throw new Error('normalizeAppendInput: invalid tenantId (expected UUID)');
  }
  if (!ISO_DATE_REGEX.test(input.entryDate)) {
    throw new Error('normalizeAppendInput: entryDate must be YYYY-MM-DD');
  }
  if (!LEDGER_DOC_TYPES.includes(input.docType)) {
    throw new Error(`normalizeAppendInput: invalid docType "${input.docType}"`);
  }
  if (!LEDGER_SOURCE_SYSTEMS.includes(input.sourceSystem)) {
    throw new Error(`normalizeAppendInput: invalid sourceSystem "${input.sourceSystem}"`);
  }
  if (!DECIMAL_REGEX.test(input.amount)) {
    throw new Error('normalizeAppendInput: amount must be a decimal string');
  }
  for (const [field, value] of [
    ['taxBase', input.taxBase],
    ['vatRate', input.vatRate],
    ['vatAmount', input.vatAmount],
  ] as const) {
    if (value !== null && value !== undefined && !DECIMAL_REGEX.test(value)) {
      throw new Error(`normalizeAppendInput: ${field} must be a decimal string or null`);
    }
  }
  const description = input.description?.trim();
  if (!description) {
    throw new Error('normalizeAppendInput: description is required');
  }
  const createdBy = input.createdBy?.trim();
  if (!createdBy) {
    throw new Error('normalizeAppendInput: createdBy is required');
  }
  const currency = (input.currency ?? 'EUR').toUpperCase();
  if (!CURRENCY_REGEX.test(currency)) {
    throw new Error('normalizeAppendInput: currency must be ISO 4217 alpha-3');
  }
  return {
    tenantId: input.tenantId,
    entryDate: input.entryDate,
    docType: input.docType,
    docNumber: input.docNumber ?? null,
    counterpartyNif: input.counterpartyNif ?? null,
    counterpartyName: input.counterpartyName ?? null,
    amount: input.amount,
    currency,
    taxBase: input.taxBase ?? null,
    vatRate: input.vatRate ?? null,
    vatAmount: input.vatAmount ?? null,
    accountDebit: input.accountDebit ?? null,
    accountCredit: input.accountCredit ?? null,
    description,
    sourceSystem: input.sourceSystem,
    holdedId: input.holdedId ?? null,
    attachmentUrl: input.attachmentUrl ?? null,
    createdBy,
  };
}

// Translate a normalized append input into the hash chain input (drops
// fields not part of the fiscal digest — id, holded_id, attachment_url,
// created_by, sii flags — only canonical fiscal content + prevHash).
export function toHashInput(
  normalized: NormalizedAppendInput,
  prevHash: string | null
): LedgerHashInput {
  return {
    tenantId: normalized.tenantId,
    entryDate: normalized.entryDate,
    docNumber: normalized.docNumber,
    docType: normalized.docType,
    counterpartyNif: normalized.counterpartyNif,
    counterpartyName: normalized.counterpartyName,
    amount: normalized.amount,
    currency: normalized.currency,
    taxBase: normalized.taxBase,
    vatRate: normalized.vatRate,
    vatAmount: normalized.vatAmount,
    accountDebit: normalized.accountDebit,
    accountCredit: normalized.accountCredit,
    description: normalized.description,
    sourceSystem: normalized.sourceSystem,
    prevHash,
  };
}

// Advisory lock SQL — keyed by tenant_id hash so two concurrent appends for
// the same tenant serialize, but appends for different tenants run in
// parallel. The lock is released automatically at transaction end.
export const ADVISORY_LOCK_SQL =
  'SELECT pg_advisory_xact_lock(hashtext($1::text))';

// Fetches the most recent entry for a tenant (by sequence DESC). Used
// inside the append transaction to read prev_hash. tenant_id is the first
// (and only) filter — invariant pinned by isolation tests.
export const SELECT_LATEST_ENTRY_SQL = `
  SELECT hash, sequence
  FROM isaak_ledger_entries
  WHERE tenant_id = $1::uuid
  ORDER BY sequence DESC
  LIMIT 1
`.trim();

// Idempotency probe for the Holded importer. Returns one row if a ledger
// entry already exists for this (tenant_id, holded_id) pair, zero rows
// otherwise. tenant_id stays the first filter.
export const EXISTS_BY_HOLDED_ID_SQL = `
  SELECT 1
  FROM isaak_ledger_entries
  WHERE tenant_id = $1::uuid AND holded_id = $2
  LIMIT 1
`.trim();

export const INSERT_ENTRY_SQL = `
  INSERT INTO isaak_ledger_entries (
    tenant_id, entry_date, doc_number, doc_type,
    counterparty_nif, counterparty_name,
    amount, currency, tax_base, vat_rate, vat_amount,
    account_debit, account_credit,
    description, attachment_url,
    source_system, holded_id,
    hash, prev_hash,
    created_by
  ) VALUES (
    $1::uuid, $2::date, $3, $4,
    $5, $6,
    $7::numeric, $8, $9::numeric, $10::numeric, $11::numeric,
    $12, $13,
    $14, $15,
    $16, $17,
    $18, $19,
    $20
  )
  RETURNING id, hash, prev_hash AS "prevHash", sequence
`.trim();

// Read-only chain validation query: returns all entries for a tenant in
// sequence order so the application layer can re-validate the hash chain
// (audit purposes / health checks).
export function buildSelectChainSQL(): string {
  return `
    SELECT
      hash,
      prev_hash AS "prevHash",
      tenant_id AS "tenantId",
      to_char(entry_date, 'YYYY-MM-DD') AS "entryDate",
      doc_number AS "docNumber",
      doc_type AS "docType",
      counterparty_nif AS "counterpartyNif",
      counterparty_name AS "counterpartyName",
      amount::text AS "amount",
      currency,
      tax_base::text AS "taxBase",
      vat_rate::text AS "vatRate",
      vat_amount::text AS "vatAmount",
      account_debit AS "accountDebit",
      account_credit AS "accountCredit",
      description,
      source_system AS "sourceSystem"
    FROM isaak_ledger_entries
    WHERE tenant_id = $1::uuid
    ORDER BY sequence ASC
  `.trim();
}
