/**
 * Webhook signature verifier for Isaak Platform events.
 *
 * Isaak sends webhooks with two headers:
 *   - `x-isaak-signature`  HMAC-SHA256(`${timestamp}.${rawBody}`, secret) in hex
 *   - `x-isaak-timestamp`  Unix seconds (string)
 *
 * Use the raw, unparsed body. Parsing/serializing JSON will change whitespace
 * and break the signature.
 */

export interface VerifyWebhookOptions {
  /** Raw request body as received (string or Uint8Array). */
  body: string | Uint8Array;
  /** Value of `x-isaak-signature`. */
  signatureHeader: string | null | undefined;
  /** Value of `x-isaak-timestamp`. */
  timestampHeader: string | null | undefined;
  /** The endpoint signing secret, e.g. `whsec_...`. */
  secret: string;
  /**
   * Maximum age of the event in seconds before it's considered replayed.
   * Defaults to 300 (5 minutes), matching the documented anti-replay window.
   */
  toleranceSeconds?: number;
  /** Override `Date.now()` — useful for tests. Returns ms since epoch. */
  now?: () => number;
}

export type WebhookVerifyFailureReason =
  | 'invalid_signature'
  | 'timestamp_out_of_window'
  | 'malformed';

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; reason: WebhookVerifyFailureReason };

const TEXT_ENCODER = new TextEncoder();

/**
 * Verify the signature attached to an incoming Isaak webhook.
 *
 * Returns `{ ok: true }` if the signature, timestamp and tolerance all match.
 * On any failure it returns `{ ok: false, reason }` instead of throwing — the
 * caller decides how to log / 4xx the response.
 */
export async function verifyWebhookSignature(
  options: VerifyWebhookOptions,
): Promise<WebhookVerifyResult> {
  const {
    body,
    signatureHeader,
    timestampHeader,
    secret,
    toleranceSeconds = 300,
    now = () => Date.now(),
  } = options;

  if (!signatureHeader || !timestampHeader || !secret) {
    return { ok: false, reason: 'malformed' };
  }

  const tsSeconds = Number(timestampHeader);
  if (!Number.isFinite(tsSeconds) || tsSeconds <= 0) {
    return { ok: false, reason: 'malformed' };
  }

  const ageSeconds = Math.abs(now() / 1000 - tsSeconds);
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, reason: 'timestamp_out_of_window' };
  }

  const rawBody = typeof body === 'string' ? body : decodeBytes(body);
  const payload = `${timestampHeader}.${rawBody}`;
  const expected = await hmacSha256Hex(secret, payload);

  return timingSafeEqualHex(signatureHeader, expected)
    ? { ok: true }
    : { ok: false, reason: 'invalid_signature' };
}

function decodeBytes(input: Uint8Array): string {
  // Webhook bodies are JSON-text; UTF-8 is the right decoder.
  return new TextDecoder('utf-8').decode(input);
}

/**
 * Compute HMAC-SHA256 in hex. Uses Web Crypto when available, falls back to
 * node:crypto via dynamic import for older Node bundles or non-WebCrypto
 * runtimes.
 */
async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const subtle = getSubtle();
  if (subtle) {
    const key = await subtle.importKey(
      'raw',
      TEXT_ENCODER.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await subtle.sign('HMAC', key, TEXT_ENCODER.encode(payload));
    return bufferToHex(new Uint8Array(sig));
  }

  // Fallback: node:crypto
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function getSubtle(): SubtleCrypto | null {
  const g = globalThis as { crypto?: { subtle?: SubtleCrypto } };
  return g.crypto?.subtle ?? null;
}

function bufferToHex(buf: Uint8Array): string {
  let out = '';
  for (let i = 0; i < buf.length; i += 1) {
    out += buf[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Constant-time comparison of two hex strings. Lengths must match first;
 * comparison runs in O(n) of the *expected* length regardless of mismatches.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
