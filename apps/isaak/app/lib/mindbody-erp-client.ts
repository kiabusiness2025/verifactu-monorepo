// Mindbody ERP adapter — fitness/wellness studio management.
// API docs: https://developers.mindbodyonline.com/
// Auth: Api-Key + SiteId headers + UserToken (Bearer) obtained via /usertoken/issue.
// Stored credential format: "APIKey::SiteId::Username::Password" (split at "::").
// Base URL: https://api.mindbodyonline.com/public/v6/

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

// ── Mindbody API shapes ────────────────────────────────────────────────────────

type MbUserTokenResponse = {
  AccessToken: string;
  TokenExpirationTime: string;
};

type MbSale = {
  Id: number;
  SaleDate?: string;
  ClientId?: string | null;
  ClientUniqueId?: number | null;
  LocationId?: number;
  Total?: number;
  SubTotal?: number;
  TaxTotal?: number;
  SaleItems?: MbSaleItem[];
};

type MbSaleItem = {
  Description?: string;
  Quantity?: number;
  UnitPrice?: number;
  TaxAmount?: number;
  Total?: number;
};

type MbClient = {
  Id?: string;
  UniqueId?: number;
  FirstName?: string;
  LastName?: string;
  Email?: string | null;
  MobilePhone?: string | null;
  HomePhone?: string | null;
  WorkPhone?: string | null;
  Id2?: string | null;
};

type MbService = {
  Id?: string;
  Name: string;
  Price?: number;
  Online?: boolean;
  ProgramId?: number;
};

type MbList<T> = {
  Results?: T[];
  PaginationResponse?: {
    RequestedOffset: number;
    RequestedLimit: number;
    PageSize: number;
    TotalResults: number;
  };
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class MindbodyErpClient implements ErpClient {
  readonly provider = 'mindbody' as const;
  private readonly baseUrl = 'https://api.mindbodyonline.com/public/v6';
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly username: string;
  private readonly password: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(credential: string) {
    // Format: "APIKey::SiteId::Username::Password"
    const parts = credential.split('::');
    this.apiKey = parts[0] ?? '';
    this.siteId = parts[1] ?? '';
    this.username = parts[2] ?? '';
    this.password = parts[3] ?? '';
  }

  private async getUserToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }
    const res = await fetch(`${this.baseUrl}/usertoken/issue`, {
      method: 'POST',
      headers: {
        'Api-Key': this.apiKey,
        SiteId: this.siteId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Username: this.username, Password: this.password }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { Message?: string } | null;
      throw new Error(err?.Message ?? `Mindbody auth error ${res.status}`);
    }
    const data = (await res.json()) as MbUserTokenResponse;
    const expiresAt = new Date(data.TokenExpirationTime).getTime() - 60_000;
    this.cachedToken = { token: data.AccessToken, expiresAt };
    return data.AccessToken;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getUserToken();
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Api-Key': this.apiKey,
        SiteId: this.siteId,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { Message?: string } | null;
      throw new Error(err?.Message ?? `Mindbody error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listInvoices(params?: ListInvoicesParams): Promise<ErpInvoice[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.from) query['StartSaleDateTime'] = params.from;
    if (params?.to) query['EndSaleDateTime'] = params.to;
    if (params?.contactId) query['ClientId'] = params.contactId;

    const data = await this.get<MbList<MbSale>>('sale/sales', query);
    return (data.Results ?? []).map((s) => {
      const total = s.Total ?? 0;
      const subtotal = s.SubTotal ?? total;
      const tax = s.TaxTotal ?? total - subtotal;
      const lines: ErpInvoiceLine[] = (s.SaleItems ?? []).map((item) => ({
        description: item.Description ?? '',
        quantity: item.Quantity ?? 1,
        unitPrice: item.UnitPrice ?? 0,
        taxRate: 0,
        total: item.Total ?? (item.Quantity ?? 1) * (item.UnitPrice ?? 0),
      }));
      return {
        id: String(s.Id),
        number: String(s.Id),
        date: s.SaleDate ?? '',
        contactId: s.ClientId ?? String(s.ClientUniqueId ?? ''),
        contactName: '',
        subtotal,
        tax,
        total,
        currency: 'USD',
        status: 'paid' as const,
        type: 'invoice' as const,
        lines,
      };
    });
  }

  async getInvoice(_id: string): Promise<ErpInvoice | null> {
    // Mindbody does not expose a single-sale endpoint — use listInvoices with date range instead.
    return null;
  }

  async listContacts(params?: ListContactsParams): Promise<ErpContact[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 200) };
    const data = await this.get<MbList<MbClient>>('client/clients', query);
    return (data.Results ?? []).map((c) => ({
      id: c.Id ?? String(c.UniqueId ?? ''),
      name: [c.FirstName, c.LastName].filter(Boolean).join(' ') || `Client ${c.Id}`,
      nif: c.Id2 ?? undefined,
      email: c.Email ?? undefined,
      phone: c.MobilePhone ?? c.HomePhone ?? c.WorkPhone ?? undefined,
      type: 'client' as const,
    }));
  }

  async listProducts(params?: { limit?: number }): Promise<ErpProduct[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 200) };
    const data = await this.get<MbList<MbService>>('site/services', query);
    return (data.Results ?? []).map((svc) => ({
      id: svc.Id ?? '',
      name: svc.Name,
      price: svc.Price ?? 0,
    }));
  }

  // Mindbody does not expose accounting entries.
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
