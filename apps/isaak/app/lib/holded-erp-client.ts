// Holded adapter for the generic ErpClient interface.
// Delegates to the low-level holded-api.ts functions; no new network logic here.

import {
  holdedGetChartOfAccounts,
  holdedGetDocument,
  holdedGetJournal,
  holdedListContacts,
  holdedListDocuments,
  holdedListProducts,
} from './holded-api';
import type {
  ErpAccountEntry,
  ErpClient,
  ErpContact,
  ErpInvoice,
  ErpInvoiceLine,
  ErpProduct,
  ErpSnapshot,
  ListContactsParams,
  ListInvoicesParams,
} from './erp-client';

// ─── Mappers ─────────────────────────────────────────────────────────────────

function unixToIso(value: unknown): string {
  if (typeof value === 'number' && value > 1e9) {
    return new Date(value * 1000).toISOString().split('T')[0];
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return new Date(Number(value) * 1000).toISOString().split('T')[0];
  }
  return String(value ?? '');
}

function mapInvoiceStatus(raw: unknown): ErpInvoice['status'] {
  switch (String(raw ?? '').toLowerCase()) {
    case 'draft':
      return 'draft';
    case 'sent':
      return 'sent';
    case 'paid':
      return 'paid';
    case 'overdue':
    case 'late':
      return 'overdue';
    case 'cancelled':
    case 'void':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

function mapDocType(raw: unknown): ErpInvoice['type'] {
  switch (String(raw ?? '').toLowerCase()) {
    case 'invoice':
    case 'salesreceipt':
      return 'invoice';
    case 'purchase':
    case 'purchaseorder':
    case 'purchaserefund':
      return 'purchase';
    case 'creditnote':
      return 'creditnote';
    case 'estimate':
      return 'estimate';
    default:
      return 'other';
  }
}

function mapLines(items: unknown): ErpInvoiceLine[] {
  if (!Array.isArray(items)) return [];
  return items.map((l: Record<string, unknown>) => ({
    description: String(l.name ?? l.description ?? ''),
    quantity: Number(l.units ?? l.quantity ?? 1),
    unitPrice: Number(l.price ?? l.unitPrice ?? 0),
    taxRate: Number(l.tax ?? l.taxRate ?? 0),
    total: Number(l.subtotal ?? l.total ?? 0),
  }));
}

function mapInvoice(raw: Record<string, unknown>, docType: string): ErpInvoice {
  const contact = (raw.contact ?? {}) as Record<string, unknown>;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    number: String(raw.docNumber ?? raw.number ?? ''),
    date: unixToIso(raw.date),
    dueDate: raw.dueDate ? unixToIso(raw.dueDate) : undefined,
    contactId: String(raw.contactId ?? contact.id ?? ''),
    contactName: String(contact.name ?? raw.contactName ?? ''),
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.tax ?? 0),
    total: Number(raw.total ?? 0),
    currency: String(raw.currency ?? 'EUR'),
    status: mapInvoiceStatus(raw.status),
    type: mapDocType(docType),
    lines: mapLines(raw.items),
  };
}

function mapContact(raw: Record<string, unknown>): ErpContact {
  const rawType = String(raw.type ?? '').toLowerCase();
  let type: ErpContact['type'] = 'other';
  if (rawType === 'client') type = 'client';
  else if (rawType === 'supplier') type = 'supplier';
  else if (rawType === 'debtor' || rawType === 'creditor') type = 'other';

  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    nif: raw.vatnumber ? String(raw.vatnumber) : undefined,
    email: raw.email ? String(raw.email) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    type,
    balance: raw.balance !== undefined ? Number(raw.balance) : undefined,
  };
}

function mapProduct(raw: Record<string, unknown>): ErpProduct {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    sku: raw.sku ? String(raw.sku) : undefined,
    price: Number(raw.price ?? 0),
    stock: raw.stock !== undefined ? Number(raw.stock) : undefined,
    taxRate: raw.tax !== undefined ? Number(raw.tax) : undefined,
  };
}

function mapEntry(raw: Record<string, unknown>): ErpAccountEntry {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    date: unixToIso(raw.date),
    description: String(raw.description ?? raw.concept ?? ''),
    account: String(raw.account ?? raw.accountCode ?? ''),
    debit: Number(raw.debit ?? 0),
    credit: Number(raw.credit ?? 0),
  };
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class HoldedErpClient implements ErpClient {
  readonly provider = 'holded' as const;

  constructor(private readonly apiKey: string) {}

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const docType =
      params?.type === 'purchase'
        ? 'purchase'
        : params?.type === 'creditnote'
          ? 'creditnote'
          : params?.type === 'estimate'
            ? 'estimate'
            : 'invoice';

    const result = await holdedListDocuments(this.apiKey, {
      docType,
      starttmp: params?.from,
      endtmp: params?.to,
      contactId: params?.contactId,
      limit: params?.limit ?? 50,
    });
    const docs = Array.isArray((result as { documents?: unknown[] }).documents)
      ? (result as { documents: Record<string, unknown>[] }).documents
      : [];
    return docs.map((d) => mapInvoice(d, docType));
  }

  async getInvoice(id: string, type?: ErpInvoice['type']): Promise<ErpInvoice | null> {
    const docType =
      type === 'purchase'
        ? 'purchase'
        : type === 'creditnote'
          ? 'creditnote'
          : type === 'estimate'
            ? 'estimate'
            : 'invoice';
    try {
      const raw = await holdedGetDocument(this.apiKey, docType, id);
      return mapInvoice(raw as Record<string, unknown>, docType);
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const result = await holdedListContacts(this.apiKey, {
      type:
        params?.type === 'client' ? 'client' : params?.type === 'supplier' ? 'supplier' : undefined,
      limit: params?.limit ?? 50,
    });
    const contacts = Array.isArray((result as { contacts?: unknown[] }).contacts)
      ? (result as { contacts: Record<string, unknown>[] }).contacts
      : [];
    return contacts.map(mapContact);
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const result = await holdedListProducts(this.apiKey, { limit: params?.limit ?? 50 });
    const products = Array.isArray((result as { products?: unknown[] }).products)
      ? (result as { products: Record<string, unknown>[] }).products
      : [];
    return products.map(mapProduct);
  }

  async listAccountEntries(params?: { from?: string; to?: string }): Promise<ErpAccountEntry[]> {
    const result = await holdedGetJournal(this.apiKey, {
      starttmp: params?.from,
      endtmp: params?.to,
    });
    const entries = Array.isArray((result as { entries?: unknown[] }).entries)
      ? (result as { entries: Record<string, unknown>[] }).entries
      : [];
    return entries.map(mapEntry);
  }

  async getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot> {
    const [invoices, contacts] = await Promise.all([
      this.listInvoices({ from: params?.from, to: params?.to, limit: 50 }),
      this.listContacts({ limit: 50 }),
    ]);

    return {
      invoices,
      contacts,
      period: {
        from:
          params?.from ?? new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0],
        to: params?.to ?? new Date().toISOString().split('T')[0],
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

// Convenience: expose the plan-of-accounts and treasury separately (no ErpClient mapping needed).
export async function holdedGetChartOfAccountsRaw(apiKey: string) {
  return holdedGetChartOfAccounts(apiKey);
}
