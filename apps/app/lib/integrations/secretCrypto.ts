import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function readSecrets() {
  const secrets = [
    process.env.INTEGRATIONS_SECRET_KEY?.trim(),
    process.env.INTEGRATION_SECRET_KEY?.trim(),
    process.env.SESSION_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value));

  if (secrets.length === 0) {
    throw new Error('INTEGRATIONS_SECRET_KEY or SESSION_SECRET is required');
  }

  return secrets;
}

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

function buildKey(secret: string) {
  return createHash('sha256').update(secret).digest();
}

function getPrimaryEncryptionKey() {
  return buildKey(readSecrets()[0]);
}

function getDecryptionKeys() {
  const deduped = new Map<string, Buffer>();

  for (const secret of readSecrets()) {
    const candidates = [secret, normalizeSecretLegacy(secret)];
    for (const candidate of candidates) {
      const key = buildKey(candidate);
      deduped.set(key.toString('hex'), key);
    }
  }

  return Array.from(deduped.values());
}

export function encryptIntegrationSecret(plainText: string) {
  const key = getPrimaryEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptIntegrationSecret(cipherText: string) {
  const [ivPart, tagPart, payloadPart] = cipherText.split('.');
  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const payload = Buffer.from(payloadPart, 'base64url');

  for (const key of getDecryptionKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Try the next compatible key derivation.
    }
  }

  throw new Error('Unable to decrypt integration payload with configured secrets');
}
