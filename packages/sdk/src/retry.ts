import { IsaakError, NetworkError, RateLimitError, TimeoutError } from './errors.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export interface RetryOptions {
  /** Max retry attempts, in addition to the initial attempt. Default: 3. */
  maxRetries?: number;
  /** Base backoff in ms. Default: 250. */
  baseDelayMs?: number;
  /** Max backoff in ms (cap for exponential growth). Default: 5000. */
  maxDelayMs?: number;
  /**
   * Override the retry decision. Receives the thrown error and the attempt
   * number (1 = first failure). Return true to retry.
   */
  isRetriable?: (error: unknown, attempt: number) => boolean;
  /** Sleep implementation (injectable for tests). */
  sleep?: (ms: number) => Promise<void>;
}

export interface RetryContext {
  /** HTTP method of the underlying request (uppercased). */
  method: string;
  /** True when the request carries an Idempotency-Key header. */
  hasIdempotencyKey: boolean;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide whether the given error is safe to retry for the request context.
 */
export function isErrorRetriable(
  error: unknown,
  context: RetryContext,
): boolean {
  const methodOk =
    IDEMPOTENT_METHODS.has(context.method) || context.hasIdempotencyKey;
  if (!methodOk) return false;

  if (error instanceof TimeoutError) return true;
  if (error instanceof NetworkError) return true;
  if (error instanceof RateLimitError) return true;
  if (error instanceof IsaakError) {
    return RETRYABLE_STATUS.has(error.httpStatus);
  }
  return false;
}

/**
 * Run `fn` with exponential backoff + full jitter.
 *
 * `fn` receives the current attempt number (1-indexed).
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const base = options.baseDelayMs ?? 250;
  const cap = options.maxDelayMs ?? 5_000;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt > maxRetries) throw err;
      const retry = options.isRetriable?.(err, attempt) ?? false;
      if (!retry) throw err;

      const retryAfterMs =
        err instanceof RateLimitError && err.retryAfterSeconds
          ? err.retryAfterSeconds * 1_000
          : undefined;

      const delay = retryAfterMs ?? computeBackoff(attempt, base, cap);
      await sleep(delay);
    }
  }
}

/** Exponential backoff with full jitter. Exposed for tests. */
export function computeBackoff(
  attempt: number,
  baseMs: number,
  capMs: number,
): number {
  const exp = Math.min(capMs, baseMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * exp);
}
