export function logAuthError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[auth:${context}]`, msg, metadata ?? {});
}

export function logAuthWarning(context: string, message: string, metadata?: Record<string, unknown>) {
  console.warn(`[auth:${context}]`, message, metadata ?? {});
}

export function logAuthInfo(context: string, message: string, metadata?: Record<string, unknown>) {
  console.log(`[auth:${context}]`, message, metadata ?? {});
}
