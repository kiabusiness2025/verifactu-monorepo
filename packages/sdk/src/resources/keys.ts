import type { IsaakClient } from '../client.js';
import type {
  ApiKey,
  ApiResponse,
  CreateApiKeyInput,
  CreatedApiKey,
} from '../types.js';

/**
 * `client.keys` — manage API keys for the current tenant.
 *
 * The plaintext key is only returned by `create()` — store it immediately, it
 * cannot be retrieved again.
 */
export class KeysResource {
  constructor(private readonly client: IsaakClient) {}

  /** List all active keys for the tenant. */
  async list(): Promise<ApiKey[]> {
    const res = await this.client.request<ApiResponse<ApiKey[]>>(
      '/api/v1/keys',
    );
    return res.data;
  }

  /** Create a new key. The response includes the plaintext one-time. */
  async create(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    const res = await this.client.request<ApiResponse<CreatedApiKey>>(
      '/api/v1/keys',
      {
        method: 'POST',
        body: input,
        idempotent: true,
      },
    );
    return res.data;
  }
}
