/**
 * Shared types for the Isaak Platform SDK.
 *
 * These mirror the public OpenAPI contract documented at
 * https://verifactu.business/developers/api
 */

/** Envelope returned by every successful Isaak API response. */
export interface ApiResponse<T> {
  ok: true;
  data: T;
  requestId: string;
}

/** Cursor-based pagination envelope. */
export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  requestId: string;
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

/** Standard error envelope returned by the API for non-2xx responses. */
export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/** Tenant / company identity attached to the API key. */
export interface Company {
  id: string;
  legalName: string;
  cif: string;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  verifactuEnabled: boolean;
  certificateExpiresAt?: string | null;
  createdAt: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'issued'
  | 'rejected'
  | 'cancelled';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  /** Optional discount percentage (0-100). */
  discount?: number;
}

export interface InvoiceCustomer {
  name: string;
  cif?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface Invoice {
  id: string;
  number?: string | null;
  status: InvoiceStatus;
  issueDate?: string | null;
  customer: InvoiceCustomer;
  lines: InvoiceLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  currency: string;
  verifactuHash?: string | null;
  aeatStatus?: 'pending' | 'registered' | 'rejected' | null;
  rejectionReason?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  customer: InvoiceCustomer;
  lines: InvoiceLine[];
  /** ISO date (YYYY-MM-DD). Defaults to today on the server. */
  issueDate?: string;
  /** Free-form notes that show on the PDF. */
  notes?: string;
  /** Override the invoice numbering series. */
  series?: string;
  currency?: string;
}

export interface ListInvoicesParams {
  /** Inclusive ISO date. */
  from?: string;
  /** Inclusive ISO date. */
  to?: string;
  status?: InvoiceStatus;
  limit?: number;
  cursor?: string;
}

export interface IssueInvoiceInput {
  /**
   * The confirmation token returned by a previous 428 response,
   * required to commit the irreversible AEAT submission.
   */
  confirmationToken: string;
}

export type ApiKeyScope =
  | 'isaak.invoices.read'
  | 'isaak.invoices.write'
  | 'isaak.company.read'
  | 'isaak.verifactu.read'
  | 'isaak.audit.read'
  | 'isaak.keys.read'
  | 'isaak.keys.write'
  | 'isaak.fiscal.read';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
}

/** Response returned only when creating a key (plaintext shown once). */
export type CreatedApiKey = ApiKey & {
  /** The plaintext key. Only returned in the create response; store it securely. */
  plaintext: string;
};

/** Webhook event envelope received by your endpoint. */
export interface WebhookEvent<T = unknown> {
  id: string;
  type: string;
  createdAt: string;
  tenantId: string;
  data: T;
}
