// WooCommerce ERP adapter.
// API docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
// Auth: Basic (Consumer Key as user, Consumer Secret as password). Base URL: {siteUrl}/wp-json/wc/v3/
// API key format stored: "https://mitienda.com::ck_xxx::cs_yyy"

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

// ── WooCommerce API shapes ─────────────────────────────────────────────────────

type WcBilling = {
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
  phone?: string;
};

type WcLineItem = {
  id: number;
  name: string;
  quantity: number;
  price: string;
  total: string;
  total_tax: string;
  sku?: string;
};

type WcOrder = {
  id: number;
  number: string;
  date_created: string;
  customer_id: number;
  billing: WcBilling;
  status: string;
  currency: string;
  total: string;
  total_tax: string;
  line_items: WcLineItem[];
};

type WcCustomer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing?: { company?: string; phone?: string };
};

type WcProduct = {
  id: number;
  name: string;
  sku?: string;
  price: string;
  stock_quantity?: number | null;
  tax_class?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapStatus(wc: string): ErpInvoice['status'] {
  switch (wc) {
    case 'completed':
      return 'paid';
    case 'processing':
      return 'sent';
    case 'pending':
    case 'on-hold':
      return 'draft';
    case 'cancelled':
    case 'failed':
    case 'trash':
    case 'refunded':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

function mapType(wc: string): ErpInvoice['type'] {
  return wc === 'refunded' ? 'creditnote' : 'invoice';
}

// ── Client ─────────────────────────────────────────────────────────────────────

export class WooCommerceErpClient implements ErpClient {
  readonly provider = 'woocommerce' as const;
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(apiKey: string) {
    // Format: "https://shop.com::ck_xxx::cs_yyy"
    const parts = apiKey.split('::');
    const shopUrl = parts[0]?.replace(/\/$/, '') ?? '';
    const consumerKey = parts[1] ?? '';
    const consumerSecret = parts[2] ?? '';
    this.baseUrl = `${shopUrl}/wp-json/wc/v3`;
    this.authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `WooCommerce error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { per_page: String(Math.min(params?.limit ?? 100, 100)) };
    if (params?.from) query['after'] = params.from;
    if (params?.to) query['before'] = params.to;
    if (params?.contactId) query['customer'] = params.contactId;
    if (params?.type === 'purchase') query['type'] = 'shop_order_refund';

    const orders = await this.get<WcOrder[]>('/orders', query);
    return orders.map((o) => {
      const contactName = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(' ');
      const total = parseFloat(o.total);
      const tax = parseFloat(o.total_tax);
      return {
        id: String(o.id),
        number: o.number,
        date: o.date_created,
        contactId: String(o.customer_id),
        contactName: contactName || o.billing.company || `Cliente ${o.customer_id}`,
        subtotal: total - tax,
        tax,
        total,
        currency: o.currency,
        status: mapStatus(o.status),
        type: mapType(o.status),
        lines: o.line_items.map((l) => ({
          description: l.name,
          quantity: l.quantity,
          unitPrice: parseFloat(l.price),
          taxRate: 0,
          total: parseFloat(l.total),
        })),
      };
    });
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    const o = await this.get<WcOrder>(`/orders/${id}`).catch(() => null);
    if (!o) return null;
    const contactName = [o.billing.first_name, o.billing.last_name].filter(Boolean).join(' ');
    const total = parseFloat(o.total);
    const tax = parseFloat(o.total_tax);
    return {
      id: String(o.id),
      number: o.number,
      date: o.date_created,
      contactId: String(o.customer_id),
      contactName: contactName || `Cliente ${o.customer_id}`,
      subtotal: total - tax,
      tax,
      total,
      currency: o.currency,
      status: mapStatus(o.status),
      type: 'invoice',
      lines: o.line_items.map((l) => ({
        description: l.name,
        quantity: l.quantity,
        unitPrice: parseFloat(l.price),
        taxRate: 0,
        total: parseFloat(l.total),
      })),
    };
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = {
      per_page: String(Math.min(params?.limit ?? 100, 100)),
    };
    const customers = await this.get<WcCustomer[]>('/customers', query);
    return customers.map((c) => ({
      id: String(c.id),
      name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username,
      email: c.email || undefined,
      phone: c.billing?.phone || undefined,
      type: 'client',
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = {
      per_page: String(Math.min(params?.limit ?? 100, 100)),
    };
    const products = await this.get<WcProduct[]>('/products', query);
    return products.map((p) => ({
      id: String(p.id),
      name: p.name,
      sku: p.sku || undefined,
      price: parseFloat(p.price) || 0,
      stock: p.stock_quantity ?? undefined,
    }));
  }

  listAccountEntries(): Promise<ErpAccountEntry[]> {
    // WooCommerce is an e-commerce platform — no accounting ledger. Return empty.
    return Promise.resolve([]);
  }

  async getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot> {
    const [invoices, contacts, products] = await Promise.all([
      this.listInvoices({ from: params?.from, to: params?.to, limit: 100 }),
      this.listContacts({ limit: 100 }),
      this.listProducts({ limit: 100 }),
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
