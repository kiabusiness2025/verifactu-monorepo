export class PermissionDeniedError extends Error {
  readonly code = 'permission_denied';
  readonly status = 403;
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export class MissingScopeError extends Error {
  readonly code = 'missing_scope';
  readonly status = 403;
  readonly missingScope: string;
  constructor(scope: string) {
    super(`El token no tiene el scope requerido: ${scope}`);
    this.name = 'MissingScopeError';
    this.missingScope = scope;
  }
}

export class TenantNotFoundError extends Error {
  readonly code = 'not_found';
  readonly status = 404;
  constructor(message = 'Empresa no encontrada.') {
    super(message);
    this.name = 'TenantNotFoundError';
  }
}

export class ValidationError extends Error {
  readonly code = 'validation_error';
  readonly status = 400;
  readonly fields?: Record<string, string>;
  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class ConfirmationRequiredError extends Error {
  readonly code = 'confirmation_required';
  readonly status = 202;
  readonly confirmationToken: string;
  readonly expiresAt: Date;
  readonly preview: Record<string, unknown>;
  constructor(opts: {
    confirmationToken: string;
    expiresAt: Date;
    preview: Record<string, unknown>;
  }) {
    super('Se requiere confirmación explícita para ejecutar esta acción.');
    this.name = 'ConfirmationRequiredError';
    this.confirmationToken = opts.confirmationToken;
    this.expiresAt = opts.expiresAt;
    this.preview = opts.preview;
  }
}

export class ResourceNotFoundError extends Error {
  readonly code = 'not_found';
  readonly status = 404;
  constructor(resource: string, id?: string) {
    super(id ? `${resource} con id '${id}' no encontrado.` : `${resource} no encontrado.`);
    this.name = 'ResourceNotFoundError';
  }
}

export class ExternalConnectorError extends Error {
  readonly code = 'external_connector_error';
  readonly status = 502;
  constructor(message: string) {
    super(message);
    this.name = 'ExternalConnectorError';
  }
}

export class VerifactuSubmissionError extends Error {
  readonly code = 'aeat_error';
  readonly status = 502;
  readonly details?: string;
  constructor(message: string, details?: string) {
    super(message);
    this.name = 'VerifactuSubmissionError';
    this.details = details;
  }
}

export class RateLimitError extends Error {
  readonly code = 'rate_limit_exceeded';
  readonly status = 429;
  readonly retryAfter: number;
  constructor(retryAfter = 60) {
    super('Has superado el límite de peticiones. Inténtalo más tarde.');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class AlreadySubmittedError extends Error {
  readonly code = 'already_submitted';
  readonly status = 409;
  constructor(resource = 'La factura') {
    super(`${resource} ya fue enviada anteriormente.`);
    this.name = 'AlreadySubmittedError';
  }
}

type KnownError =
  | PermissionDeniedError
  | MissingScopeError
  | TenantNotFoundError
  | ValidationError
  | ConfirmationRequiredError
  | ResourceNotFoundError
  | ExternalConnectorError
  | VerifactuSubmissionError
  | RateLimitError
  | AlreadySubmittedError;

export function isIsaakPlatformError(err: unknown): err is KnownError {
  return (
    err instanceof PermissionDeniedError ||
    err instanceof MissingScopeError ||
    err instanceof TenantNotFoundError ||
    err instanceof ValidationError ||
    err instanceof ConfirmationRequiredError ||
    err instanceof ResourceNotFoundError ||
    err instanceof ExternalConnectorError ||
    err instanceof VerifactuSubmissionError ||
    err instanceof RateLimitError ||
    err instanceof AlreadySubmittedError
  );
}
