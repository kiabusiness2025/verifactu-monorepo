import { createCipheriv, createHash, randomBytes } from 'crypto';

function getEncryptionKey(): Buffer {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.SESSION_SECRET || '';
  if (!raw) {
    throw new Error('Falta INTEGRATIONS_ENCRYPTION_KEY para cifrar API keys');
  }

  // 32-byte key derived from secret material.
  return createHash('sha256').update(raw).digest();
}

export function encryptIntegrationSecret(value: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function maskSecret(value: string): string {
  if (value.length <= 6) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export async function probeAccountingApiConnection(apiKey: string): Promise<{ ok: boolean; detail?: string }> {
  const normalized = apiKey.trim();
  if (normalized.length < 8) {
    return {
      ok: false,
      detail: 'API key demasiado corta.',
    };
  }

  return { ok: true };
}
