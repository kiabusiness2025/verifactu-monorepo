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

export async function probeHoldedConnection(apiKey: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://api.holded.com/api/invoicing/v1/contacts', {
      method: 'GET',
      headers: {
        key: apiKey,
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        detail: `Holded respondió ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Error de red al validar Holded',
    };
  }
}
