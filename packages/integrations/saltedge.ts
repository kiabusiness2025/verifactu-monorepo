/**
 * Salt Edge API v6 client — Open Banking / PSD2
 * Docs: https://docs.saltedge.com/v6/
 *
 * Cubre: customers, connect sessions, accounts, transactions, webhooks.
 * Usado para conciliación bancaria con entidades españolas.
 *
 * Migrado de v5 a v6 (v5 deprecada Oct 2025).
 * Cambios principales:
 *  - Base URL: /api/v5 → /api/v6
 *  - Connect sessions: /connect_sessions/create → /connections/connect
 *  - Sin Customer-secret header; se usa customer_id en query/body
 *  - Customer object: campo id → customer_id
 *  - Scopes renombrados: account_details → accounts+balance, transactions_details → transactions
 *  - Webhook: verificación RSA-SHA256 (no HMAC)
 */

import crypto from 'crypto';

const SE_BASE_URL = 'https://www.saltedge.com/api/v6';

// Clave pública de Salt Edge v6 para verificar firmas de callbacks
// Fuente: https://docs.saltedge.com/v6/#request_identification
const SE_V6_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8qxSS5BmftHK/eyW+o98
NR89TyDmz1V8e6yyFdoMPddEYN4Bcidkk2whoJEc/T/AKghHQ9Nq+DuebnRYYcSJ
YT99VbR1PpIw2R9i8z+DZ79hoizy6z+rwxGANnJOr5BDF5HUKJ8uKS9yGRieojFv
Y9j+rxH6Fj6P90bO4d2igYYspKVoI3Zb3hWS0LrWN+JXAaW9qcOmQPTgO0WG0MUK
gB3NNMfN7gMIkl3chbaULiEgVciP2qZTIGb1b7IDr5+fA9oVVGaXiybdieGHIa4J
S7JNTf0JjWrIKd2DaczKULnghqNQsnoCu+S8BurEOJR5EN1BBfQBPlbSh+ru1zgZ
AQIDAQAB
-----END PUBLIC KEY-----`;

function getCredentials(): { appId: string; secret: string } {
  const appId = process.env.SALTEDGE_APP_ID?.trim();
  const secret = process.env.SALTEDGE_SECRET?.trim();
  if (!appId || !secret) throw new Error('SALTEDGE_APP_ID / SALTEDGE_SECRET not configured');
  return { appId, secret };
}

async function seFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { appId, secret } = getCredentials();

  const headers: Record<string, string> = {
    'App-id': appId,
    Secret: secret,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${SE_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new SaltEdgeError(res.status, body);
  }

  return res.json() as Promise<T>;
}

export class SaltEdgeError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Salt Edge API error ${status}: ${body}`);
    this.name = 'SaltEdgeError';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type SECustomer = {
  customer_id: string; // v6: campo renombrado de id → customer_id
  identifier: string;
  // Sin secret en v6 — se usa customer_id directamente
};

export type SEConnectSession = {
  expires_at: string;
  connect_url: string;
};

export type SEConnection = {
  id: string;
  customer_id: string; // v6: incluido en la respuesta
  provider_id: string;
  provider_name: string;
  status:
    | 'active'
    | 'inactive'
    | 'disabled'
    | 'pending'
    | 'otp_required'
    | 'redirect_required'
    | 'finish';
  last_success_at: string | null;
  next_refresh_possible_at: string | null;
  country_code: string;
  created_at: string;
  updated_at: string;
  categorization: string;
  automatic_refresh: boolean; // v6: reemplaza daily_refresh
};

export type SEAccount = {
  id: string;
  name: string;
  nature: string; // 'account' | 'card' | 'savings' | 'checking' | ...
  balance: number;
  currency_code: string;
  status: 'active' | 'inactive';
  connection_id: string;
  created_at: string;
  updated_at: string;
  extra: {
    iban?: string;
    account_number?: string;
    sort_code?: string;
    swift?: string;
  };
};

export type SETransaction = {
  id: string;
  duplicated: boolean;
  mode: 'normal' | 'fee' | 'transfer';
  status: 'posted' | 'pending';
  made_on: string; // YYYY-MM-DD
  amount: number; // negative = gasto, positive = ingreso
  currency_code: string;
  description: string;
  category: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  extra: {
    merchant_id?: string;
    original_amount?: number;
    original_currency_code?: string;
    payee?: string;
    payer?: string;
    payment_type?: string;
    record_number?: string;
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Customers — un customer por tenant
// ──────────────────────────────────────────────────────────────────────────────

export async function createSECustomer(identifier: string): Promise<SECustomer> {
  const { data } = await seFetch<{ data: SECustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({ data: { identifier } }),
  });
  return data;
}

export async function getSECustomer(id: string): Promise<SECustomer> {
  const { data } = await seFetch<{ data: SECustomer }>(`/customers/${id}`);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Connect Sessions — flujo de autorización bancaria (hosted widget)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Inicia el flujo de conexión bancaria (v6).
 * El usuario es redirigido a `connect_url` para autenticarse con su banco.
 * Endpoint v6: POST /connections/connect (era /connect_sessions/create en v5)
 */
export async function createConnectSession(params: {
  customerId: string; // v6: customer_id (no customer-secret)
  returnTo: string;
  countryCode?: string;
  providerCode?: string;
  consent?: {
    scopes: ('accounts' | 'balance' | 'transactions' | 'holder_info')[];
    from_date?: string;
  };
}): Promise<SEConnectSession> {
  const { data } = await seFetch<{ data: SEConnectSession }>('/connections/connect', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        customer_id: params.customerId,
        consent: params.consent ?? {
          scopes: ['accounts', 'balance', 'transactions'],
          from_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        attempt: {
          return_to: params.returnTo,
          ...(params.countryCode ? { country_code: params.countryCode } : {}),
          ...(params.providerCode ? { provider_code: params.providerCode } : {}),
        },
      },
    }),
  });
  return data;
}

