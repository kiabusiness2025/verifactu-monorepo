/**
 * Clase base para todos los errores específicos de la aplicación.
 * Permite capturar todos nuestros errores personalizados con un solo bloque `catch`.
 */
export class ApplicationError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // Mantiene un stack trace adecuado en entornos V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Representa un error de validación (HTTP 400 Bad Request).
 * Puede contener detalles estructurados sobre los fallos de validación.
 */
export class ValidationError extends ApplicationError {
  public readonly details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(400, message);
    this.details = details;
  }
}

/**
 * Representa un conflicto de recursos (HTTP 409 Conflict).
 * Por ejemplo, intentar crear un usuario con un email que ya existe.
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(409, message);
  }
}