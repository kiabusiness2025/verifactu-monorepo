// SumUp payment adapter.
// API docs: https://developer.sumup.com/api
// Auth: Bearer token (personal access token or OAuth access_token).
// Base URL: https://api.sumup.com/v0.1/

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── SumUp API shapes ───────────────────────────────────────────────────────────

type SuTransaction = {
  id: string;
  transaction_code: string;
  amount: number;
  currency: string;
  status: string;
  payment_type?: string | null;
  timestamp: string;
  card?: { last_4_digits?: string } | null;
};

type SuPayout = {
  id?: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  transfer_date?: string | null;
};

type SuBalance = {
  amount: { value: number; currency: string };
  pending: { value: number; currency: string };
};

type SuMerchantProfile = {
  merchant_code: string;
  username: string;
  email?: string;
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class SumUpPaymentClient implements PaymentClient {
  readonly provider = 'sumup' as const;
  private readonly baseUrl = 'https://api.sumup.com/v0.1';

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
      throw new Error(err?.message ?? `SumUp error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s: string): PaymentTransaction['status'] {
    if (s === 'SUCCESSFUL') return 'succeeded';
    if (s === 'PENDING') return 'pending';
    if (s === 'FAILED' || s === 'CANCELLED' || s === 'CHARGE_BACK') return 'failed';
    if (s === 'REFUNDED') return 'refunded';
    return 'pending';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const query: Record<string, string> = {
      limit: String(params?.limit ?? 100),
      order: 'descending',
    };
    if (params?.from) query['oldest_time'] = params.from;
    if (params?.to) query['newest_time'] = params.to;

    // SumUp returns { items: [...] }
    const data = await this.get<{ items?: SuTransaction[] }>('/me/transactions/history', query);
    return (data.items ?? []).map((t) => ({
      id: t.id ?? t.transaction_code,
      amount: t.amount,
      currency: t.currency,
      status: this.mapStatus(t.status),
      description: t.payment_type ?? null,
      customerId: null,
      createdAt: t.timestamp,
    }));
  }

  // SumUp does not expose a customer list endpoint — return empty array.
  async listCustomers(): Promise<PaymentCustomer[]> {
    return [];
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<{ items?: SuPayout[] }>('/me/financials/payouts', {
      limit: '100',
    });
    return (data.items ?? []).map((p, i) => ({
      id: p.id ?? `payout-${i}`,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      arrivalDate: p.transfer_date ?? p.date ?? null,
    }));
  }

  async getBalance(): Promise<PaymentBalance> {
    const data = await this.get<SuBalance>('/me/financials/balance');
    return {
      available: data.amount?.value ?? 0,
      pending: data.pending?.value ?? 0,
      currency: data.amount?.currency ?? 'EUR',
    };
  }
}
