import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'vf_admin_imp';

export interface ImpersonationPayload {
  targetUserId: string;
  targetCompanyId: string;
  startedAt: string;
  expiresAt?: string;
}

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET missing');
  return new TextEncoder().encode(secret);
}

/**
 * Set impersonation cookie with signed JWT
 */
export async function setImpersonationCookie(payload: ImpersonationPayload) {
  const expiresAt =
    payload.expiresAt ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const tokenPayload = { ...payload, expiresAt };
  const token = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  });
}

/**
 * Clear impersonation cookie
 */
export async function clearImpersonationCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
}

/**
 * Get current impersonation context from cookie
 */
export async function verifyImpersonationToken(
  token: string
): Promise<ImpersonationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ImpersonationPayload;
  } catch (error) {
    console.error('Invalid impersonation token:', error);
    return null;
  }
}

export async function getImpersonation(): Promise<ImpersonationPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyImpersonationToken(token);
}

export { COOKIE_NAME as IMPERSONATION_COOKIE_NAME };
