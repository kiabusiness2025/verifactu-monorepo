/** @jest-environment node */

import { createCipheriv, createHash, randomBytes } from 'crypto';
import { decryptIntegrationSecret, encryptIntegrationSecret } from './secretCrypto';

function normalizeSecretLegacy(raw: string) {
  if (/^[A-Fa-f0-9]+$/.test(raw) && raw.length % 2 === 0) {
    return Buffer.from(raw, 'hex').toString('utf8');
  }

  try {
    const maybeB64 = Buffer.from(raw, 'base64');
    if (maybeB64.length > 0) {
      return maybeB64.toString('utf8');
    }
  } catch {
    // keep raw text
  }

  return raw;
}

function encryptWithSecret(secret: string, options?: { legacyNormalize?: boolean }) {
  const source = options?.legacyNormalize ? normalizeSecretLegacy(secret) : secret;
  const key = createHash('sha256').update(source).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update('holded-api-key', 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

describe('secretCrypto compatibility', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('decrypts payloads written with SESSION_SECRET fallback', () => {
    delete process.env.INTEGRATIONS_SECRET_KEY;
    delete process.env.INTEGRATION_SECRET_KEY;
    process.env.SESSION_SECRET = 'shared-session-secret';

    const cipherText = encryptWithSecret(process.env.SESSION_SECRET);

    expect(decryptIntegrationSecret(cipherText)).toBe('holded-api-key');
  });

  it('decrypts payloads written with the previous app normalization logic', () => {
    delete process.env.INTEGRATION_SECRET_KEY;
    delete process.env.SESSION_SECRET;
    process.env.INTEGRATIONS_SECRET_KEY = '616263313233';

    const cipherText = encryptWithSecret(process.env.INTEGRATIONS_SECRET_KEY, {
      legacyNormalize: true,
    });

    expect(decryptIntegrationSecret(cipherText)).toBe('holded-api-key');
  });

  it('keeps current roundtrip encryption working', () => {
    delete process.env.INTEGRATION_SECRET_KEY;
    process.env.INTEGRATIONS_SECRET_KEY = 'integration-secret';
    delete process.env.SESSION_SECRET;

    const cipherText = encryptIntegrationSecret('holded-api-key');

    expect(decryptIntegrationSecret(cipherText)).toBe('holded-api-key');
  });
});
