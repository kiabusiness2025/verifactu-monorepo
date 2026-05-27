// F9 Isaak Ledger — repository: atomic append with hash chain.
//
// appendEntry() guarantees: within a single tenant, every new entry's
// prev_hash equals the hash of the most recent entry (by sequence DESC) at
// the moment of insertion. Concurrent appends for the same tenant are
// serialized via a Postgres advisory lock keyed on tenant_id; appends for
// different tenants run in parallel.
//
// The unique constraint (tenant_id, hash) is the final safety net: even if
// two transactions raced past the advisory lock somehow, a colliding hash
// would fail at the DB layer rather than silently corrupting the chain.

import { prisma } from './prisma';
import { computeEntryHash, validateChain, type LedgerHashInput } from './isaak-ledger-hash';
import {
  ADVISORY_LOCK_SQL,
  INSERT_ENTRY_SQL,
  SELECT_LATEST_ENTRY_SQL,
  buildSelectChainSQL,
  normalizeAppendInput,
  toHashInput,
  type AppendEntryInput,
} from './isaak-ledger-sql';

export type AppendEntryResult = {
  id: string;
  hash: string;
  prevHash: string | null;
  sequence: bigint;
};

export async function appendLedgerEntry(
  input: AppendEntryInput
): Promise<AppendEntryResult> {
  const normalized = normalizeAppendInput(input);

  return prisma.$transaction(async (tx) => {
    // Serialize concurrent appends for the same tenant. Released on commit.
    await tx.$queryRawUnsafe(ADVISORY_LOCK_SQL, normalized.tenantId);

    const latestRows = await tx.$queryRawUnsafe<
      Array<{ hash: string; sequence: bigint }>
    >(SELECT_LATEST_ENTRY_SQL, normalized.tenantId);

    const prevHash = latestRows[0]?.hash ?? null;
    const hash = computeEntryHash(toHashInput(normalized, prevHash));

    const inserted = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        hash: string;
        prevHash: string | null;
        sequence: bigint;
      }>
    >(
      INSERT_ENTRY_SQL,
      normalized.tenantId,
      normalized.entryDate,
      normalized.docNumber,
      normalized.docType,
      normalized.counterpartyNif,
      normalized.counterpartyName,
      normalized.amount,
      normalized.currency,
      normalized.taxBase,
      normalized.vatRate,
      normalized.vatAmount,
      normalized.accountDebit,
      normalized.accountCredit,
      normalized.description,
      normalized.attachmentUrl,
      normalized.sourceSystem,
      normalized.holdedId,
      hash,
      prevHash,
      normalized.createdBy
    );

    const row = inserted[0];
    if (!row) {
      throw new Error('appendLedgerEntry: insert returned no rows');
    }
    return {
      id: row.id,
      hash: row.hash,
      prevHash: row.prevHash,
      sequence: row.sequence,
    };
  });
}

export type LedgerChainHealthResult =
  | { ok: true; entryCount: number }
  | {
      ok: false;
      entryCount: number;
      brokenAt: number;
      reason: 'hash_mismatch' | 'prev_hash_mismatch' | 'genesis_must_have_null_prev';
    };

// Re-validates the entire hash chain for a tenant. Intended for periodic
// audits or admin-triggered integrity checks, not the chat hot path.
export async function validateTenantLedgerChain(
  tenantId: string
): Promise<LedgerChainHealthResult> {
  const sql = buildSelectChainSQL();
  type Row = LedgerHashInput & { hash: string };
  const rows = await prisma.$queryRawUnsafe<Row[]>(sql, tenantId);

  const chain = rows.map((r) => ({
    hash: r.hash,
    prevHash: r.prevHash,
    input: {
      tenantId: r.tenantId,
      entryDate: r.entryDate,
      docNumber: r.docNumber,
      docType: r.docType,
      counterpartyNif: r.counterpartyNif,
      counterpartyName: r.counterpartyName,
      amount: r.amount,
      currency: r.currency,
      taxBase: r.taxBase,
      vatRate: r.vatRate,
      vatAmount: r.vatAmount,
      accountDebit: r.accountDebit,
      accountCredit: r.accountCredit,
      description: r.description,
      sourceSystem: r.sourceSystem,
      prevHash: r.prevHash,
    },
  }));

  const result = validateChain(chain);
  if (result.ok) {
    return { ok: true, entryCount: chain.length };
  }
  return {
    ok: false,
    entryCount: chain.length,
    brokenAt: result.brokenAt,
    reason: result.reason,
  };
}
