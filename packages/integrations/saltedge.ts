/**
 * Salt Edge API v5 client — Open Banking / PSD2
 * Docs: https://docs.saltedge.com/account_information/v5/
 *
 * Cubre: customers, connect sessions, accounts, transactions, webhooks.
 * Usado para conciliación bancaria con entidades españolas.
 */

import crypto from 'crypto';

const SE_BASE_URL = 'https://www.saltedge.com/api/v5';

function getCredentials(): { appId: string; secret: string } {
  const appId = process.env.SALTEDGE_APP_ID?.trim();
  const secret = process.env.SALTEDGE_SECRET?.trim();
  if (!appId || !secret) throw new Error('SALTEDGE_APP_ID / SALTEDGE_SECRET not configured');
  return { appId, secret };
}

async function seFetch<T>(
  path: string,
  options: RequestInit & { customerSecret?: string } = {}
): Promise<T> {
  const { appId, secret } = getCredentials();
  const { customerSecret, ...rest } = options;

  const headers: Record<string, string> = {
    'App-id': appId,
    Secret: secret,
    'Content-Type': 'application/json',
  };
  if (customerSecret) headers['Customer-secret'] = customerSecret;

  const res = await fetch(`${SE_BASE_URL}${path}`, { ...rest, headers });

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
  id: string;
  identifier: string;
  secret: string;
};

export type SEConnectSession = {
  expires_at: string;
  connect_url: string;
};

export type SEConnection = {
  id: string;
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
// Connect Sessions — flujo de autorización bancaria (hosted)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crea una sesión de conexión.
 * El usuario es redirigido a `connect_url` para autenticarse con su banco.
 * Tras completarlo, Salt Edge redirige a `return_to` con el connection_id.
 */
export async function createConnectSession(params: {
  customerSecret: string;
  returnTo: string; // URL de callback de Verifactu
  countryCode?: string; // 'ES' por defecto
  providerCode?: string; // si quieres ir directamente a un banco concreto
  consent?: {
    scopes: ('account_details' | 'transactions_details' | 'holder_information')[];
    from_date?: string; // YYYY-MM-DD
  };
}): Promise<SEConnectSession> {
  const { data } = await seFetch<{ data: SEConnectSession }>('/connect_sessions/create', {
    method: 'POST',
    customerSecret: params.customerSecret,
    body: JSON.stringify({
      data: {
        customer_id: undefined, // no necesario cuando se usa customer-secret header
        consent: params.consent ?? {
          scopes: ['account_details', 'transactions_details'],
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

// ──────────────────────────────────────────────────────────────────────────────
// Connections — estado de conexiones bancarias
// ──────────────────────────────────────────────────────────────────────────────

export async function getConnection(
  connectionId: string,
  customerSecret: string
): Promise<SEConnection> {
  const { data } = await seFetch<{ data: SEConnection }>(`/connections/${connectionId}`, {
    customerSecret,
  });
  return data;
}

export async function listConnections(customerSecret: string): Promise<SEConnection[]> {
  const { data } = await seFetch<{ data: SEConnection[] }>('/connections', {
    customerSecret,
  });
  return data;
}

export async function removeConnection(
  connectionId: string,
  customerSecret: string
): Promise<void> {
  await seFetch(`/connections/${connectionId}`, {
    method: 'DELETE',
    customerSecret,
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Accounts — cuentas bancarias de una conexión
// ──────────────────────────────────────────────────────────────────────────────

export async function listAccounts(
  connectionId: string,
  customerSecret: string
): Promise<SEAccount[]> {
  const { data } = await seFetch<{ data: SEAccount[] }>(`/accounts?connection_id=${connectionId}`, {
    customerSecret,
  });
  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Transactions — movimientos bancarios
// ──────────────────────────────────────────────────────────────────────────────

export async function listTransactions(params: {
  accountId: string;
  customerSecret: string;
  fromId?: string; // paginación: ID del último transaction visto
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
}): Promise<{ transactions: SETransaction[]; nextId: string | null }> {
  const qs = new URLSearchParams({ account_id: params.accountId });
  if (params.fromId) qs.set('from_id', params.fromId);
  if (params.fromDate) qs.set('from_date', params.fromDate);
  if (params.toDate) qs.set('to_date', params.toDate);

  const res = await seFetch<{ data: SETransaction[]; meta: { next_id: string | null } }>(
    `/transactions?${qs.toString()}`,
    { customerSecret: params.customerSecret }
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

  // Salt Edge pagina los providers — iteramos hasta tener todos los españoles
  do {
    const qs = new URLSearchParams({ country_code: 'ES', include_fake_providers: 'false' });
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
// Webhooks — verificación de firma
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Salt Edge firma los webhooks con el App-secret en el header `Signature`.
 * El payload es el body JSON como string.
 */
export function verifySaltEdgeWebhook(payload: string, signature: string, secret: string): boolean {
  // Salt Edge usa HMAC-SHA256 en base64
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
