import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { HoldedProbeResult } from '@/lib/integrations/accounting';
import { normalizeHoldedApiKey } from '@/lib/integrations/holdedApiKey';

const HOLDED_VALIDATION_TOKEN_PURPOSE = 'holded_api_validation';

type HoldedValidationChannel = 'chatgpt' | 'dashboard';

type HoldedValidationTokenPayload = {
  purpose: string;
  tenantId: string | null;
  subjectUid: string | null;
  channel: HoldedValidationChannel;
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
  return createHash('sha256').update(normalizeHoldedApiKey(apiKey)).digest('hex').slice(0, 24);
}

function isProbeShape(value: unknown): value is HoldedProbeResult {
  if (!value || typeof value !== 'object') return false;

  const probe = value as Record<string, unknown>;
  const checks = [
    'invoiceApi',
    'contactsApi',
    'accountingApi',
    'crmApi',
    'projectsApi',
    'teamApi',
  ] as const;

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
  tenantId?: string | null;
  subjectUid?: string | null;
  channel: HoldedValidationChannel;
  apiKey: string;
  probe: HoldedProbeResult;
}) {
  const tenantId = input.tenantId?.trim() || null;
  const subjectUid = input.subjectUid?.trim() || null;
  if (!tenantId && !subjectUid) {
    throw new Error('tenantId or subjectUid is required');
  }

  const payload: HoldedValidationTokenPayload = {
    purpose: HOLDED_VALIDATION_TOKEN_PURPOSE,
    tenantId,
    subjectUid,
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
  tenantId?: string | null;
  subjectUid?: string | null;
  channel: HoldedValidationChannel;
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

  const tenantId = input.tenantId?.trim() || null;
  const subjectUid = input.subjectUid?.trim() || null;

  if (tokenPayload.channel !== input.channel) {
    return null;
  }

  if (tokenPayload.tenantId && tokenPayload.tenantId !== tenantId) {
    return null;
  }

  if (tokenPayload.subjectUid && tokenPayload.subjectUid !== subjectUid) {
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
