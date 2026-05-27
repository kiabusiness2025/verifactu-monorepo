// F9 Isaak Ledger — idempotent Holded → Ledger importer.
//
// Pulls documents from Holded (one doc_type at a time) and inserts ledger
// entries for any that don't already exist in the tenant's ledger (keyed
// by holded_id). Safe to re-run; existing entries are skipped, not
// re-written (which would also break the hash chain).
//
// Designed as a background job (cron) and also as the backend of an LLM
// tool that the gestion sub-agent can invoke on demand. Per-call cap
// avoids runaway costs.

import { holdedListDocuments } from './holded-api';
import { appendLedgerEntry } from './isaak-ledger-repo';
import {
  mapHoldedDocToAppendInput,
  type HoldedDocLike,
  type HoldedDocType,
} from './isaak-ledger-holded-mapper';
import { prisma } from './prisma';
import { EXISTS_BY_HOLDED_ID_SQL } from './isaak-ledger-sql';

export type ImportHoldedToLedgerInput = {
  tenantId: string;
  apiKey: string;
  docTypes: HoldedDocType[];
  // ISO date strings; if omitted the Holded API uses its default range
  // (~last 6 months for invoicing endpoints).
  from?: string;
  to?: string;
  // Per-docType cap. Holded itself paginates; this is a safety net.
  limitPerDocType?: number;
  createdBy?: string;
};

export type ImportHoldedToLedgerResult = {
  imported: number;
  skipped: number;
  errors: Array<{
    docType: HoldedDocType;
    holdedId: string | null;
    reason: string;
  }>;
  perDocType: Record<string, { imported: number; skipped: number; errors: number }>;
};

const DEFAULT_LIMIT_PER_DOC_TYPE = 100;
const HARD_CAP_PER_DOC_TYPE = 500;

async function ledgerEntryExistsForHoldedId(
  tenantId: string,
  holdedId: string
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ '?column?': number }>>(
    EXISTS_BY_HOLDED_ID_SQL,
    tenantId,
    holdedId
  );
  return rows.length > 0;
}

export async function importHoldedToLedger(
  input: ImportHoldedToLedgerInput
): Promise<ImportHoldedToLedgerResult> {
  if (!input.tenantId) throw new Error('importHoldedToLedger: tenantId required');
  if (!input.apiKey) throw new Error('importHoldedToLedger: apiKey required');
  if (!Array.isArray(input.docTypes) || input.docTypes.length === 0) {
    throw new Error('importHoldedToLedger: docTypes required');
  }

  const limit = Math.max(
    1,
    Math.min(HARD_CAP_PER_DOC_TYPE, input.limitPerDocType ?? DEFAULT_LIMIT_PER_DOC_TYPE)
  );
  const createdBy = input.createdBy?.trim() || 'isaak-auto';

  const result: ImportHoldedToLedgerResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    perDocType: {},
  };

  for (const docType of input.docTypes) {
    const stats = { imported: 0, skipped: 0, errors: 0 };
    result.perDocType[docType] = stats;

    let holdedResp: { documents: unknown[]; total: number; truncated: boolean };
    try {
      holdedResp = await holdedListDocuments(input.apiKey, {
        docType,
        starttmp: input.from,
        endtmp: input.to,
        limit,
      });
    } catch (err) {
      stats.errors++;
      result.errors.push({
        docType,
        holdedId: null,
        reason: `holded_fetch_failed:${(err as Error).message}`,
      });
      continue;
    }

    for (const rawDoc of holdedResp.documents) {
      const doc = rawDoc as HoldedDocLike;
      const holdedId = String(doc._id ?? doc.id ?? '').trim() || null;

      try {
        const mapped = mapHoldedDocToAppendInput({
          doc,
          holdedDocType: docType,
          tenantId: input.tenantId,
          createdBy,
        });
        if (!mapped.ok) {
          // Non-fiscal types are an expected skip, not an error.
          if (mapped.reason.startsWith('non_fiscal_doc_type')) {
            stats.skipped++;
            result.skipped++;
            continue;
          }
          stats.errors++;
          result.errors.push({ docType, holdedId, reason: mapped.reason });
          continue;
        }

        if (holdedId && (await ledgerEntryExistsForHoldedId(input.tenantId, holdedId))) {
          stats.skipped++;
          result.skipped++;
          continue;
        }

        await appendLedgerEntry(mapped.input);
        stats.imported++;
        result.imported++;
      } catch (err) {
        stats.errors++;
        result.errors.push({
          docType,
          holdedId,
          reason: `append_failed:${(err as Error).message}`,
        });
      }
    }
  }

  return result;
}
