import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.CERT_MASTER_KEY ?? '';

function getMasterKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length < 64) {
    throw new Error('CERT_MASTER_KEY must be a 64-char hex string (256-bit key)');
  }
  return Buffer.from(KEY_HEX.slice(0, 64), 'hex');
}

export function encryptCert(p12Buffer: Buffer): { encrypted: Buffer; iv: string; authTag: string } {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(p12Buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decryptCert(encrypted: Buffer, ivHex: string, authTagHex: string): Buffer {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
