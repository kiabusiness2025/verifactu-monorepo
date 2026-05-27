// PayPal payment adapter.
// API docs: https://developer.paypal.com/api/rest/
// Auth: OAuth 2.0 client_credentials (Client ID + Secret → Bearer token).
// Stored credential format: "clientId:clientSecret" (joined by first colon).
// Base URL: https://api-m.paypal.com

import type {
  ListTransactionsParams,
  PaymentBalance,
  PaymentClient,
  PaymentCustomer,
  PaymentPayout,
  PaymentTransaction,
} from './payment-client';

// ── PayPal API shapes ──────────────────────────────────────────────────────────

type PpTokenResponse = { access_token: string; expires_in: number };

type PpTransaction = {
  transaction_info: {
    transaction_id: string;
    transaction_amount: { value: string; currency_code: string };
    transaction_status: string;
    transaction_subject?: string | null;
    transaction_initiation_date: string;
    paypal_account_id?: string | null;
  };
  payer_info?: { payer_name?: { alternate_full_name?: string }; email_address?: string } | null;
};

type PpPayout = {
  payout_header: {
    payout_batch_id: string;
    batch_status: string;
    amount: { value: string; currency: string };
    time_completed?: string | null;
  };
};

type PpBalance = {
  balances: {
    currency: string;
    available_balance: { value: string };
    withheld_balance?: { value: string };
  }[];
};

// ── Client ─────────────────────────────────────────────────────────────────────

export class PayPalPaymentClient implements PaymentClient {
  readonly provider = 'paypal' as const;
  private readonly baseUrl = 'https://api-m.paypal.com';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(apiKey: string) {
    // Stored as "clientId:clientSecret"; split at first colon
    const colonIndex = apiKey.indexOf(':');
    if (colonIndex === -1) {
      this.clientId = apiKey;
      this.clientSecret = '';
    } else {
      this.clientId = apiKey.slice(0, colonIndex);
      this.clientSecret = apiKey.slice(colonIndex + 1);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }
    const creds = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`PayPal auth error ${res.status}`);
    const data = (await res.json()) as PpTokenResponse;
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000 - 30_000,
    };
    return data.access_token;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `PayPal error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private mapStatus(s: string): PaymentTransaction['status'] {
    if (s === 'S' || s === 'V') return 'succeeded';
    if (s === 'P' || s === 'FP') return 'pending';
    if (s === 'D' || s === 'F') return 'failed';
    if (s === 'R') return 'refunded';
    return 'pending';
  }

  async listTransactions(params?: ListTransactionsParams): Promise<PaymentTransaction[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const query: Record<string, string> = {
      start_date: params?.from ?? thirtyDaysAgo.toISOString(),
      end_date: params?.to ?? now.toISOString(),
      page_size: String(Math.min(params?.limit ?? 100, 500)),
    };
    if (params?.cursor) query['page'] = params.cursor;

    const data = await this.get<{ transaction_details?: PpTransaction[] }>(
      '/v1/reporting/transactions',
      query
    );
    return (data.transaction_details ?? []).map((t) => {
      const info = t.transaction_info;
      return {
        id: info.transaction_id,
        amount: parseFloat(info.transaction_amount.value),
        currency: info.transaction_amount.currency_code,
        status: this.mapStatus(info.transaction_status),
        description: info.transaction_subject ?? null,
        customerId: info.paypal_account_id ?? null,
        createdAt: info.transaction_initiation_date,
      };
    });
  }

  // PayPal reporting API does not expose a dedicated customer list.
  async listCustomers(): Promise<PaymentCustomer[]> {
    return [];
  }

  async listPayouts(): Promise<PaymentPayout[]> {
    const data = await this.get<{ items?: PpPayout[] }>('/v1/payments/payouts', {
      page_size: '20',
    });
    return (data.items ?? []).map((p) => ({
      id: p.payout_header.payout_batch_id,
      amount: parseFloat(p.payout_header.amount.value),
      currency: p.payout_header.amount.currency,
      status: p.payout_header.batch_status,
      arrivalDate: p.payout_header.time_completed ?? null,
    }));
  }

  async getBalance(): Promise<PaymentBalance> {
    const data = await this.get<PpBalance>('/v2/wallet/balance');
    const eur = data.balances?.find((b) => b.currency === 'EUR') ?? data.balances?.[0];
    if (!eur) return { available: 0, pending: 0, currency: 'EUR' };
    return {
      available: parseFloat(eur.available_balance.value),
      pending: parseFloat(eur.withheld_balance?.value ?? '0'),
      currency: eur.currency,
    };
  }
}
