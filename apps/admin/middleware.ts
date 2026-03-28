import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionTokenFromEnv } from '@verifactu/utils';

const PUBLIC_PATHS = [
  '/api/auth', // NextAuth
  '/_next',
  '/favicon.ico',
  '/robots.txt',
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function readAdminAllowlist() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedEmail = (
    process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
  ).toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();

  return { adminEmails, allowedEmail, allowedDomain };
}

function isAllowedAdminEmail(email: string) {
  const normalized = email.toLowerCase();
  const { adminEmails, allowedEmail, allowedDomain } = readAdminAllowlist();

  return (
    adminEmails.includes(normalized) ||
    normalized === allowedEmail ||
    (allowedDomain && normalized.endsWith(`@${allowedDomain}`))
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const allowLocalBypass =
    process.env.ADMIN_LOCAL_BYPASS === '1' && process.env.NODE_ENV !== 'production';
  if (allowLocalBypass) {
    return NextResponse.next();
  }
  const allowRelaxed = process.env.ADMIN_RELAXED_AUTH === '1';

  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const sharedCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value || null;
    if (sharedCookie) {
      const payload = await verifySessionTokenFromEnv(sharedCookie).catch(() => null);
      const email = typeof payload?.email === 'string' ? payload.email.toLowerCase() : '';

      if ((email && isAllowedAdminEmail(email)) || allowRelaxed) {
        return NextResponse.next();
      }
    }

    const url = req.nextUrl.clone();
    url.pathname = '/api/auth/signin';
    url.searchParams.set('callbackUrl', req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  const email = (token.email || '').toLowerCase();
  const emailOk = !!email && isAllowedAdminEmail(email);

  // Si el email es valido, permitir acceso (el rol se puede ajustar despues en la DB)
  if (!emailOk && !allowRelaxed) {
    return new NextResponse('Forbidden - Email not authorized', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
