// F9 Isaak Ledger — hash chain helpers (puros, testeables sin Prisma).
//
// El hash de cada asiento se calcula determinísticamente sobre el
// contenido fiscalmente relevante + el hash del asiento anterior del
// mismo tenant. Cualquier mutación retroactiva rompe la cadena y se
// detecta por validateChain.
//
// La serialización es JSON con claves ordenadas alfabéticamente para
// que el hash sea estable y reproducible entre Node y otros runtimes.

import { createHash } from 'node:crypto';

export type LedgerHashInput = {
  tenantId: string;
  entryDate: string; // ISO date 'YYYY-MM-DD'
  docNumber: string | null;
  docType: string;
  counterpartyNif: string | null;
  counterpartyName: string | null;
  amount: string; // serialized decimal, e.g. '120.50'
  currency: string;
  taxBase: string | null;
  vatRate: string | null;
  vatAmount: string | null;
  accountDebit: string | null;
  accountCredit: string | null;
  description: string;
  sourceSystem: string;
  prevHash: string | null;
};

const HASH_HEX_LENGTH = 64;
const HASH_HEX_REGEX = /^[0-9a-f]{64}$/;

function canonicalize(input: LedgerHashInput): string {
  const keys = Object.keys(input).sort() as Array<keyof LedgerHashInput>;
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    ordered[k] = input[k];
  }
  return JSON.stringify(ordered);
}

export function computeEntryHash(input: LedgerHashInput): string {
  if (!input.tenantId) {
    throw new Error('computeEntryHash: tenantId required');
  }
  if (input.prevHash !== null && !HASH_HEX_REGEX.test(input.prevHash)) {
    throw new Error('computeEntryHash: prevHash must be 64 hex chars or null');
  }
  return createHash('sha256').update(canonicalize(input)).digest('hex');
}

export type ChainNode = {
  hash: string;
  prevHash: string | null;
  // The reconstructed input used to compute the hash, ordered by
  // sequence ascending. Validation re-hashes and asserts equality.
  input: LedgerHashInput;
};

export type ChainValidationResult =
  | { ok: true }
  | {
      ok: false;
      brokenAt: number; // index in the array
      reason: 'hash_mismatch' | 'prev_hash_mismatch' | 'genesis_must_have_null_prev';
    };

export function validateChain(nodes: ChainNode[]): ChainValidationResult {
  let expectedPrev: string | null = null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (i === 0 && node.prevHash !== null) {
      return { ok: false, brokenAt: i, reason: 'genesis_must_have_null_prev' };
    }
    if (node.prevHash !== expectedPrev) {
      return { ok: false, brokenAt: i, reason: 'prev_hash_mismatch' };
    }
    const recomputed = computeEntryHash({ ...node.input, prevHash: expectedPrev });
    if (recomputed !== node.hash) {
      return { ok: false, brokenAt: i, reason: 'hash_mismatch' };
    }
    if (!HASH_HEX_REGEX.test(node.hash) || node.hash.length !== HASH_HEX_LENGTH) {
      return { ok: false, brokenAt: i, reason: 'hash_mismatch' };
    }
    expectedPrev = node.hash;
  }
  return { ok: true };
}
