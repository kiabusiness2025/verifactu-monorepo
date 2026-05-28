import type { IsaakClient } from '../client.js';
import type {
  ApiResponse,
  CreateInvoiceInput,
  Invoice,
  IssueInvoiceInput,
  ListInvoicesParams,
  PaginatedResponse,
} from '../types.js';

/**
 * `client.invoices` — list, fetch, create and issue invoices.
 *
 * Mutating methods (`create`, `issue`) send an `Idempotency-Key` automatically
 * so SDK retries are safe.
 */
export class InvoicesResource {
  constructor(private readonly client: IsaakClient) {}

  /** Paginated list. Use `pagination.nextCursor` to walk further. */
  async list(params: ListInvoicesParams = {}): Promise<PaginatedResponse<Invoice>> {
    return this.client.request<PaginatedResponse<Invoice>>('/api/v1/invoices', {
      query: {
        from: params.from,
        to: params.to,
        status: params.status,
        limit: params.limit,
        cursor: params.cursor,
      },
    });
  }

  /** Fetch a single invoice by ID. */
  async get(id: string): Promise<Invoice> {
    const res = await this.client.request<ApiResponse<Invoice>>(
      `/api/v1/invoices/${encodeURIComponent(id)}`,
    );
    return res.data;
  }

  /**
   * Create a draft invoice. The invoice is NOT submitted to AEAT — call
   * `issue()` once the user confirms.
   */
  async create(data: CreateInvoiceInput): Promise<Invoice> {
    const res = await this.client.request<ApiResponse<Invoice>>(
      '/api/v1/invoices',
      {
        method: 'POST',
        body: data,
        idempotent: true,
      },
    );
    return res.data;
  }

  /**
   * Submit a draft to AEAT (irreversible). Requires a `confirmationToken`
   * obtained from a previous 428 response.
   */
  async issue(id: string, input: IssueInvoiceInput): Promise<Invoice> {
    const res = await this.client.request<ApiResponse<Invoice>>(
      `/api/v1/invoices/${encodeURIComponent(id)}/issue`,
      {
        method: 'POST',
        body: input,
        idempotent: true,
      },
    );
    return res.data;
  }

  /** Download the legal PDF of an issued invoice as a `Blob`. */
  async getPdf(id: string): Promise<Blob> {
    return this.client.request<Blob>(
      `/api/v1/invoices/${encodeURIComponent(id)}/pdf`,
      {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      },
    );
  }
}
