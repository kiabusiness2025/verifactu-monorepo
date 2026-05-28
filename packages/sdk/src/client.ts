import { buildAuthHeaders, buildUserAgent } from './auth.js';
import {
  IsaakError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from './errors.js';
import { CompaniesResource } from './resources/companies.js';
import { InvoicesResource } from './resources/invoices.js';
import { KeysResource } from './resources/keys.js';
import { isErrorRetriable, withRetry } from './retry.js';

/** SDK version — kept in sync with package.json by the publish workflow. */
export const SDK_VERSION = '0.1.0';

const DEFAULT_BASE_URL = 'https://isaak.verifactu.business';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export interface IsaakClientConfig {
  /** API key starting with `isk_live_` or `isk_test_`. */
  apiKey: string;
  /** Override the base URL (e.g. for staging). */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default: 30_000. */
  timeout?: number;
  /** Max retry attempts for retriable failures. Default: 3. */
  maxRetries?: number;
  /** Custom fetch implementation (useful in tests / Workers). */
  fetch?: typeof fetch;
  /** Extra headers added to every request. */
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Set to true for endpoints that should return a binary Blob. */
  responseType?: 'json' | 'blob';
  /**
   * When true, the SDK will auto-generate an `Idempotency-Key` header for
   * non-idempotent methods so the request becomes retry-safe.
   */
  idempotent?: boolean;
  /** Override the request-level timeout. */
  timeout?: number;
  /** Skip retries for this request. */
  noRetry?: boolean;
}

/**
 * The top-level entry point of the Isaak Platform SDK.
 *
 * @example
 * ```ts
 * const isaak = new IsaakClient({ apiKey: process.env.ISAAK_API_KEY! });
 * const me = await isaak.companies.getCurrent();
 * ```
 */
export class IsaakClient {
  public readonly companies: CompaniesResource;
  public readonly invoices: InvoicesResource;
  public readonly keys: KeysResource;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: IsaakClientConfig) {
    if (!config || typeof config !== 'object') {
      throw new TypeError('IsaakClient: config object is required.');
    }
    if (!config.apiKey) {
      throw new TypeError('IsaakClient: `apiKey` is required.');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultHeaders = config.defaultHeaders ?? {};

    const resolvedFetch = config.fetch ?? globalThis.fetch;
    if (!resolvedFetch) {
      throw new TypeError(
        'IsaakClient: no global fetch found. Provide `config.fetch` (e.g. node-fetch) or upgrade to Node 18+.',
      );
    }
    this.fetchImpl = resolvedFetch.bind(globalThis);

    this.companies = new CompaniesResource(this);
    this.invoices = new InvoicesResource(this);
    this.keys = new KeysResource(this);
  }

  /**
   * Low-level request helper. Resource modules wrap this for ergonomics, but
   * it's exported so power users can call endpoints the SDK doesn't model
   * yet.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? 'GET').toUpperCase() as Required<RequestOptions>['method'];
    const url = this.buildUrl(path, options.query);
    const headers = this.buildHeaders(method, options);
    const bodyInit = serializeBody(options.body, headers);

    const hasIdempotencyKey = Boolean(headers['Idempotency-Key']);
    const requestContext = { method, hasIdempotencyKey };

    const runOnce = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? this.timeout;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method,
          headers,
          body: bodyInit,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        if (isAbortError(err)) {
          throw new TimeoutError(
            `Request to ${url} aborted after ${timeoutMs}ms.`,
          );
        }
        throw new NetworkError(
          `Network error contacting Isaak API: ${describeError(err)}`,
          'network_error',
          err,
        );
      }
      clearTimeout(timer);

      if (!response.ok) {
        const parsed = await safeParseJson(response.clone());
        const error = IsaakError.fromResponse(response, parsed);
        if (error instanceof RateLimitError) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            const seconds = Number(retryAfter);
            if (Number.isFinite(seconds) && seconds > 0) {
              (error as { retryAfterSeconds?: number }).retryAfterSeconds = seconds;
            }
          }
        }
        throw error;
      }

      if (options.responseType === 'blob') {
        return (await response.blob()) as unknown as T;
      }

      if (response.status === 204) return undefined as unknown as T;

      const json = await safeParseJson(response);
      return json as T;
    };

    if (options.noRetry) {
      return runOnce();
    }

    return withRetry(runOnce, {
      maxRetries: this.maxRetries,
      isRetriable: (err) => isErrorRetriable(err, requestContext),
    });
  }

  private buildUrl(
    path: string,
    query?: RequestOptions['query'],
  ): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    let url = `${this.baseUrl}${normalized}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private buildHeaders(
    method: string,
    options: RequestOptions,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': buildUserAgent(SDK_VERSION),
      ...this.defaultHeaders,
      ...buildAuthHeaders(this.apiKey),
      ...(options.headers ?? {}),
    };

    if (options.body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (
      options.idempotent &&
      method !== 'GET' &&
      !headers['Idempotency-Key']
    ) {
      headers['Idempotency-Key'] = generateIdempotencyKey();
    }

    return headers;
  }
}

function serializeBody(
  body: unknown,
  headers: Record<string, string>,
): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
    return body as BodyInit;
  }
  if (typeof body === 'object') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return JSON.stringify(body);
  }
  return String(body);
}

async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || /aborted/i.test(err.message))
  );
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Generate an RFC 4122-ish v4 identifier without pulling in `crypto.randomUUID`
 * fallbacks. Good enough for idempotency keys, which only need to be unique
 * within the retry window.
 */
function generateIdempotencyKey(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Best-effort fallback for environments without randomUUID.
  const rnd = (n: number): string => {
    let out = '';
    for (let i = 0; i < n; i += 1) {
      out += Math.floor(Math.random() * 16).toString(16);
    }
    return out;
  };
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-a${rnd(3)}-${rnd(12)}`;
}
