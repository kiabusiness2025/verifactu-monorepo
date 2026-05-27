// Loyverse POS ERP adapter.
// API docs: https://developer.loyverse.com/docs/
// Auth: Bearer token (OAuth 2.0 access token). Base URL: https://api.loyverse.com/v1.0/

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

// ── Loyverse API shapes ────────────────────────────────────────────────────────

type LvMoney = { amount: number; currency_code: string };

type LvLineItem = {
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  gross_total_money: LvMoney;
  total_money: LvMoney;
  tax_ids?: string[];
};

type LvReceipt = {
  receipt_number: string;
  receipt_date: string;
  source: string;
  order?: unknown;
  customer_id?: string | null;
  total_money: LvMoney;
  total_tax?: LvMoney;
  payments?: { name: string; amount: number }[];
  line_items: LvLineItem[];
  cancelled_at?: string | null;
};

type LvReceiptList = { receipts: LvReceipt[]; cursor?: string };

type LvCustomer = {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  customer_code?: string | null;
  note?: string | null;
  created_at: string;
};

type LvCustomerList = { customers: LvCustomer[]; cursor?: string };

type LvVariant = {
  variant_id: string;
  sku?: string | null;
  price?: number | null;
  stores?: { store_id: string; available_count?: number | null }[];
};

type LvItem = {
  id: string;
  item_name: string;
  handle?: string | null;
  reference_id?: string | null;
  category_id?: string | null;
  variants: LvVariant[];
  created_at: string;
};

type LvItemList = { items: LvItem[]; cursor?: string };

// ── Client ─────────────────────────────────────────────────────────────────────

export class LoyverseErpClient implements ErpClient {
  readonly provider = 'loyverse' as const;
  private readonly baseUrl = 'https://api.loyverse.com/v1.0';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        errors?: { details?: string }[];
      } | null;
      throw new Error(err?.errors?.[0]?.details ?? `Loyverse error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 250) };
    if (params?.from) query['receipt_date_min'] = params.from;
    if (params?.to) query['receipt_date_max'] = params.to;
    if (params?.contactId) query['customer_id'] = params.contactId;

    const data = await this.get<LvReceiptList>('/receipts', query);
    return data.receipts.map((r) => ({
      id: r.receipt_number,
      number: r.receipt_number,
      date: r.receipt_date,
      contactId: r.customer_id ?? '',
      contactName: '',
      subtotal: r.total_money.amount - (r.total_tax?.amount ?? 0),
      tax: r.total_tax?.amount ?? 0,
      total: r.total_money.amount,
      currency: r.total_money.currency_code,
      status: r.cancelled_at ? 'cancelled' : 'paid',
      type: 'invoice',
      lines: r.line_items.map((l) => ({
        description: l.item_name,
        quantity: l.quantity,
        unitPrice: l.price,
        taxRate: 0,
        total: l.total_money.amount,
      })),
    }));
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    const data = await this.get<LvReceiptList>('/receipts', { receipt_number: id });
    const r = data.receipts[0];
    if (!r) return null;
    return {
      id: r.receipt_number,
      number: r.receipt_number,
      date: r.receipt_date,
      contactId: r.customer_id ?? '',
      contactName: '',
      subtotal: r.total_money.amount - (r.total_tax?.amount ?? 0),
      tax: r.total_tax?.amount ?? 0,
      total: r.total_money.amount,
      currency: r.total_money.currency_code,
      status: r.cancelled_at ? 'cancelled' : 'paid',
      type: 'invoice',
      lines: r.line_items.map((l) => ({
        description: l.item_name,
        quantity: l.quantity,
        unitPrice: l.price,
        taxRate: 0,
        total: l.total_money.amount,
      })),
    };
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 250) };
    const data = await this.get<LvCustomerList>('/customers', query);
    return data.customers.map((c) => ({
      id: c.id,
      name: c.name,
      nif: c.customer_code ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone_number ?? undefined,
      type: 'client',
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 250) };
    const data = await this.get<LvItemList>('/items', query);
    return data.items.map((item) => {
      const firstVariant = item.variants[0];
      return {
        id: item.id,
        name: item.item_name,
        sku: firstVariant?.sku ?? item.reference_id ?? undefined,
        price: firstVariant?.price ?? 0,
        stock: firstVariant?.stores?.[0]?.available_count ?? undefined,
      };
    });
  }

  listAccountEntries(): Promise<ErpAccountEntry[]> {
    // Loyverse is a POS — no accounting ledger. Return empty.
    return Promise.resolve([]);
  }

  async getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot> {
    const [invoices, contacts, products] = await Promise.all([
      this.listInvoices({ from: params?.from, to: params?.to, limit: 500 }),
      this.listContacts({ limit: 500 }),
      this.listProducts({ limit: 500 }),
    ]);
    return {
      invoices,
      contacts,
      products,
      period: {
        from: params?.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: params?.to ?? new Date().toISOString(),
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}
