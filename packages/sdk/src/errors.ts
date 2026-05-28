import type { ApiErrorBody } from './types.js';

/**
 * Base error thrown by every Isaak SDK call when the API returns a non-2xx
 * response or the request itself fails.
 *
 * Use `instanceof IsaakError` for the catch-all case, or one of the typed
 * subclasses (e.g. `RateLimitError`) when you care about a specific failure
 * mode.
 */
export class IsaakError extends Error {
  public readonly name: string = 'IsaakError';

  constructor(
    message: string,
    /** Stable application-level code (e.g. `rate_limit_exceeded`). */
    public readonly code: string,
    /** HTTP status code of the response that triggered the error. */
    public readonly httpStatus: number,
    /** `requestId` echoed back by the API — include in support tickets. */
    public readonly requestId?: string,
    /** Raw `error.details` field, when the API provides one. */
    public readonly details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Build the right IsaakError subclass from a fetch Response and the parsed
   * (or partially parsed) body.
   */
  static fromResponse(res: Response, body: unknown): IsaakError {
    const requestId =
      res.headers.get('x-request-id') ?? extractRequestId(body) ?? undefined;
    const apiError = extractApiError(body);
    const code = apiError?.code ?? defaultCodeForStatus(res.status);
    const message =
      apiError?.message ?? `Isaak API request failed with HTTP ${res.status}`;
    const details = apiError?.details;

    const ctor = selectErrorClass(res.status, code);
    return new ctor(message, code, res.status, requestId, details);
  }
}

/** 401 — authentication missing, invalid or revoked. */
export class AuthenticationError extends IsaakError {
  public override readonly name = 'AuthenticationError';
}

/** 403 — token valid but lacks the required scope. */
export class PermissionError extends IsaakError {
  public override readonly name = 'PermissionError';
}

/** 404 — resource not found (or not visible to your tenant). */
export class NotFoundError extends IsaakError {
  public override readonly name = 'NotFoundError';
}

/** 409 — state of the resource is incompatible with the requested action. */
export class ConflictError extends IsaakError {
  public override readonly name = 'ConflictError';
}

/** 428 — confirmation required for an irreversible action. */
export class ConfirmationRequiredError extends IsaakError {
  public override readonly name = 'ConfirmationRequiredError';
}

/** 400 / 422 — request body or arguments failed validation. */
export class ValidationError extends IsaakError {
  public override readonly name = 'ValidationError';
}

/** 429 — rate limit exceeded. */
export class RateLimitError extends IsaakError {
  public override readonly name = 'RateLimitError';

  constructor(
    message: string,
    code: string,
    httpStatus: number,
    requestId?: string,
    details?: unknown,
    /** Seconds the caller should wait before retrying (Retry-After header). */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message, code, httpStatus, requestId, details);
  }
}

/** 5xx — Isaak (or an upstream like AEAT) failed. */
export class ServerError extends IsaakError {
  public override readonly name = 'ServerError';
}

/** Network-level failure: timeout, DNS, connection refused. */
export class NetworkError extends IsaakError {
  public override readonly name: string = 'NetworkError';
  public readonly networkCause?: unknown;

  constructor(message: string, code = 'network_error', cause?: unknown) {
    super(message, code, 0);
    this.networkCause = cause;
  }
}

/** Aborted because of the SDK's configured timeout. */
export class TimeoutError extends NetworkError {
  public override readonly name: string = 'TimeoutError';

  constructor(message = 'Request timed out') {
    super(message, 'timeout');
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'scope_insufficient';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation_error';
    case 428:
      return 'confirmation_required';
    case 429:
      return 'rate_limit_exceeded';
    case 500:
      return 'internal_error';
    case 502:
      return 'aeat_unavailable';
    case 503:
      return 'maintenance';
    case 504:
      return 'timeout';
    default:
      return status >= 500 ? 'server_error' : 'http_error';
  }
}

function selectErrorClass(
  status: number,
  code: string,
): new (
  message: string,
  code: string,
  httpStatus: number,
  requestId?: string,
  details?: unknown,
) => IsaakError {
  if (status === 401) return AuthenticationError;
  if (status === 403) return PermissionError;
  if (status === 404) return NotFoundError;
  if (status === 409) return ConflictError;
  if (status === 428) return ConfirmationRequiredError;
  if (status === 400 || status === 422) return ValidationError;
  if (status === 429) return RateLimitError;
  if (status >= 500) return ServerError;
  if (code === 'validation_error') return ValidationError;
  return IsaakError;
}

function extractApiError(body: unknown): ApiErrorBody['error'] | undefined {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object'
  ) {
    const err = body.error as Record<string, unknown>;
    if (typeof err.code === 'string' && typeof err.message === 'string') {
      return {
        code: err.code,
        message: err.message,
        details: err.details,
      };
    }
  }
  return undefined;
}

function extractRequestId(body: unknown): string | undefined {
  if (
    body &&
    typeof body === 'object' &&
    'requestId' in body &&
    typeof (body as { requestId: unknown }).requestId === 'string'
  ) {
    return (body as { requestId: string }).requestId;
  }
  return undefined;
}
