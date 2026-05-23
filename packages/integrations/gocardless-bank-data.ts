/**
 * GoCardless Bank Account Data (ex-Nordigen) API v2 client
 * Docs: https://bankaccountdata.gocardless.com/api/v2/
 *
 * Account Aggregation for EEA banks under GoCardless's own AISP license.
 * No PSD2 license required from the client.
 *
 * Env vars:
 *   GCBD_SECRET_ID   — from GoCardless BAD dashboard
 *   GCBD_SECRET_KEY  — from GoCardless BAD dashboard
 *   GCBD_WEBHOOK_SECRET — shared secret for webhook verification
 */

import crypto from 'crypto';

const BASE = 'https://bankaccountdata.gocardless.com/api/v2';

// ── Token cache (module-level, refreshed per cold start) ─────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

// ── Types ─────────────────────────────────────────────────────────────────────

export class GcbdError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`GoCardless BAD API error ${status}: ${body}`);
    this.name = 'GcbdError';
  }
}

export type GcbdInstitution = {
  id: string;
  name: string;
  bic: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
};

export type GcbdAgreement = {
  id: string;
  institution_id: string;
  max_historical_days: number;
  access_valid_for_days: number;
  access_scope: string[];
  created: string;
  accepted: string | null;
};

export type GcbdRequisition = {
  id: string;
  status: 'CR' | 'GC' | 'UA' | 'RJ' | 'SA' | 'GA' | 'LN' | 'SU' | 'EX'; // created→linked→expired
  accounts: string[];
  link: string;
  redirect: string;
  reference: string;
  institution_id: string;
  agreement: string;
  created: string;
};

export type GcbdAccountMeta = {
  id: string;
  iban: string | null;
  institution_id: string;
  status: 'DISCOVERED' | 'PROCESSING' | 'ERROR' | 'EXPIRED' | 'READY' | 'SUSPENDED';
  owner_name: string | null;
  created: string;
  last_accessed: string | null;
};

export type GcbdAccountDetails = {
  resourceId?: string;
  iban?: string;
  currency?: string;
  ownerName?: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
};

export type GcbdBalance = {
  balanceAmount: { amount: string; currency: string };
  balanceType: string;
  referenceDate?: string;
};

export type GcbdTransaction = {
  transactionId?: string;
  bookingDate: string;
  valueDate?: string;
  transactionAmount: { amount: string; currency: string };
  creditorName?: string;
  debtorName?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  proprietaryBankTransactionCode?: string;
  internalTransactionId?: string;
};

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) return _cachedToken;

  const secretId = process.env.GCBD_SECRET_ID?.replace(/[\r\n]/g, '').trim();
  const secretKey = process.env.GCBD_SECRET_KEY?.replace(/[\r\n]/g, '').trim();
  if (!secretId || !secretKey) throw new Error('GCBD_SECRET_ID or GCBD_SECRET_KEY not configured');

  const res = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GcbdError(res.status, body);
  }

  const data = (await res.json()) as { access: string; access_expires: number };
  _cachedToken = data.access;
  _tokenExpiresAt = Date.now() + data.access_expires * 1000;
  return _cachedToken;
}

async function gcbd<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauth = true
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 && retryOnUnauth) {
    _cachedToken = null; // force token refresh
    return gcbd(path, options, false);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GcbdError(res.status, body);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Institutions ──────────────────────────────────────────────────────────────

export async function listInstitutions(country: string): Promise<GcbdInstitution[]> {
  return gcbd<GcbdInstitution[]>(`/institutions/?country=${country}`);
}

// ── End User Agreement ────────────────────────────────────────────────────────

export async function createAgreement(params: {
  institutionId: string;
  maxHistoricalDays?: number;
  accessValidForDays?: number;
}): Promise<GcbdAgreement> {
  return gcbd<GcbdAgreement>('/agreements/enduser/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: params.institutionId,
      max_historical_days: params.maxHistoricalDays ?? 90,
      access_valid_for_days: params.accessValidForDays ?? 90,
      access_scope: ['balances', 'details', 'transactions'],
    }),
  });
}

