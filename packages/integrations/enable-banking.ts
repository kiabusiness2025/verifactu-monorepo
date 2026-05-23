/**
 * Enable Banking API v2 client (AIS — Account Information Services)
 * Auth: self-signed RS256 JWT, Bearer token per request
 * Docs: https://enablebanking.com/docs/api/
 */
import { createSign } from 'crypto';

const EB_API = 'https://api.enablebanking.com';

// ─── JWT generation ─────────────────────────────────────────────────────────

let _cachedJwt: string | null = null;
let _jwtExpiresAt = 0;

function getPrivateKeyPem(): string {
  const raw = process.env.ENABLE_BANKING_PRIVATE_KEY ?? '';
  if (!raw) throw new EbError('ENABLE_BANKING_PRIVATE_KEY not set');
  // Support both raw PEM and base64-encoded PEM
  return raw.startsWith('-----') ? raw : Buffer.from(raw, 'base64').toString('utf-8');
}

function buildJwt(): string {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  if (!appId) throw new EbError('ENABLE_BANKING_APP_ID not set');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3_600; // 1-hour validity

  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId })).toString(
    'base64url'
  );
  const payload = Buffer.from(
    JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp })
  ).toString('base64url');
  const signingInput = `${header}.${payload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(getPrivateKeyPem(), 'base64url');

  return `${signingInput}.${signature}`;
}

function getJwt(): string {
  if (_cachedJwt && Date.now() / 1000 < _jwtExpiresAt - 60) return _cachedJwt;
  _cachedJwt = buildJwt();
  _jwtExpiresAt = Math.floor(Date.now() / 1000) + 3_600;
  return _cachedJwt;
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

export class EbError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'EbError';
  }
}

async function eb<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${EB_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getJwt()}`,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    let code: string | undefined;
    let message = `Enable Banking API error ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
      if (body.error) code = body.error;
    } catch {
      // ignore parse error
    }
    throw new EbError(message, code, res.status);
  }

  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type EbAspsp = {
  name: string;
  country: string;
  maximum_consent_validity: number;
  beta: boolean;
  psu_types: string[];
  auth_methods?: { name: string; approach: string }[];
};

export type EbAuthResponse = {
  url: string;
  authorization_id: string;
  psu_id_hash?: string;
};

export type EbSessionAccount = {
  uid: string;
  account_id?: { iban?: string; other?: string };
  name?: string;
  currency?: string;
  identification_hash?: string;
  account_servicer?: { name?: string; bic_fi?: string };
};

export type EbSession = {
  session_id: string;
  accounts: EbSessionAccount[];
  access: { valid_until: string };
  aspsp: { name: string; country: string };
  psu_type: string;
  status?: string;
};

export type EbAccountDetails = {
  iban?: string;
  currency?: string;
  name?: string;
  owner_name?: string;
  product?: string;
  cash_account_type?: string;
  credit_limit?: { currency: string; amount: string };
};

export type EbBalance = {
  balance_type: string;
  balance_amount: { currency: string; amount: string };
  reference_date?: string;
};

export type EbTransaction = {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { currency: string; amount: string };
  credit_debit_indicator?: 'CRDT' | 'DBIT';
  status: string;
  booking_date?: string;
  value_date?: string;
  creditor?: { name?: string };
  debtor?: { name?: string };
  remittance_information?: string[];
  balance_after_transaction?: { currency: string; amount: string };
};

export type EbTransactionsResponse = {
  transactions: EbTransaction[];
  continuation_key?: string | null;
};

// ─── API functions ────────────────────────────────────────────────────────────

export async function listAspsps(country = 'ES'): Promise<EbAspsp[]> {
  const params = new URLSearchParams({
    country,
    psu_type: 'personal',
    service: 'AIS',
  });
  const data = await eb<{ aspsps: EbAspsp[] }>(`/aspsps?${params}`);
  return data.aspsps;
}

export async function startEbAuth(opts: {
  aspspName: string;
  country: string;
  redirectUrl: string;
  state: string;
  validUntilDays?: number;
}): Promise<EbAuthResponse> {
  const days = opts.validUntilDays ?? 180;
  const validUntil = new Date(Date.now() + days * 86_400_000).toISOString();

  return eb<EbAuthResponse>('/auth', {
    method: 'POST',
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: opts.aspspName, country: opts.country },
      state: opts.state,
      redirect_url: opts.redirectUrl,
      psu_type: 'personal',
    }),
  });
}

export async function createEbSession(code: string): Promise<EbSession> {
  return eb<EbSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getEbSession(sessionId: string): Promise<EbSession> {
  return eb<EbSession>(`/sessions/${sessionId}`);
}

export async function deleteEbSession(sessionId: string): Promise<void> {
  await eb<unknown>(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function getEbAccountDetails(uid: string): Promise<EbAccountDetails> {
  const data = await eb<{ account: EbAccountDetails }>(`/accounts/${uid}/details`);
  return data.account;
}

export async function getEbAccountBalances(uid: string): Promise<EbBalance[]> {
  const data = await eb<{ balances: EbBalance[] }>(`/accounts/${uid}/balances`);
  return data.balances;
}

export async function getEbAccountTransactions(
  uid: string,
  opts: { dateFrom?: string; dateTo?: string; continuationKey?: string } = {}
): Promise<EbTransactionsResponse> {
  const params = new URLSearchParams();
  if (opts.dateFrom) params.set('date_from', opts.dateFrom);
  if (opts.dateTo) params.set('date_to', opts.dateTo);
  if (opts.continuationKey) params.set('continuation_key', opts.continuationKey);
  const query = params.toString();
  return eb<EbTransactionsResponse>(`/accounts/${uid}/transactions${query ? `?${query}` : ''}`);
}

/** Paginate all transactions for a given date range */
export async function getAllEbTransactions(
  uid: string,
  dateFrom: string,
  dateTo?: string
): Promise<EbTransaction[]> {
  const all: EbTransaction[] = [];
  let continuationKey: string | null | undefined;

  do {
    const res = await getEbAccountTransactions(uid, {
      dateFrom,
      dateTo,
      continuationKey: continuationKey ?? undefined,
    });
    all.push(...res.transactions);
    continuationKey = res.continuation_key;
  } while (continuationKey);

  return all;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BALANCE_PRIORITY = ['CLBD', 'ITAV', 'XPCD', 'CLAV', 'ITBD', 'OPBD'];

export function resolveEbBalance(balances: EbBalance[]): number {
  for (const type of BALANCE_PRIORITY) {
    const b = balances.find((x) => x.balance_type === type);
    if (b) return parseFloat(b.balance_amount.amount);
  }
  return balances.length > 0 ? parseFloat(balances[0].balance_amount.amount) : 0;
}

export function normalizeEbTransaction(
  tx: EbTransaction,
  accountId: string,
  tenantId: string,
  status: 'posted' | 'pending'
): {
  id: string;
  tenantId: string;
  accountId: string;
  status: string;
  madeOn: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  payee: string | null;
  payer: string | null;
  duplicated: boolean;
  reconciledAt: null;
} {
  const amount = parseFloat(tx.transaction_amount.amount);
  const date =
    tx.booking_date ?? tx.value_date ?? new Date().toISOString().slice(0, 10);

  const stableId =
    tx.entry_reference ?? `eb-${accountId}-${date}-${tx.transaction_amount.amount}`;

  return {
    id: stableId,
    tenantId,
    accountId,
    status,
    madeOn: date,
    amount,
    currency: tx.transaction_amount.currency,
    description: tx.remittance_information?.join(' ') ?? '',
    category: 'uncategorized',
    payee: tx.creditor?.name ?? null,
    payer: tx.debtor?.name ?? null,
    duplicated: false,
    reconciledAt: null,
  };
}
