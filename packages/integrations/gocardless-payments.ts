/**
 * GoCardless Payments API client
 * Docs: https://developer.gocardless.com/api-reference
 *
 * Cubre: mandatos SEPA, pagos, reembolsos, eventos de webhook.
 * Entorno: live (producción), sandbox para pruebas.
 */

import crypto from 'crypto';

const GC_BASE_URL = 'https://api.gocardless.com';

function cleanEnv(value?: string | null): string {
  return value?.replace(/[\r\n]/g, '').trim() || '';
}

function getToken(): string {
  const token = cleanEnv(process.env.ISAAK_GOCARDLESS_API_KEY);
  if (!token) throw new Error('ISAAK_GOCARDLESS_API_KEY is not configured');
  return token;
}

async function gcFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GC_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'GoCardless-Version': '2015-07-06',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GoCardlessError(res.status, body);
  }

  return res.json() as Promise<T>;
}

export class GoCardlessError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`GoCardless API error ${status}: ${body}`);
    this.name = 'GoCardlessError';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type GCCustomer = {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  company_name: string | null;
  phone_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  created_at: string;
};

export type GCMandate = {
  id: string;
  status:
    | 'pending_customer_approval'
    | 'pending_submission'
    | 'submitted'
    | 'active'
    | 'failed'
    | 'cancelled'
    | 'expired';
  scheme: string;
  created_at: string;
  next_possible_charge_date: string | null;
  links: { customer: string; customer_bank_account: string };
};

export type GCPayment = {
  id: string;
  status:
    | 'pending_customer_approval'
    | 'pending_submission'
    | 'submitted'
    | 'confirmed'
    | 'paid_out'
    | 'cancelled'
    | 'customer_approval_denied'
    | 'failed'
    | 'charged_back';
  amount: number; // in pence/cents
  currency: string;
  charge_date: string;
  description: string | null;
  reference: string | null;
  created_at: string;
  links: { mandate: string };
};

export type GCBillingRequest = {
  id: string;
  status: string;
  links: { billing_request_flow?: string };
};

export type GCBillingRequestFlow = {
  id: string;
  authorisation_url: string;
  expires_at: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Customers
// ──────────────────────────────────────────────────────────────────────────────

export async function createCustomer(params: {
  email: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  phone_number?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
}): Promise<GCCustomer> {
  const { customers } = await gcFetch<{ customers: GCCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({ customers: params }),
  });
  return customers;
}

export async function getCustomer(id: string): Promise<GCCustomer> {
  const { customers } = await gcFetch<{ customers: GCCustomer }>(`/customers/${id}`);
  return customers;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mandates
// ──────────────────────────────────────────────────────────────────────────────

export async function listMandates(customerId: string): Promise<GCMandate[]> {
  const { mandates } = await gcFetch<{ mandates: GCMandate[] }>(`/mandates?customer=${customerId}`);
  return mandates;
}

export async function getMandate(id: string): Promise<GCMandate> {
  const { mandates } = await gcFetch<{ mandates: GCMandate }>(`/mandates/${id}`);
  return mandates;
}

// ──────────────────────────────────────────────────────────────────────────────
// Payments
// ──────────────────────────────────────────────────────────────────────────────

export async function createPayment(params: {
  amount: number; // in pence/cents
  currency: string; // 'EUR' | 'GBP' ...
  charge_date?: string; // 'YYYY-MM-DD', defaults to next available
  description?: string;
  reference?: string;
  mandate_id: string;
}): Promise<GCPayment> {
  const { mandate_id, ...rest } = params;
  const { payments } = await gcFetch<{ payments: GCPayment }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      payments: {
        ...rest,
        links: { mandate: mandate_id },
      },
    }),
  });
  return payments;
}

export async function getPayment(id: string): Promise<GCPayment> {
  const { payments } = await gcFetch<{ payments: GCPayment }>(`/payments/${id}`);
  return payments;
}

export async function cancelPayment(id: string): Promise<GCPayment> {
  const { payments } = await gcFetch<{ payments: GCPayment }>(`/payments/${id}/actions/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return payments;
}

// ──────────────────────────────────────────────────────────────────────────────
// Billing Requests (hosted mandate + payment setup flow)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crea un billing request y su flujo de autorización (URL donde el cliente
 * autoriza el mandato SEPA desde su banco).
 */
export async function createMandateSetupLink(params: {
  customer_email: string;
  given_name?: string;
  family_name?: string;
  company_name?: string;
  redirect_uri: string;
  exit_uri?: string;
  description?: string;
}): Promise<{ billing_request_id: string; authorisation_url: string; expires_at: string }> {
  // 1. Create billing request
  const { billing_requests: br } = await gcFetch<{ billing_requests: GCBillingRequest }>(
    '/billing_requests',
    {
      method: 'POST',
      body: JSON.stringify({
        billing_requests: {
          mandate_request: { scheme: 'sepa_core' },
          prefilled_customer: {
            email: params.customer_email,
            given_name: params.given_name,
            family_name: params.family_name,
            company_name: params.company_name,
          },
        },
      }),
    }
  );

  // 2. Create billing request flow (hosted URL)
  const { billing_request_flows: flow } = await gcFetch<{
    billing_request_flows: GCBillingRequestFlow;
  }>('/billing_request_flows', {
    method: 'POST',
    body: JSON.stringify({
      billing_request_flows: {
        redirect_uri: params.redirect_uri,
        exit_uri: params.exit_uri ?? params.redirect_uri,
        show_redirect_buttons: true,
        links: { billing_request: br.id },
      },
    }),
  });

  return {
    billing_request_id: br.id,
    authorisation_url: flow.authorisation_url,
    expires_at: flow.expires_at,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 de un webhook de GoCardless.
 * Usar en el handler de /api/isaak/banking/webhook.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): boolean {
  const expected = crypto.createHmac('sha256', webhookSecret).update(payload, 'utf8').digest('hex');
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
