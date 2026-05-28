// Inmovilla ERP adapter — CRM para agencias inmobiliarias.
// API docs: https://api.inmovilla.com/v1/documentation
// Auth: header Api-Authorization: <apiKey>
// Base URL: https://api.inmovilla.com/v1/
//
// Mapeo de entidades al contrato ErpClient:
//   inmuebles (properties)  → ErpProduct  (id, nombre, precio, referencia)
//   contactos (contacts)    → ErpContact  (propietarios, compradores, arrendadores)
//   operaciones (operations)→ ErpInvoice  (compraventas y alquileres cerrados)

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

// ── Inmovilla API shapes ───────────────────────────────────────────────────────

type ImProperty = {
  id: number | string;
  ref?: string | null;
  title?: string | null;
  type?: string | null;
  price?: number | string | null;
  province?: string | null;
  municipality?: string | null;
  status?: string | null;
  surface?: number | string | null;
  rooms?: number | null;
};

type ImContact = {
  id: number | string;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  nif?: string | null;
  type?: string | null;
};

type ImOperation = {
  id: number | string;
  ref?: string | null;
  date?: string | null;
  closing_date?: string | null;
  contact_id?: number | string | null;
  contact_name?: string | null;
  property_id?: number | string | null;
  type?: string | null;
  amount?: number | string | null;
  commission?: number | string | null;
  status?: string | null;
};

type ImList<T> = {
  data?: T[];
  total?: number;
  page?: number;
  per_page?: number;
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class InmovillaErpClient implements ErpClient {
  readonly provider = 'inmovilla' as const;
  private readonly baseUrl = 'https://api.inmovilla.com/v1';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        'Api-Authorization': this.apiKey,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `Inmovilla API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private contactFullName(c: ImContact): string {
    const parts = [c.name, c.surname].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : `Contacto ${c.id}`;
  }

  private mapOperationStatus(s?: string | null): ErpInvoice['status'] {
    if (!s) return 'unknown';
    const l = s.toLowerCase();
    if (l === 'closed' || l === 'cerrada' || l === 'firmada') return 'paid';
    if (l === 'active' || l === 'activa' || l === 'en_curso') return 'sent';
    if (l === 'cancelled' || l === 'cancelada') return 'cancelled';
    return 'unknown';
  }

  private mapOperation(op: ImOperation): ErpInvoice {
    const total = Number(op.amount ?? 0);
    const lines: ErpInvoiceLine[] =
      total > 0
        ? [
            {
              description: op.type ?? 'Operación inmobiliaria',
              quantity: 1,
              unitPrice: total,
              taxRate: 0,
              total,
            },
          ]
        : [];
    return {
      id: String(op.id),
      number: op.ref ?? String(op.id),
      date: op.closing_date ?? op.date ?? '',
      contactId: String(op.contact_id ?? ''),
      contactName: op.contact_name ?? '',
      subtotal: total,
      tax: 0,
      total,
      currency: 'EUR',
      status: this.mapOperationStatus(op.status),
      type: 'invoice' as const,
      lines,
    };
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 100) };
    if (params?.from) query['date_from'] = params.from.slice(0, 10);
    if (params?.to) query['date_to'] = params.to.slice(0, 10);
    if (params?.contactId) query['contact_id'] = params.contactId;

    const data = await this.get<ImList<ImOperation>>('operations', query);
    return (data.data ?? []).map((op) => this.mapOperation(op));
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    try {
      const data = await this.get<{ data: ImOperation }>(`operations/${id}`);
      return data.data ? this.mapOperation(data.data) : null;
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 200) };
    const data = await this.get<ImList<ImContact>>('contacts', query);
    return (data.data ?? []).map((c) => ({
      id: String(c.id),
      name: this.contactFullName(c),
      nif: c.nif ?? undefined,
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      type: 'other' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 200) };
    const data = await this.get<ImList<ImProperty>>('properties', query);
    return (data.data ?? []).map((p) => ({
      id: String(p.id),
      name: p.title ?? `Inmueble ${p.ref ?? p.id}`,
      sku: p.ref ?? undefined,
      price: Number(p.price ?? 0),
      stock: 1,
    }));
  }

  // No accounting entries in Inmovilla.
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
