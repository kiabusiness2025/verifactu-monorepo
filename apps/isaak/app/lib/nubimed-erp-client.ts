// Nubimed ERP adapter — software de gestión para clínicas y consultas dentales.
// API docs: https://www.nubimed.com/integraciones/api
// Auth: Bearer <apiKey>  (header Authorization)
// Base URL: https://app.nubimed.com/api/v1/
//
// Mapeo de entidades al contrato ErpClient:
//   pacientes (patients)   → ErpContact
//   facturas (invoices)    → ErpInvoice
//   servicios (services)   → ErpProduct  (tarifas de tratamientos)

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

// ── Nubimed API shapes ─────────────────────────────────────────────────────────

type NbPatient = {
  id: number | string;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  nif?: string | null;
  birthdate?: string | null;
};

type NbInvoiceLine = {
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  tax_rate?: number | string | null;
  total?: number | string | null;
};

type NbInvoice = {
  id: number | string;
  number?: string | null;
  date?: string | null;
  due_date?: string | null;
  patient_id?: number | string | null;
  patient_name?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  status?: string | null;
  lines?: NbInvoiceLine[];
};

type NbService = {
  id: number | string;
  name?: string | null;
  code?: string | null;
  price?: number | string | null;
  tax_rate?: number | string | null;
};

type NbList<T> = {
  data?: T[];
  meta?: { total?: number; current_page?: number; per_page?: number };
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class NubimedErpClient implements ErpClient {
  readonly provider = 'nubimed' as const;
  private readonly baseUrl = 'https://app.nubimed.com/api/v1';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `Nubimed API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private patientFullName(p: NbPatient): string {
    const parts = [p.name, p.surname].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : `Paciente ${p.id}`;
  }

  private mapInvoiceStatus(s?: string | null): ErpInvoice['status'] {
    if (!s) return 'unknown';
    const l = s.toLowerCase();
    if (l === 'paid' || l === 'pagada' || l === 'cobrada') return 'paid';
    if (l === 'sent' || l === 'emitida' || l === 'pendiente') return 'sent';
    if (l === 'overdue' || l === 'vencida') return 'overdue';
    if (l === 'cancelled' || l === 'cancelada' || l === 'anulada') return 'cancelled';
    if (l === 'draft' || l === 'borrador') return 'draft';
    return 'unknown';
  }

  private mapInvoice(inv: NbInvoice): ErpInvoice {
    const total = Number(inv.total ?? 0);
    const subtotal = Number(inv.subtotal ?? total);
    const tax = Number(inv.tax ?? total - subtotal);
    const lines: ErpInvoiceLine[] = (inv.lines ?? []).map((l) => ({
      description: l.description ?? 'Servicio clínico',
      quantity: Number(l.quantity ?? 1),
      unitPrice: Number(l.unit_price ?? 0),
      taxRate: Number(l.tax_rate ?? 0),
      total: Number(l.total ?? Number(l.quantity ?? 1) * Number(l.unit_price ?? 0)),
    }));
    return {
      id: String(inv.id),
      number: inv.number ?? String(inv.id),
      date: inv.date ?? '',
      dueDate: inv.due_date ?? undefined,
      contactId: String(inv.patient_id ?? ''),
      contactName: inv.patient_name ?? '',
      subtotal,
      tax,
      total,
      currency: 'EUR',
      status: this.mapInvoiceStatus(inv.status),
      type: 'invoice' as const,
      lines,
    };
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 100) };
    if (params?.from) query['date_from'] = params.from.slice(0, 10);
    if (params?.to) query['date_to'] = params.to.slice(0, 10);
    if (params?.contactId) query['patient_id'] = params.contactId;

    const data = await this.get<NbList<NbInvoice>>('invoices', query);
    return (data.data ?? []).map((inv) => this.mapInvoice(inv));
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    try {
      const data = await this.get<{ data: NbInvoice }>(`invoices/${id}`);
      return data.data ? this.mapInvoice(data.data) : null;
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 200) };
    const data = await this.get<NbList<NbPatient>>('patients', query);
    return (data.data ?? []).map((p) => ({
      id: String(p.id),
      name: this.patientFullName(p),
      nif: p.nif ?? undefined,
      email: p.email ?? undefined,
      phone: p.phone ?? undefined,
      type: 'client' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 200) };
    const data = await this.get<NbList<NbService>>('services', query);
    return (data.data ?? []).map((s) => ({
      id: String(s.id),
      name: s.name ?? `Servicio ${s.id}`,
      sku: s.code ?? undefined,
      price: Number(s.price ?? 0),
      taxRate: Number(s.tax_rate ?? 0),
    }));
  }

  // No accounting entries in Nubimed.
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
