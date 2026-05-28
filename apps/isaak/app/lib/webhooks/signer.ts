/**
 * HMAC-SHA256 signer for outbound Isaak webhooks.
 *
 * The signed string is `<timestamp>.<body>` (exactly that — dot separator,
 * unix seconds, then the raw JSON body). The signature is the hex digest.
 *
 * Customers verify by recomputing `HMAC_SHA256(secret, "<timestamp>.<body>")`
 * with the secret they got at endpoint creation and comparing in
 * constant-time against the `x-isaak-signature` header. This format is
 * documented at /developers/guides/webhooks-hmac.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Compute the signature for a webhook payload.
 *
 * @param secret    The endpoint's shared secret (plain text — never logged).
 * @param timestamp Unix timestamp in seconds, as a string. We pass it as a
 *                  string so the caller controls truncation/format and the
 *                  exact value sent on the `x-isaak-timestamp` header is the
 *                  same one used for signing.
 * @param body      Raw JSON body that will be sent on the wire. Must be the
 *                  exact byte sequence the customer will see (no extra
 *                  whitespace, no re-stringification).
 */
export function signPayload(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * Constant-time signature verification. Returns `false` when the signature
 * format is invalid (wrong length, non-hex chars) instead of throwing —
 * webhook receivers must never crash on malformed input.
 */
export function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (typeof signature !== 'string' || signature.length === 0) return false;

  const expected = signPayload(secret, timestamp, body);
  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    // Buffer.from(..., 'hex') silently drops invalid chars, which would make
    // the lengths mismatch and throw inside timingSafeEqual. Treat as "no".
    return false;
  }
}
