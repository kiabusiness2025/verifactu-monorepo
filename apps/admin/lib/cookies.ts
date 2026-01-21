import { SignJWT, jwtVerify } from 'jose';

const IMPERSONATION_COOKIE_NAME = 'admin_impersonation';
const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-key-change-in-production'
);

export interface ImpersonationPayload {
  adminUserId: string;
  targetUserId: string;
  targetCompanyId?: string;
  startedAt: number;
  expiresAt: number;
}

/**
 * Creates a signed JWT cookie for impersonation
 */
export async function createImpersonationToken(
  payload: Omit<ImpersonationPayload, 'startedAt' | 'expiresAt'>
): Promise<string> {
  const now = Date.now();
  const expiresAt = now + 8 * 60 * 60 * 1000; // 8 hours

  const token = await new SignJWT({
    ...payload,
    startedAt: now,
    expiresAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET_KEY);

  return token;
}

/**
 * Verifies and decodes an impersonation token
 */
export async function verifyImpersonationToken(
  token: string
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    // Check expiration
    if (payload.expiresAt && Date.now() > (payload.expiresAt as number)) {
      return null;
    }

    return payload as unknown as ImpersonationPayload;
  } catch (error) {
    console.error('Invalid impersonation token:', error);
    return null;
  }
}

/**
 * Creates the cookie header string for impersonation
 */
export function getImpersonationCookieHeader(token: string): string {
  return `${IMPERSONATION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${8 * 60 * 60}`;
}

/**
 * Creates the cookie header string to clear impersonation
 */
export function getClearImpersonationCookieHeader(): string {
  return `${IMPERSONATION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export { IMPERSONATION_COOKIE_NAME };
