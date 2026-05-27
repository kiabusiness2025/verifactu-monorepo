// Hotelgest ERP adapter — hotel PMS (Spain).
// Auth: Bearer token (API key from Hotelgest backoffice → Integraciones → API).
// Base URL: https://app.hotelgest.com/api/v1/
// Credential: apiKey passed as Bearer token.

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

// ── Hotelgest API shapes ───────────────────────────────────────────────────────

type HgReservation = {
  id: string | number;
  locator?: string;
  checkin?: string;
  checkout?: string;
  created_at?: string;
  guest_id?: string | number | null;
  guest_name?: string | null;
  total?: number | string;
  subtotal?: number | string;
  iva?: number | string;
  status?: string;
  lines?: HgReservationLine[];
};

type HgReservationLine = {
  description: string;
  nights?: number | string;
  price?: number | string;
  iva?: number | string;
};

type HgGuest = {
  id: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  nif?: string | null;
  passport?: string | null;
};

type HgRoomType = {
  id: string | number;
  name: string;
  price?: number | string | null;
  code?: string | null;
};

type HgList<T> = { data: T[]; meta?: { total?: number; page?: number; last_page?: number } };

// ── Client ─────────────────────────────────────────────────────────────────────

export class HotelgestErpClient implements ErpClient {
  readonly provider = 'hotelgest' as const;
  private readonly baseUrl = 'https://app.hotelgest.com/api/v1';

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
      throw new Error(err?.message ?? `Hotelgest error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s?: string): ErpInvoice['status'] {
    if (!s) return 'unknown';
    const lower = s.toLowerCase();
    if (['confirmed', 'checkedin', 'checkedout', 'paid'].includes(lower)) return 'paid';
    if (['pending', 'provisional'].includes(lower)) return 'sent';
    if (['cancelled', 'canceled', 'noshow'].includes(lower)) return 'cancelled';
    return 'unknown';
  }

  private mapReservation(r: HgReservation): ErpInvoice {
    const total = Number(r.total ?? 0);
    const subtotal = Number(r.subtotal ?? total);
    const tax = Number(r.iva ?? total - subtotal);
    const lines: ErpInvoiceLine[] = (r.lines ?? []).map((l) => ({
      description: l.description,
      quantity: Number(l.nights ?? 1),
      unitPrice: Number(l.price ?? 0),
      taxRate: Number(l.iva ?? 0),
      total: Number(l.nights ?? 1) * Number(l.price ?? 0),
    }));
    return {
      id: String(r.id),
      number: r.locator ?? String(r.id),
      date: r.checkin ?? r.created_at ?? '',
      dueDate: r.checkout,
      contactId: String(r.guest_id ?? ''),
      contactName: r.guest_name ?? '',
      subtotal,
      tax,
      total,
      currency: 'EUR',
      status: this.mapStatus(r.status),
      type: 'invoice' as const,
      lines,
    };
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 100) };
    if (params?.from) query['checkin_from'] = params.from.slice(0, 10);
    if (params?.to) query['checkin_to'] = params.to.slice(0, 10);
    if (params?.contactId) query['guest_id'] = params.contactId;

    const data = await this.get<HgList<HgReservation>>('reservations', query);
    return (data.data ?? []).map((r) => this.mapReservation(r));
  }

  async getInvoice(id: string): Promise<ErpInvoice | null> {
    try {
      const data = await this.get<{ data: HgReservation }>(`reservations/${id}`);
      return data.data ? this.mapReservation(data.data) : null;
    } catch {
      return null;
    }
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 200) };
    const data = await this.get<HgList<HgGuest>>('guests', query);
    return (data.data ?? []).map((g) => ({
      id: String(g.id),
      name: g.name ?? [g.first_name, g.last_name].filter(Boolean).join(' ') ?? `Guest ${g.id}`,
      nif: g.nif ?? g.passport ?? undefined,
      email: g.email ?? undefined,
      phone: g.phone ?? undefined,
      type: 'client' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 100) };
    const data = await this.get<HgList<HgRoomType>>('room-types', query);
    return (data.data ?? []).map((rt) => ({
      id: String(rt.id),
      name: rt.name,
      sku: rt.code ?? undefined,
      price: Number(rt.price ?? 0),
    }));
  }

  // Hotelgest does not expose accounting entries via API.
  listAccountEntries(): Promise<ErpAccountEntry[]> {
    return Promise.resolve([]);
  }

  async getSnapshot(params?: { from?: string; to?: string }): Promise<ErpSnapshot> {
    const [invoices, contacts, products] = await Promise.all([
      this.listInvoices({ from: params?.from, to: params?.to, limit: 100 }),
      this.listContacts({ limit: 200 }),
      this.listProducts({ limit: 100 }),
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
