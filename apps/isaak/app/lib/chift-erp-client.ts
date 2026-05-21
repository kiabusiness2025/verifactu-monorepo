// Chift unified accounting adapter — covers Sage, Xero, QuickBooks, Cegid, and 40+ ERPs.
// Implements ErpClient via Chift's /consumers/{id}/accounting/* endpoints.

import { chiftGet } from './chift-client';
import type {
  ErpAccountEntry,
  ErpClient,
  ErpContact,
  ErpInvoice,
  ErpProduct,
  ErpSnapshot,
  ListContactsParams,
  ListInvoicesParams,
} from './erp-client';

// --- Chift response types (snake_case) ---

type ChiftInvoice = {
  id: string;
  number?: string;
  date?: string;
  due_date?: string;
  partner?: { id?: string; name?: string };
  currency?: string;
  total_amount?: number;
  tax_amount?: number;
  untaxed_amount?: number;
  status?: string;
  lines?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    tax_rate?: number;
    total?: number;
  }>;
};

type ChiftClient = {
  id: string;
  name?: string;
  vat_number?: string;
  email?: string;
  phone?: string;
  type?: string;
  balance?: number;
};

type ChiftJournalEntry = {
  id: string;
  date?: string;
  description?: string;
  account?: { code?: string; name?: string };
  debit?: number;
  credit?: number;
};

// --- Mappers ---

function mapStatus(s?: string): ErpInvoice['status'] {
  if (!s) return 'unknown';
  const l = s.toLowerCase();
  if (l.includes('draft')) return 'draft';
  if (l.includes('sent') || l.includes('posted') || l.includes('open')) return 'sent';
  if (l.includes('paid') || l.includes('done')) return 'paid';
  if (l.includes('overdue')) return 'overdue';
  if (l.includes('cancel')) return 'cancelled';
  return 'unknown';
}

function mapInvoice(raw: ChiftInvoice, type: ErpInvoice['type']): ErpInvoice {
  return {
    id: raw.id,
    number: raw.number ?? raw.id,
    date: raw.date ?? '',
    dueDate: raw.due_date,
    contactId: raw.partner?.id ?? '',
    contactName: raw.partner?.name ?? '',
    subtotal: raw.untaxed_amount ?? 0,
    tax: raw.tax_amount ?? 0,
    total: raw.total_amount ?? 0,
    currency: raw.currency ?? 'EUR',
    status: mapStatus(raw.status),
    type,
    lines: (raw.lines ?? []).map((l) => ({
      description: l.description ?? '',
      quantity: l.quantity ?? 1,
      unitPrice: l.unit_price ?? 0,
      taxRate: l.tax_rate ?? 0,
      total: l.total ?? 0,
    })),
  };
}

// --- Client ---

export class ChiftErpClient implements ErpClient {
  readonly provider = 'chift' as const;

  constructor(private readonly consumerId: string) {}

  async listInvoices(params: ListInvoicesParams = {}): Promise<ErpInvoice[]> {
    const chiftType = params.type === 'purchase' ? 'purchase' : 'sale';
    const erpType: ErpInvoice['type'] = chiftType === 'purchase' ? 'purchase' : 'invoice';

    const qp: Record<string, string> = {};
    if (params.from) qp['date_from'] = params.from;
    if (params.to) qp['date_to'] = params.to;
    if (params.limit) qp['limit'] = String(params.limit);

    const data = await chiftGet<ChiftInvoice[]>(
      `/consumers/${this.consumerId}/accounting/invoices/type/${chiftType}`,
      this.consumerId,
      Object.keys(qp).length ? qp : undefined
    );
    return (Array.isArray(data) ? data : []).map((r) => mapInvoice(r, erpType));
  }

  async getInvoice(id: string, type: ErpInvoice['type'] = 'invoice'): Promise<ErpInvoice | null> {
    try {
      const data = await chiftGet<ChiftInvoice>(
        `/consumers/${this.consumerId}/accounting/invoices/${id}`,
        this.consumerId
      );
      return mapInvoice(data, type);
    } catch {
      return null;
    }
  }

  async listContacts(_params: ListContactsParams = {}): Promise<ErpContact[]> {
    const data = await chiftGet<ChiftClient[]>(
      `/consumers/${this.consumerId}/accounting/clients`,
      this.consumerId
    );
    return (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id,
      name: c.name ?? '',
      nif: c.vat_number,
      email: c.email,
      phone: c.phone,
      type: 'client' as const,
      balance: c.balance,
    }));
  }

  async listProducts(): Promise<ErpProduct[]> {
    // Chift accounting domain has no dedicated products endpoint.
    return [];
  }

  async listAccountEntries(
    params: { from?: string; to?: string; account?: string } = {}
  ): Promise<ErpAccountEntry[]> {
    const qp: Record<string, string> = {};
    if (params.from) qp['date_from'] = params.from;
    if (params.to) qp['date_to'] = params.to;

    const data = await chiftGet<ChiftJournalEntry[]>(
      `/consumers/${this.consumerId}/accounting/journal/entries`,
      this.consumerId,
      Object.keys(qp).length ? qp : undefined
    );
    return (Array.isArray(data) ? data : []).map((e) => ({
      id: e.id,
      date: e.date ?? '',
      description: e.description ?? '',
      account: e.account?.code ?? e.account?.name ?? '',
      debit: e.debit ?? 0,
      credit: e.credit ?? 0,
    }));
  }

  async getSnapshot(params: { from?: string; to?: string } = {}): Promise<ErpSnapshot> {
    const now = new Date();
    const from =
      params.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const to = params.to ?? now.toISOString().slice(0, 10);

    const [invoicesRes, contactsRes, entriesRes] = await Promise.allSettled([
      this.listInvoices({ from, to }),
      this.listContacts(),
      this.listAccountEntries({ from, to }),
    ]);

    return {
      invoices: invoicesRes.status === 'fulfilled' ? invoicesRes.value : [],
      contacts: contactsRes.status === 'fulfilled' ? contactsRes.value : [],
      entries: entriesRes.status === 'fulfilled' ? entriesRes.value : [],
      period: { from, to },
      fetchedAt: now.toISOString(),
    };
  }
}
