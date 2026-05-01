import { randomBytes } from 'crypto';
import { ValidationError } from '../api/errors';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

type StoredToken = {
  tenantId: string;
  action: string;
  resourceId?: string;
  preview: Record<string, unknown>;
  expiresAt: number;
  used: boolean;
};

// In-process store — suitable for single-instance deployments.
// Replace with Redis or a DB table for multi-instance environments.
const tokenStore = new Map<string, StoredToken>();

export function createConfirmationToken(opts: {
  tenantId: string;
  action: string;
  resourceId?: string;
  preview: Record<string, unknown>;
}): { token: string; expiresAt: Date } {
  const token = `ctok_${randomBytes(16).toString('base64url')}`;
  const expiresAt = Date.now() + TTL_MS;
  tokenStore.set(token, {
    tenantId: opts.tenantId,
    action: opts.action,
    resourceId: opts.resourceId,
    preview: opts.preview,
    expiresAt,
    used: false,
  });
  return { token, expiresAt: new Date(expiresAt) };
}

export function consumeConfirmationToken(opts: {
  token: string;
  tenantId: string;
  action: string;
  resourceId?: string;
}): void {
  const stored = tokenStore.get(opts.token);

  if (!stored) throw new ValidationError('Token de confirmación no válido o expirado.');
  if (stored.used) throw new ValidationError('El token de confirmación ya fue utilizado.');
  if (Date.now() > stored.expiresAt)
    throw new ValidationError('El token de confirmación ha expirado. Inicia el proceso de nuevo.');
  if (stored.tenantId !== opts.tenantId || stored.action !== opts.action) {
    throw new ValidationError('Token de confirmación no válido para esta operación.');
  }
  if (opts.resourceId && stored.resourceId !== opts.resourceId) {
    throw new ValidationError('Token de confirmación no válido para este recurso.');
  }

  stored.used = true;
  tokenStore.set(opts.token, stored);

  // Clean up async — fire and forget
  setTimeout(() => tokenStore.delete(opts.token), 60_000);
}
