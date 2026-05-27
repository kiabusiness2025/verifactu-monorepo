// Mollie payment adapter.
// API docs: https://docs.mollie.com/reference/introduction
// Auth: Bearer token (live_... / test_...). Base URL: https://api.mollie.com/v2/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── Mollie API shapes ──────────────────────────────────────────────────────────

type MlAmount = { value: string; currency: string };

type MlPayment = {
  id: string;
  status: string;
  amount: MlAmount;
  description: string;
  customerId?: string | null;
  createdAt: string;
  paidAt?: string | null;
  metadata?: Record<string, string> | null;
};

type MlCustomer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type MlSettlement = {
  id: string;
  amount: MlAmount;
  status: string;
  createdAt: string;
  settledAt?: string | null;
};

type MlBalance = {
  id: string;
  currency: string;
  availableAmount: MlAmount;
  pendingAmount: MlAmount;
};

type MlList<T> = { _embedded: { [key: string]: T[] }; _links: { next?: { href: string } | null } };

// ── Client ─────────────────────────────────────────────────────────────────────

export class MolliePaymentClient implements PaymentClient {
  readonly provider = 'mollie' as const;
  private readonly baseUrl = 'https://api.mollie.com/v2';

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
      const err = (await res.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(err?.detail ?? `Mollie error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s: string): PaymentTransaction['status'] {
    if (s === 'paid') return 'succeeded';
    if (s === 'pending' || s === 'open' || s === 'authorized') return 'pending';
    if (s === 'failed' || s === 'expired' || s === 'canceled') return 'failed';
    if (s === 'refunded') return 'refunded';
    return 'pending';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 250) };
    if (params?.from) query['from'] = params.from;
    if (params?.cursor) query['from'] = params.cursor;

    const data = await this.get<MlList<MlPayment>>('/payments', query);
    const payments = data._embedded.payments ?? [];
    return payments.map((p) => ({
      id: p.id,
      amount: parseFloat(p.amount.value),
      currency: p.amount.currency,
      status: this.mapStatus(p.status),
      description: p.description || null,
      customerId: p.customerId ?? null,
      createdAt: p.createdAt,
      metadata: p.metadata ?? undefined,
    }));
  }

  async listCustomers(): Promise<PaymentCustomer[]> {
    const data = await this.get<MlList<MlCustomer>>('/customers', { limit: '250' });
    const customers = data._embedded.customers ?? [];
    return customers.map((c) => ({
      id: c.id,
      name: c.name || null,
      email: c.email || null,
      createdAt: c.createdAt,
    }));
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<MlList<MlSettlement>>('/settlements', { limit: '250' });
    const settlements = data._embedded.settlements ?? [];
    return settlements.map((s) => ({
      id: s.id,
      amount: parseFloat(s.amount.value),
      currency: s.amount.currency,
      status: s.status,
      arrivalDate: s.settledAt ?? null,
    }));
  }

  async getBalance(): Promise<PaymentBalance> {
    const bal = await this.get<MlBalance>('/balances/me');
    return {
      available: parseFloat(bal.availableAmount.value),
      pending: parseFloat(bal.pendingAmount.value),
      currency: bal.currency,
    };
  }
}
