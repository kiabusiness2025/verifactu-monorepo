// GoCardless payment adapter.
// API docs: https://developer.gocardless.com/api-reference/
// Auth: Bearer token (live_... / sandbox_...). Base URL: https://api.gocardless.com
// GoCardless-Version header required on every request.
// NOTE: this connector is for GoCardless PAYMENTS (direct debit, SEPA mandates).
// GoCardless Bankdata (AIS/Open Banking) sunset — replaced by Enable Banking in this project.

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── GoCardless API shapes ──────────────────────────────────────────────────────

type GcPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
  charge_date: string | null;
  links?: { customer?: string | null } | null;
  metadata?: Record<string, string> | null;
};

type GcCustomer = {
  id: string;
  given_name: string | null;
  family_name: string | null;
  company_name: string | null;
  email: string | null;
  created_at: string;
};

type GcPayout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrival_date: string | null;
};

type GcList<K extends string, T> = {
  [key in K]: T[];
} & {
  meta: { cursors: { before?: string | null; after?: string | null }; limit: number };
};

type GcCreditorBalance = {
  currency: string;
  amount: number;
  pending_debits_amount?: number;
};

type GcCreditor = {
  id: string;
  scheme_identifiers?: { currency?: string }[];
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class GoCardlessPaymentClient implements PaymentClient {
  readonly provider = 'gocardless' as const;
  private readonly baseUrl = 'https://api.gocardless.com';
  private readonly apiVersion = '2015-07-06';

  constructor(private readonly apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'GoCardless-Version': this.apiVersion,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        error?: { message?: string; code?: number };
      } | null;
      throw new Error(err?.error?.message ?? `GoCardless error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s: string): PaymentTransaction['status'] {
    if (s === 'paid_out' || s === 'confirmed') return 'succeeded';
    if (
      s === 'pending_submission' ||
      s === 'submitted' ||
      s === 'pending_customer_approval' ||
      s === 'pending_mandate'
    )
      return 'pending';
    if (s === 'failed' || s === 'cancelled' || s === 'charged_back') return 'failed';
    if (s === 'customer_approval_denied') return 'failed';
    return 'pending';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const query: Record<string, string> = { limit: String(params?.limit ?? 100) };
    if (params?.from) query['created_at[gte]'] = params.from;
    if (params?.to) query['created_at[lte]'] = params.to;
    if (params?.cursor) query['after'] = params.cursor;

    const data = await this.get<GcList<'payments', GcPayment>>('/payments', query);
    return data.payments.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      status: this.mapStatus(p.status),
      description: p.description ?? null,
      customerId: p.links?.customer ?? null,
      createdAt: p.created_at,
      metadata: p.metadata ?? undefined,
    }));
  }

  async listCustomers(): Promise<PaymentCustomer[]> {
    const data = await this.get<GcList<'customers', GcCustomer>>('/customers', { limit: '500' });
    return data.customers.map((c) => {
      const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || c.company_name;
      return {
        id: c.id,
        name: name || null,
        email: c.email ?? null,
        createdAt: c.created_at,
      };
    });
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<GcList<'payouts', GcPayout>>('/payouts', { limit: '500' });
    return data.payouts.map((p) => ({
      id: p.id,
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      arrivalDate: p.arrival_date ?? null,
    }));
  }

  async getBalance(): Promise<PaymentBalance> {
    // GoCardless exposes balances per creditor (org). Fetch the default creditor then its balance.
    const creditorsData = await this.get<{ creditors: GcCreditor[] }>('/creditors', {
      limit: '1',
    });
    const creditorId = creditorsData.creditors[0]?.id;
    if (!creditorId) return { available: 0, pending: 0, currency: 'EUR' };

    const balanceData = await this.get<{ creditor_balances: GcCreditorBalance[] }>(
      `/creditor_balances`,
      { creditor: creditorId }
    );
    const balances = balanceData.creditor_balances;
    // Prefer EUR balance; fall back to first entry.
    const bal =
      balances.find((b) => b.currency === 'EUR') ??
      balances.find((b) => b.currency === 'GBP') ??
      balances[0];

    if (!bal) return { available: 0, pending: 0, currency: 'EUR' };
    return {
      available: bal.amount / 100,
      pending: (bal.pending_debits_amount ?? 0) / 100,
      currency: bal.currency,
    };
  }
}
