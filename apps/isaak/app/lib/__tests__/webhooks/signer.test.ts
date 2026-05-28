/**
 * D1 — HMAC signer for outbound webhooks.
 *
 * Asserts:
 *  - signPayload is deterministic and matches a hand-computed HMAC reference.
 *  - verifySignature accepts the valid signature and rejects tampered
 *    timestamp/body/signature in constant time (no exception on garbage).
 */
import { createHmac } from 'crypto';
import { signPayload, verifySignature } from '../../webhooks/signer';

describe('webhooks/signer', () => {
  const secret = 'whsec_test_super_long_secret_value';
  const timestamp = '1716900000';
  const body = JSON.stringify({ id: 'evt_1', type: 'invoice.issued', data: { invoiceId: 'inv_1' } });

  test('signPayload is stable and matches the reference HMAC', () => {
    const sig = signPayload(secret, timestamp, body);
    const reference = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    expect(sig).toBe(reference);
    expect(sig).toHaveLength(64);
    // Same inputs → same output.
    expect(signPayload(secret, timestamp, body)).toBe(sig);
  });

  test('verifySignature accepts a valid signature', () => {
    const sig = signPayload(secret, timestamp, body);
    expect(verifySignature(secret, timestamp, body, sig)).toBe(true);
  });

  test('verifySignature rejects when body is tampered', () => {
    const sig = signPayload(secret, timestamp, body);
    expect(verifySignature(secret, timestamp, body + ' ', sig)).toBe(false);
  });

  test('verifySignature rejects when timestamp is tampered', () => {
    const sig = signPayload(secret, timestamp, body);
    expect(verifySignature(secret, String(Number(timestamp) + 1), body, sig)).toBe(false);
  });

  test('verifySignature rejects when secret is wrong', () => {
    const sig = signPayload(secret, timestamp, body);
    expect(verifySignature('other_secret', timestamp, body, sig)).toBe(false);
  });

  test('verifySignature returns false (does not throw) on malformed signature', () => {
    expect(verifySignature(secret, timestamp, body, '')).toBe(false);
    expect(verifySignature(secret, timestamp, body, 'not-hex!!')).toBe(false);
    // Wrong length — different byte count.
    expect(verifySignature(secret, timestamp, body, 'ab')).toBe(false);
  });
});
