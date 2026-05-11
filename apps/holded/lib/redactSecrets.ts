/**
 * R1 hardening (auditoría 2026-05-11): utilidad compartida para enmascarar
 * Holded API keys (hex de 32 chars) y otros secretos antes de cualquier log
 * server-side (console.*, logger.*).
 *
 * Reviewer de OpenAI / auditor de privacidad: si una API key aparece en logs
 * (Vercel function logs, Render server logs, observability pipelines) cuenta
 * como leak. Esta función se aplica de forma defensiva en todos los puntos
 * donde se serializan errores con `detail`/`message` arbitrarios.
 */

// Holded API keys actuales son hex de 32 chars (sin guiones). Conservadores:
// también matcheamos hex de 24–64 chars por si la longitud cambia.
const HEX_KEY_PATTERN = /\b[a-f0-9]{24,64}\b/gi;
// Bearer/Basic tokens en headers JSON
const BEARER_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._\-+/=]{12,}/g;
// JWT (3 base64url segments)
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

export function redactSecretsInString(input: string): string {
  if (!input) return input;
  return input
    .replace(HEX_KEY_PATTERN, '[REDACTED_KEY]')
    .replace(BEARER_PATTERN, '$1 [REDACTED]')
    .replace(JWT_PATTERN, '[REDACTED_JWT]');
}

export function redactSecrets<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') {
    return redactSecretsInString(value) as unknown as T;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // Nombres de campo sensibles → enmascarar completos
    if (/api[_-]?key|holded[_-]?api[_-]?key|secret|password|token/i.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redactSecrets(v);
    }
  }
  return out as unknown as T;
}
