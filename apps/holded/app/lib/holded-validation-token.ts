import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { HoldedConnectionChannel, HoldedProbeResult } from '@/app/lib/holded-integration';

const HOLDED_VALIDATION_TOKEN_PURPOSE = 'holded_api_validation';

type HoldedValidationTokenPayload = {
  purpose: string;
  tenantId: string;
  channel: HoldedConnectionChannel;
  apiKeyFingerprint: string;
  probe: HoldedProbeResult;
  exp: number;
};

function readValidationSecrets(input = process.env) {
  const primary = input.SESSION_SECRET?.trim();
  const previous = (input.SESSION_SECRET_PREVIOUS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!primary) {
    throw new Error('SESSION_SECRET is required');
  }

  return [primary, ...previous.filter((value) => value !== primary)];
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payloadBase64: string, secret: string) {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url');
}

function parseToken(token: string) {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payloadPart)) as HoldedValidationTokenPayload;
    return {
      payloadPart,
      signaturePart,
      payload: parsed,
    };
  } catch {
    return null;
  }
}

function hasMatchingSignature(payloadPart: string, signaturePart: string, secrets: string[]) {
  return secrets.some((secret) => {
    const expected = signPayload(payloadPart, secret);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signaturePart, 'utf8');

    return (
      expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
    );
  });
}

function buildApiKeyFingerprint(apiKey: string) {
  return createHash('sha256').update(apiKey.trim()).digest('hex').slice(0, 24);
}

function isProbeShape(value: unknown): value is HoldedProbeResult {
  if (!value || typeof value !== 'object') return false;

  const probe = value as Record<string, unknown>;
  const checks = ['invoiceApi', 'accountingApi', 'crmApi', 'projectsApi', 'teamApi'] as const;

  return checks.every((key) => {
    const entry = probe[key];
    return (
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as { ok?: unknown }).ok === 'boolean' &&
      'status' in (entry as object)
    );
  });
}

export async function mintHoldedValidationToken(input: {
  tenantId: string;
  channel: HoldedConnectionChannel;
  apiKey: string;
  probe: HoldedProbeResult;
}) {
  const payload: HoldedValidationTokenPayload = {
    purpose: HOLDED_VALIDATION_TOKEN_PURPOSE,
    tenantId: input.tenantId,
    channel: input.channel,
    apiKeyFingerprint: buildApiKeyFingerprint(input.apiKey),
    probe: input.probe,
    exp: Date.now() + 5 * 60 * 1000,
  };
  const payloadBase64 = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64, readValidationSecrets()[0]);

  return `${payloadBase64}.${signature}`;
}

export async function verifyHoldedValidationToken(input: {
  token: string;
  tenantId: string;
  channel: HoldedConnectionChannel;
  apiKey: string;
}) {
  const parsed = parseToken(input.token);

  if (!parsed) {
    return null;
  }

  if (!hasMatchingSignature(parsed.payloadPart, parsed.signaturePart, readValidationSecrets())) {
    return null;
  }

  const tokenPayload = parsed.payload;
  if (tokenPayload.purpose !== HOLDED_VALIDATION_TOKEN_PURPOSE) {
    return null;
  }

  if (tokenPayload.exp < Date.now()) {
    return null;
  }

  if (tokenPayload.tenantId !== input.tenantId || tokenPayload.channel !== input.channel) {
    return null;
  }

  if (tokenPayload.apiKeyFingerprint !== buildApiKeyFingerprint(input.apiKey)) {
    return null;
  }

  if (!isProbeShape(tokenPayload.probe)) {
    return null;
  }

  return {
    probe: tokenPayload.probe,
  };
}
