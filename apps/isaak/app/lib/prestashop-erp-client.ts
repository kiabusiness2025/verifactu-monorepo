// PrestaShop ERP adapter.
// API docs: https://devdocs.prestashop-project.org/8/webservice/
// Auth: API key as Basic auth username (password empty).
// Stored credential format: "https://shop.com::apiKey" (split at "::").
// Output format: JSON (output_format=JSON query param).

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

// ── PrestaShop API shapes ──────────────────────────────────────────────────────

type PsOrder = {
  id: number;
  reference: string;
  date_add: string;
  date_upd?: string;
  id_customer: number | string;
  total_paid_tax_incl: string;
  total_paid_tax_excl: string;
  total_shipping_tax_excl?: string;
  current_state: number | string;
  invoice_date?: string;
  associations?: {
    order_rows?: {
      product_id: string;
      product_name: string;
      product_quantity: string;
      unit_price_tax_excl: string;
    }[];
  };
};

type PsCustomer = {
  id: number;
  firstname: string;
  lastname: string;
  company?: string;
  email: string;
  siret?: string;
  id_default_group?: number | string;
};

type PsProduct = {
  id: number;
  name:
    | string
    | {
        language:
          | { $: { id: string }; _: string }
          | { language: { $: { id: string }; _: string }[] };
      };
  reference?: string;
  price: string;
  id_tax_rules_group?: number | string;
  associations?: {
    stock_availables?: { id: string; id_product_attribute: string }[];
  };
};

type PsWrapperList<T> = { prestashop: { [key: string]: T[] } };
type PsWrapperSingle<T> = { prestashop: { [key: string]: T } };

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractName(name: PsProduct['name']): string {
  if (typeof name === 'string') return name;
  // PrestaShop language object: { language: { _: 'text' } } or array
  const lang = (name as { language: unknown }).language;
  if (Array.isArray(lang)) return (lang[0] as { _: string })._ ?? '';
  return (lang as { _: string })._ ?? '';
}

// Map PrestaShop order state IDs to our status values.
// Default state IDs: 1=Awaiting check, 2=Payment accepted, 3=Processing, 4=Shipped,
// 5=Delivered, 6=Cancelled, 7=Refund, 8=Error payment, 9=On backorder
function mapOrderState(stateId: number | string): ErpInvoice['status'] {
  const id = Number(stateId);
  if ([2, 4, 5, 12].includes(id)) return 'paid';
  if ([1, 3, 10, 11, 13].includes(id)) return 'sent';
  if ([6, 8].includes(id)) return 'cancelled';
  if ([7].includes(id)) return 'cancelled';
  return 'unknown';
}

// ── Client ─────────────────────────────────────────────────────────────────────

export class PrestaShopErpClient implements ErpClient {
  readonly provider = 'prestashop' as const;
  private readonly shopUrl: string;
  private readonly apiKey: string;
  private readonly authHeader: string;

  constructor(apiKey: string) {
    // Stored as "https://shop.com::apiKey"
    const sep = apiKey.indexOf('::');
    if (sep === -1) {
      this.shopUrl = '';
      this.apiKey = apiKey;
    } else {
      this.shopUrl = apiKey.slice(0, sep).replace(/\/$/, '');
      this.apiKey = apiKey.slice(sep + 2);
    }
    this.authHeader = `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  private async get<T>(resource: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.shopUrl}/api/${resource}`);
    url.searchParams.set('output_format', 'JSON');
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.authHeader },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`PrestaShop error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100), display: 'full' };
    if (params?.from) query['filter[date_add]'] = `>[${params.from.slice(0, 10)}]`;
    if (params?.to) query['filter[date_add]'] += `<[${params.to.slice(0, 10)}]`;
    if (params?.contactId) query['filter[id_customer]'] = `[${params.contactId}]`;

    const data = await this.get<PsWrapperList<PsOrder>>('orders', query);
    const orders = Object.values(data.prestashop)[0] ?? [];
    return orders.map((o) => {
      const total = parseFloat(o.total_paid_tax_incl) || 0;
      const subtotal = parseFloat(o.total_paid_tax_excl) || 0;
      const tax = total - subtotal;
      const lines =
        o.associations?.order_rows?.map((r) => ({
          description: r.product_name,
          quantity: Number(r.product_quantity),
          unitPrice: parseFloat(r.unit_price_tax_excl) || 0,
          taxRate: 0,
          total: (parseFloat(r.unit_price_tax_excl) || 0) * Number(r.product_quantity),
        })) ?? [];
      return {
        id: String(o.id),
        number: o.reference,
        date: o.date_add,
        dueDate: undefined,
        contactId: String(o.id_customer),
        contactName: '',
        subtotal,
        tax,
        total,
        currency: 'EUR',
        status: mapOrderState(o.current_state),
        type: 'invoice' as const,
        lines,
      };
    });
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    try {
      const data = await this.get<PsWrapperSingle<PsOrder>>(`orders/${id}`, { display: 'full' });
      const o = Object.values(data.prestashop)[0] as PsOrder;
      if (!o) return null;
      const total = parseFloat(o.total_paid_tax_incl) || 0;
      const subtotal = parseFloat(o.total_paid_tax_excl) || 0;
      const tax = total - subtotal;
      const lines =
        o.associations?.order_rows?.map((r) => ({
          description: r.product_name,
          quantity: Number(r.product_quantity),
          unitPrice: parseFloat(r.unit_price_tax_excl) || 0,
          taxRate: 0,
          total: (parseFloat(r.unit_price_tax_excl) || 0) * Number(r.product_quantity),
        })) ?? [];
      return {
        id: String(o.id),
        number: o.reference,
        date: o.date_add,
        contactId: String(o.id_customer),
        contactName: '',
        subtotal,
        tax,
        total,
        currency: 'EUR',
        status: mapOrderState(o.current_state),
        type: 'invoice' as const,
        lines,
      };
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 200), display: 'full' };
    const data = await this.get<PsWrapperList<PsCustomer>>('customers', query);
    const customers = Object.values(data.prestashop)[0] ?? [];
    return customers.map((c) => ({
      id: String(c.id),
      name: [c.firstname, c.lastname].filter(Boolean).join(' ') || c.company || `Customer ${c.id}`,
      nif: c.siret || undefined,
      email: c.email || undefined,
      type: 'client' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 200),
      display: 'full',
    };
    const data = await this.get<PsWrapperList<PsProduct>>('products', query);
    const products = Object.values(data.prestashop)[0] ?? [];
    return products.map((p) => ({
      id: String(p.id),
      name: extractName(p.name),
      sku: p.reference || undefined,
      price: parseFloat(p.price) || 0,
    }));
  }

  // PrestaShop does not expose accounting entries via webservice.
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
