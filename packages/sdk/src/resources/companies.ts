import type { IsaakClient } from '../client.js';
import type { ApiResponse, Company } from '../types.js';

/**
 * `client.companies` — read the tenant/company the API key belongs to.
 */
export class CompaniesResource {
  constructor(private readonly client: IsaakClient) {}

  /** Return the company linked to the API key currently in use. */
  async getCurrent(): Promise<Company> {
    const res = await this.client.request<ApiResponse<Company>>(
      '/api/v1/companies/current',
    );
    return res.data;
  }
}