/**
 * Reconecta una conexión existente (v6).
 * Endpoint v6: POST /connections/{id}/reconnect (era /connect_sessions/reconnect en v5)
 */
export async function reconnectSession(params: {
  connectionId: string;
  customerId: string;
  returnTo: string;
}): Promise<SEConnectSession> {
  const { data } = await seFetch<{ data: SEConnectSession }>(
    `/connections/${params.connectionId}/reconnect`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          customer_id: params.customerId,
          attempt: { return_to: params.returnTo },
        },
      }),
    }
  );
  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Connections — estado de conexiones bancarias
// ──────────────────────────────────────────────────────────────────────────────

export async function getConnection(connectionId: string): Promise<SEConnection> {
  const { data } = await seFetch<{ data: SEConnection }>(`/connections/${connectionId}`);
  return data;
}

export async function listConnections(customerId: string): Promise<SEConnection[]> {
  const { data } = await seFetch<{ data: SEConnection[] }>(
    `/connections?customer_id=${customerId}`
  );
  return data;
}

export async function removeConnection(connectionId: string): Promise<void> {
  await seFetch(`/connections/${connectionId}`, { method: 'DELETE' });
}

// ──────────────────────────────────────────────────────────────────────────────
// Accounts — cuentas bancarias de una conexión
// ──────────────────────────────────────────────────────────────────────────────

export async function listAccounts(connectionId: string): Promise<SEAccount[]> {
  const { data } = await seFetch<{ data: SEAccount[] }>(`/accounts?connection_id=${connectionId}`);
  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Transactions — movimientos bancarios
// ──────────────────────────────────────────────────────────────────────────────

export async function listTransactions(params: {
  connectionId: string; // v6: requerido para filtrar por conexión
  accountId: string;
  fromId?: string;
  fromDate?: string;
  toDate?: string;
  pending?: boolean; // v6: parámetro en query (era endpoint separado en v5)
}): Promise<{ transactions: SETransaction[]; nextId: string | null }> {
  const qs = new URLSearchParams({
    connection_id: params.connectionId,
    account_id: params.accountId,
  });
  if (params.fromId) qs.set('from_id', params.fromId);
  if (params.fromDate) qs.set('from_date', params.fromDate);
  if (params.toDate) qs.set('to_date', params.toDate);
  if (params.pending) qs.set('pending', 'true');

  const res = await seFetch<{ data: SETransaction[]; meta: { next_id: string | null } }>(
    `/transactions?${qs.toString()}`
  );

  return { transactions: res.data, nextId: res.meta.next_id };
}

// ──────────────────────────────────────────────────────────────────────────────
// Providers — lista de bancos disponibles en España
// ──────────────────────────────────────────────────────────────────────────────

export type SEProvider = {
  id: string;
  code: string;
  name: string;
  country_code: string;
  status: string;
  logo_url: string;
  homepage_url: string;
  mode: string;
};

export async function listSpanishProviders(): Promise<SEProvider[]> {
  let providers: SEProvider[] = [];
  let fromId: string | null = null;

  do {
    const qs = new URLSearchParams({ country_code: 'ES', include_sandboxes: 'false' }); // v6: include_sandboxes (era include_fake_providers)
    if (fromId) qs.set('from_id', fromId);

    const res = await seFetch<{ data: SEProvider[]; meta: { next_id: string | null } }>(
      `/providers?${qs.toString()}`
    );
    providers = providers.concat(res.data);
    fromId = res.meta.next_id;
  } while (fromId);

  return providers;
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhooks — verificación de firma (v6: RSA-SHA256 con clave pública de SE)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que el callback proviene de Salt Edge v6.
 * El string firmado es: "callback_url|post_body"
 * Firma: RSA-SHA256 con la clave privada de Salt Edge, verificada con SE_V6_PUBLIC_KEY.
 *
 * @param callbackUrl  URL completa del endpoint webhook (ej: https://isaak.verifactu.business/api/isaak/banking/saltedge/webhook)
 * @param body         Body JSON crudo (como string)
 * @param signature    Header `Signature` de la request (base64)
 */
export function verifySaltEdgeWebhook(
  callbackUrl: string,
  body: string,
  signature: string
): boolean {
  try {
    const message = `${callbackUrl}|${body}`;
    const signatureBuffer = Buffer.from(signature, 'base64');
    return crypto.verify('sha256', Buffer.from(message), SE_V6_PUBLIC_KEY, signatureBuffer);
  } catch {
    return false;
  }
}
