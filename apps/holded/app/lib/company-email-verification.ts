import { createHmac, timingSafeEqual } from 'crypto';

type CompanyEmailVerificationPayload = {
  tenantId: string;
  email: string;
  exp: number;
};

function getSigningSecret() {
  const raw =
    process.env.HOLDED_COMPANY_EMAIL_VERIFY_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  return raw || null;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  const secret = getSigningSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createCompanyEmailVerificationToken(input: {
  tenantId: string;
  email: string;
  expiresInSeconds?: number;
}) {
  const payload: CompanyEmailVerificationPayload = {
    tenantId: input.tenantId,
    email: input.email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 60 * 60 * 72),
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  if (!signature) return null;
  return `${encodedPayload}.${signature}`;
}

export function verifyCompanyEmailVerificationToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  if (!expectedSignature) return null;
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, receivedBuffer)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as CompanyEmailVerificationPayload;
    if (!payload?.tenantId || !payload?.email || typeof payload.exp !== 'number') {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      tenantId: payload.tenantId,
      email: payload.email,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