// ── Requisitions ──────────────────────────────────────────────────────────────

export async function createRequisition(params: {
  institutionId: string;
  agreementId: string;
  redirectUrl: string;
  reference: string;
  userLanguage?: string;
}): Promise<GcbdRequisition> {
  return gcbd<GcbdRequisition>('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: params.redirectUrl,
      institution_id: params.institutionId,
      agreement: params.agreementId,
      reference: params.reference,
      user_language: params.userLanguage ?? 'ES',
    }),
  });
}

export async function getRequisition(requisitionId: string): Promise<GcbdRequisition> {
  return gcbd<GcbdRequisition>(`/requisitions/${requisitionId}/`);
}

export async function deleteRequisition(requisitionId: string): Promise<void> {
  return gcbd(`/requisitions/${requisitionId}/`, { method: 'DELETE' });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccountMeta(accountId: string): Promise<GcbdAccountMeta> {
  return gcbd<GcbdAccountMeta>(`/accounts/${accountId}/`);
}

export async function getAccountDetails(accountId: string): Promise<GcbdAccountDetails> {
  const res = await gcbd<{ account: GcbdAccountDetails }>(`/accounts/${accountId}/details/`);
  return res.account;
}

export async function getAccountBalances(accountId: string): Promise<GcbdBalance[]> {
  const res = await gcbd<{ balances: GcbdBalance[] }>(`/accounts/${accountId}/balances/`);
  return res.balances;
}

export async function getAccountTransactions(
  accountId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ booked: GcbdTransaction[]; pending: GcbdTransaction[] }> {
  const qs = new URLSearchParams();
  if (dateFrom) qs.set('date_from', dateFrom);
  if (dateTo) qs.set('date_to', dateTo);
  const query = qs.toString() ? `?${qs}` : '';
  const res = await gcbd<{ transactions: { booked: GcbdTransaction[]; pending: GcbdTransaction[] } }>(
    `/accounts/${accountId}/transactions/${query}`
  );
  return res.transactions;
}

// ── Webhook verification ──────────────────────────────────────────────────────

export function verifyGcbdWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.GCBD_WEBHOOK_SECRET?.replace(/[\r\n]/g, '').trim();
  if (!secret) return true; // skip if not configured

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Picks the best available balance: closingBooked > interimAvailable > expected > first
 */
export function resolveBalance(balances: GcbdBalance[]): number {
  const priority = ['closingBooked', 'interimAvailable', 'expected'];
  for (const type of priority) {
    const b = balances.find((b) => b.balanceType === type);
    if (b) return parseFloat(b.balanceAmount.amount);
  }
  if (balances.length > 0) return parseFloat(balances[0].balanceAmount.amount);
  return 0;
}

/**
 * Normalizes a GCBD transaction to the shape expected by SeTransaction upsert.
 */
export function normalizeTransaction(
  tx: GcbdTransaction,
  accountId: string,
  tenantId: string,
  status: 'posted' | 'pending' = 'posted'
) {
  const description =
    tx.remittanceInformationUnstructured ||
    tx.remittanceInformationStructured ||
    tx.proprietaryBankTransactionCode ||
    '';

  const amount = parseFloat(tx.transactionAmount.amount);

  return {
    id: tx.transactionId || tx.internalTransactionId || `gcbd-${accountId}-${tx.bookingDate}-${amount}-${description.slice(0, 20)}`,
    tenantId,
    accountId,
    status,
    madeOn: tx.bookingDate,
    amount,
    currency: tx.transactionAmount.currency,
    description,
    category: tx.proprietaryBankTransactionCode || '',
    payee: amount < 0 ? (tx.creditorName ?? null) : null,
    payer: amount >= 0 ? (tx.debtorName ?? null) : null,
    duplicated: false,
  };
}
