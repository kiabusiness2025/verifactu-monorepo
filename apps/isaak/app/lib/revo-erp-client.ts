// Revo XEF ERP adapter — restaurant/hospitality POS.
// API docs: https://developer.revo.works (requires Revo account).
// Auth: Bearer token (X-Revo-Token header). Base URL: https://revoxef.works/api/external/v1/

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

// ── Revo XEF API shapes ────────────────────────────────────────────────────────

type RvOrder = {
  id: number;
  ref?: string | null;
  created?: string;
  openedAt?: string;
  closedAt?: string | null;
  customer?: { id: number; name?: string } | null;
  subtotal?: number | string;
  taxes?: number | string;
  total?: number | string;
  status?: string;
  orderLines?: RvOrderLine[];
};

type RvOrderLine = {
  id?: number;
  name: string;
  quantity: number | string;
  price?: number | string;
  tax?: number | string;
};

type RvCustomer = {
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
};

type RvItem = {
  id: number;
  name: string;
  price?: number | string | null;
  externalId?: string | null;
  groupId?: number | null;
};

type RvPage<T> = { data: T[]; meta?: { total?: number; lastPage?: number } };

// ── Client ─────────────────────────────────────────────────────────────────────

export class RevoErpClient implements ErpClient {
  readonly provider = 'revo' as const;
  private readonly baseUrl = 'https://revoxef.works/api/external/v1';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        'X-Revo-Token': this.apiKey,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `Revo XEF error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s?: string): ErpInvoice['status'] {
    if (!s) return 'unknown';
    const lower = s.toLowerCase();
    if (lower === 'closed' || lower === 'paid') return 'paid';
    if (lower === 'open' || lower === 'pending') return 'sent';
    if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
    return 'unknown';
  }

  private mapOrder(o: RvOrder): ErpInvoice {
    const total = Number(o.total ?? 0);
    const subtotal = Number(o.subtotal ?? 0);
    const tax = Number(o.taxes ?? total - subtotal);
    const lines: ErpInvoiceLine[] = (o.orderLines ?? []).map((l) => ({
      description: l.name,
      quantity: Number(l.quantity),
      unitPrice: Number(l.price ?? 0),
      taxRate: 0,
      total: Number(l.quantity) * Number(l.price ?? 0),
    }));
    return {
      id: String(o.id),
      number: o.ref ?? String(o.id),
      date: o.closedAt ?? o.openedAt ?? o.created ?? '',
      contactId: String(o.customer?.id ?? ''),
      contactName: o.customer?.name ?? '',
      subtotal,
      tax,
      total,
      currency: 'EUR',
      status: this.mapStatus(o.status),
      type: 'invoice' as const,
      lines,
    };
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { perPage: String(params?.limit ?? 100) };
    if (params?.from) query['from'] = params.from.slice(0, 10);
    if (params?.to) query['to'] = params.to.slice(0, 10);
    if (params?.contactId) query['customerId'] = params.contactId;

    const data = await this.get<RvPage<RvOrder>>('orders', query);
    return (data.data ?? []).map((o) => this.mapOrder(o));
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    try {
      const data = await this.get<{ data: RvOrder }>(`orders/${id}`);
      return data.data ? this.mapOrder(data.data) : null;
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { perPage: String(params?.limit ?? 200) };
    const data = await this.get<RvPage<RvCustomer>>('customers', query);
    return (data.data ?? []).map((c) => ({
      id: String(c.id),
      name: c.name ?? `Customer ${c.id}`,
      nif: c.taxId ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      type: 'client' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { perPage: String(params?.limit ?? 200) };
    const data = await this.get<RvPage<RvItem>>('catalog/items', query);
    return (data.data ?? []).map((item) => ({
      id: String(item.id),
      name: item.name,
      sku: item.externalId ?? undefined,
      price: Number(item.price ?? 0),
    }));
  }

  // Revo XEF is a POS — no accounting entries.
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    return Promise.resolve([]);
  }

  async getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot> {
    const [invoices, contacts, products] = await Promise.all([
      this.listInvoices({ from: params?.from, to: params?.to, limit: 100 }),
      this.listContacts({ limit: 200 }),
      this.listProducts({ limit: 200 }),
    ]);
    const now = new Date().toISOString();
    return {
      invoices,
      contacts,
      products,
      period: {
        from: params?.from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        to: params?.to ?? now,
      },
      fetchedAt: now,
    };
  }
}
