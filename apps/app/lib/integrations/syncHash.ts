import { createHash } from 'crypto';

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const out: Record<string, unknown> = {};
    for (const [key, nested] of entries) out[key] = sortObject(nested);
    return out;
  }
  return value;
}

export function buildPayloadHash(payload: unknown): string {
  const normalized = JSON.stringify(sortObject(payload));
  return createHash('sha256').update(normalized).digest('hex');
}
