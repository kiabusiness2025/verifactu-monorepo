import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function getEncryptionKey() {
  const raw =
    process.env.INTEGRATIONS_SECRET_KEY?.trim() ||
    process.env.INTEGRATION_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error('INTEGRATIONS_SECRET_KEY is required');
  }

  // Accept base64, hex, or plain text; normalize to 32 bytes with SHA-256.
  let source = raw;
  if (/^[A-Fa-f0-9]+$/.test(raw) && raw.length % 2 === 0) {
    source = Buffer.from(raw, 'hex').toString('utf8');
  } else {
    try {
      const maybeB64 = Buffer.from(raw, 'base64');
      if (maybeB64.length > 0) source = maybeB64.toString('utf8');
    } catch {
      // keep raw text
    }
  }

  return createHash('sha256').update(source).digest();
}

export function encryptIntegrationSecret(plainText: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptIntegrationSecret(cipherText: string) {
  const key = getEncryptionKey();
  const [ivPart, tagPart, payloadPart] = cipherText.split('.');
  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const payload = Buffer.from(payloadPart, 'base64url');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
}
