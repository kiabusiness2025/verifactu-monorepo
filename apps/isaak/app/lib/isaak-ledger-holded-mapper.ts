// F9 Isaak Ledger — Holded → AppendEntryInput mapper.
//
// Pure (no Prisma, no Holded fetch) so the unit tests can exercise edge
// cases (missing fields, sign conventions for credit notes / refunds,
// numeric formatting) without hitting the network.
//
// Sign convention: ledger amounts are stored as positive numbers; the
// docType encodes whether the entry increases or decreases tax base. A
// credit note that returns money to a client is still recorded as a
// positive amount with doc_type='invoice_out' (the fiscal sign is derived
// at report time, not at insertion time).

import type { AppendEntryInput, LedgerDocType, LedgerSourceSystem } from './isaak-ledger-sql';

// Holded API exposes these doc types via /api/invoicing/v1/documents/:type
// Source: holded-tools.ts enum, holded-erp-client.ts mapper.
export const HOLDED_DOC_TYPES = [
  'invoice',
  'salesreceipt',
  'creditnote',
  'estimate',
  'proforma',
  'purchase',
  'purchaseorder',
  'purchaserefund',
] as const;
export type HoldedDocType = (typeof HOLDED_DOC_TYPES)[number];

// Maps a Holded doc type to the ledger doc_type domain. Estimates,
// proformas and purchase orders are NOT contabilizable (they're not
// fiscal documents) → mapper returns null and the importer skips them.
const HOLDED_TO_LEDGER_DOC_TYPE: Record<HoldedDocType, LedgerDocType | null> = {
  invoice: 'invoice_out',
  salesreceipt: 'invoice_out',
  creditnote: 'invoice_out',
  purchase: 'invoice_in',
  purchaserefund: 'invoice_in',
  // Non-fiscal documents — explicitly null.
  estimate: null,
  proforma: null,
  purchaseorder: null,
};

export function ledgerDocTypeForHolded(holdedDocType: HoldedDocType): LedgerDocType | null {
  return HOLDED_TO_LEDGER_DOC_TYPE[holdedDocType];
}

// Holded returns dates as Unix timestamps (seconds, not milliseconds).
export function unixToIsoDate(unix: unknown): string | null {
  if (typeof unix !== 'number' || !Number.isFinite(unix) || unix <= 0) {
    return null;
  }
  // Treat as seconds. UTC date — the ledger entry_date is a calendar
  // date, not a timestamp, so timezone alignment to UTC is the canonical
  // representation independent of where the tenant operates.
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Holded returns amounts as JS numbers (subject to float drift on totals
// like 1.21 * 100 = 121.00000000000001). We coerce to a fixed-2 decimal
// string for the ledger to avoid carrying float noise into the hash.
export function toDecimalString(n: unknown): string | null {
  if (n === null || n === undefined) return null;
  if (typeof n === 'string') {
    if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
    return Number.parseFloat(n).toFixed(2);
  }
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return n.toFixed(2);
}

export type HoldedDocLike = {
  _id?: unknown;
  id?: unknown;
  docNumber?: unknown;
  number?: unknown;
  date?: unknown; // unix seconds
  contactId?: unknown;
  contactName?: unknown;
  contact?: { id?: unknown; name?: unknown; vatnumber?: unknown } | null;
  subtotal?: unknown;
  tax?: unknown;
  total?: unknown;
  currency?: unknown;
  description?: unknown;
  notes?: unknown;
};

export type MapResult = { ok: true; input: AppendEntryInput } | { ok: false; reason: string };

export function mapHoldedDocToAppendInput(args: {
  doc: HoldedDocLike;
  holdedDocType: HoldedDocType;
  tenantId: string;
  createdBy: string;
}): MapResult {
  const { doc, holdedDocType, tenantId, createdBy } = args;

  const ledgerDocType = ledgerDocTypeForHolded(holdedDocType);
  if (!ledgerDocType) {
    return { ok: false, reason: `non_fiscal_doc_type:${holdedDocType}` };
  }

  const holdedId = String(doc._id ?? doc.id ?? '').trim();
  if (!holdedId) {
    return { ok: false, reason: 'missing_holded_id' };
  }

  const entryDate = unixToIsoDate(doc.date);
  if (!entryDate) {
    return { ok: false, reason: 'invalid_date' };
  }

  const amount = toDecimalString(doc.total);
  if (!amount) {
    return { ok: false, reason: 'invalid_total' };
  }

  const taxBase = toDecimalString(doc.subtotal);
  const vatAmount = toDecimalString(doc.tax);

  const contactObj = (doc.contact ?? null) as {
    id?: unknown;
    name?: unknown;
    vatnumber?: unknown;
  } | null;
  const counterpartyName =
    (contactObj?.name ? String(contactObj.name).trim() : '') ||
    (typeof doc.contactName === 'string' ? doc.contactName.trim() : '') ||
    null;
  const counterpartyNif = contactObj?.vatnumber
    ? String(contactObj.vatnumber).trim() || null
    : null;

  const docNumber =
    (typeof doc.docNumber === 'string' && doc.docNumber.trim()) ||
    (typeof doc.number === 'string' && doc.number.trim()) ||
    null;

  const description =
    (typeof doc.description === 'string' && doc.description.trim()) ||
    (typeof doc.notes === 'string' && doc.notes.trim()) ||
    `Holded ${holdedDocType} ${docNumber ?? holdedId}`;

  const currencyRaw = typeof doc.currency === 'string' ? doc.currency.trim() : '';
  const currency = currencyRaw ? currencyRaw.toUpperCase() : 'EUR';

  const sourceSystem: LedgerSourceSystem = 'holded';

  // PGC 2007 inference — conservative defaults. The actual account
  // depends on the product/service category, which Holded doesn't
  // expose at the document level. Use these as starting points:
  //   invoice     → 430 Clientes / 700 Ventas mercaderías
  //   salesreceipt→ 572 Bancos   / 700 (cobro en el acto)
  //   creditnote  → 700          / 430 (abono al cliente, reverso)
  //   purchase    → 600 Compras  / 400 Proveedores
  //   purchaserefund → 400       / 600 (devolución, reverso)
  const PGC_BY_HOLDED_DOC: Record<HoldedDocType, { debit: string; credit: string } | null> = {
    invoice: { debit: '430', credit: '700' },
    salesreceipt: { debit: '572', credit: '700' },
    creditnote: { debit: '700', credit: '430' },
    purchase: { debit: '600', credit: '400' },
    purchaserefund: { debit: '400', credit: '600' },
    // Non-fiscal — never reach this path (filtered above).
    estimate: null,
    proforma: null,
    purchaseorder: null,
  };
  const pgc = PGC_BY_HOLDED_DOC[holdedDocType];

  return {
    ok: true,
    input: {
      tenantId,
      entryDate,
      docType: ledgerDocType,
      docNumber,
      counterpartyNif,
      counterpartyName,
      amount,
      currency,
      taxBase,
      vatRate: null, // Holded returns total tax amount, not the rate.
      vatAmount,
      accountDebit: pgc?.debit ?? null,
      accountCredit: pgc?.credit ?? null,
      description,
      sourceSystem,
      holdedId,
      attachmentUrl: null,
      createdBy,
    },
  };
}
