// Stripe payment adapter.
// API docs: https://stripe.com/docs/api
// Auth: Bearer secret key (sk_live_... / sk_test_...). Base URL: https://api.stripe.com/v1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

type StripeCharge = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customer: string | { id: string } | null;
  created: number;
  metadata: Record<string, string>;
};

type StripeCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  created: number;
};

type StripePayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: number;
};

type StripeBalance = {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
};

export class StripePaymentClient implements PaymentClient {
  readonly provider = 'stripe' as const;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(err?.error?.message ?? `Stripe error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.cursor) query['starting_after'] = params.cursor;
    if (params?.from)
      query['created[gte]'] = String(Math.floor(new Date(params.from).getTime() / 1000));
    if (params?.to)
      query['created[lte]'] = String(Math.floor(new Date(params.to).getTime() / 1000));

    const data = await this.get<{ data: StripeCharge[] }>('/charges', query);
    return data.data.map((c) => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency.toUpperCase(),
      status:
        c.status === 'succeeded'
          ? 'succeeded'
          : c.status === 'pending'
            ? 'pending'
            : ('failed' as PaymentTransaction['status']),
      description: c.description,
      customerId: typeof c.customer === 'string' ? c.customer : (c.customer?.id ?? null),
      createdAt: new Date(c.created * 1000).toISOString(),
      metadata: c.metadata,
    }));
  }

  async listCustomers(): Promise<PaymentCustomer[]> {
    const data = await this.get<{ data: StripeCustomer[] }>('/customers', { limit: '100' });
    return data.data.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      createdAt: new Date(c.created * 1000).toISOString(),
    }));
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<{ data: StripePayout[] }>('/payouts', { limit: '100' });
    return data.data.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency.toUpperCase(),
      status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
    }));
  }

  async getBalance(): Promise<PaymentBalance> {
    const bal = await this.get<StripeBalance>('/balance');
    const avail = bal.available.find((b) => b.currency === 'eur') ?? bal.available[0];
    const pend = bal.pending.find((b) => b.currency === 'eur') ?? bal.pending[0];
    return {
      available: (avail?.amount ?? 0) / 100,
      pending: (pend?.amount ?? 0) / 100,
      currency: (avail?.currency ?? 'eur').toUpperCase(),
    };
  }
}
