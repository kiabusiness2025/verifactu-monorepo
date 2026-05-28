import { createHmac } from 'node:crypto';
import { timingSafeEqualHex, verifyWebhookSignature } from '../src/index.js';

const SECRET = 'whsec_test_super_secret';

const sign = (timestamp: string, body: string, secret: string): string =>
  createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'invoice.issued' });

  it('accepts a valid signature within the tolerance window', async () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = sign(ts, body, SECRET);

    const result = await verifyWebhookSignature({
      body,
      signatureHeader: sig,
      timestampHeader: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects an invalid signature', async () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: 'deadbeef'.repeat(8),
      timestampHeader: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects a stale timestamp (replay protection)', async () => {
    const stale = (Math.floor(Date.now() / 1000) - 10_000).toString();
    const sig = sign(stale, body, SECRET);
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: sig,
      timestampHeader: stale,
      secret: SECRET,
      toleranceSeconds: 300,
    });
    expect(result).toEqual({ ok: false, reason: 'timestamp_out_of_window' });
  });

  it('rejects a signature computed with a different secret', async () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = sign(ts, body, 'wrong-secret');
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: sig,
      timestampHeader: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects when headers are missing', async () => {
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: '',
      timestampHeader: '',
      secret: SECRET,
    });
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects when timestamp is not numeric', async () => {
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: 'a'.repeat(64),
      timestampHeader: 'not-a-number',
      secret: SECRET,
    });
    expect(result).toEqual({ ok: false, reason: 'malformed' });
  });

  it('verifies bodies passed as Uint8Array', async () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = sign(ts, body, SECRET);
    const bytes = new TextEncoder().encode(body);
    const result = await verifyWebhookSignature({
      body: bytes,
      signatureHeader: sig,
      timestampHeader: ts,
      secret: SECRET,
    });
    expect(result).toEqual({ ok: true });
  });

  it('respects an injected `now` for deterministic tests', async () => {
    const ts = '1700000000';
    const sig = sign(ts, body, SECRET);
    const result = await verifyWebhookSignature({
      body,
      signatureHeader: sig,
      timestampHeader: ts,
      secret: SECRET,
      now: () => 1700000100 * 1000, // 100s later
    });
    expect(result).toEqual({ ok: true });
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
  });
  it('returns false for different lengths', () => {
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
  });
  it('returns false for different chars', () => {
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
  });
});
