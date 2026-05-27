// Paylands payment adapter.
// Gateway de pagos español con soporte nativo de Bizum y métodos locales.
// API docs: https://docs.paylands.com/en/reference/
// Auth: Bearer token. Base URL: https://api.paylands.com/v1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── Paylands API shapes ────────────────────────────────────────────────────────

type PlPayment = {
  uuid: string;
  status: string;
  amount: number;
  currency?: string;
  created_at: string;
  description?: string | null;
  customer_ext_id?: string | null;
  metadata?: Record<string, string> | null;
};

type PlCustomer = {
  ext_id: string;
  email?: string | null;
  name?: string | null;
  created_at: string;
};

type PlSettlement = {
  uuid: string;
  amount: number;
  currency: string;
  status: string;
  settled_at?: string | null;
};

type PlList<T> = {
  data: T[];
  meta?: { total?: number; current_page?: number; last_page?: number };
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class PaylandsPaymentClient implements PaymentClient {
  readonly provider = 'paylands' as const;
  private readonly baseUrl = 'https://api.paylands.com/v1';

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
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `Paylands error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s: string): PaymentTransaction['status'] {
    if (s === 'paid' || s === 'completed' || s === 'captured') return 'succeeded';
    if (s === 'pending' || s === 'authorized') return 'pending';
    if (s === 'failed' || s === 'cancelled' || s === 'expired') return 'failed';
    if (s === 'refunded' || s === 'reversed') return 'refunded';
    return 'pending';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const query: Record<string, string> = { per_page: String(params?.limit ?? 100) };
    if (params?.from) query['from'] = params.from;
    if (params?.to) query['to'] = params.to;
    if (params?.cursor) query['page'] = params.cursor;

    const data = await this.get<PlList<PlPayment>>('/payment', query);
    return (data.data ?? []).map((p) => ({
      id: p.uuid,
      amount: p.amount / 100,
      currency: p.currency ?? 'EUR',
      status: this.mapStatus(p.status),
      description: p.description ?? null,
      customerId: p.customer_ext_id ?? null,
      createdAt: p.created_at,
      metadata: p.metadata ?? undefined,
    }));
  }

  async listCustomers(): Promise<PaymentCustomer[]> {
    const data = await this.get<PlList<PlCustomer>>('/customer', { per_page: '500' });
    return (data.data ?? []).map((c) => ({
      id: c.ext_id,
      name: c.name ?? null,
      email: c.email ?? null,
      createdAt: c.created_at,
    }));
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<PlList<PlSettlement>>('/settlement', { per_page: '100' });
    return (data.data ?? []).map((s) => ({
      id: s.uuid,
      amount: s.amount / 100,
      currency: s.currency,
      status: s.status,
      arrivalDate: s.settled_at ?? null,
    }));
  }

  // Paylands does not expose a balance endpoint — return zeros.
  async getBalance(): Promise<PaymentBalance> {
    return { available: 0, pending: 0, currency: 'EUR' };
  }
}
