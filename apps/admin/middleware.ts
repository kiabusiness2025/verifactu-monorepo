import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/auth', // NextAuth
  '/_next',
  '/favicon.ico',
  '/robots.txt',
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const allowLocalBypass =
    process.env.ADMIN_LOCAL_BYPASS === '1' && process.env.NODE_ENV !== 'production';
  if (allowLocalBypass) {
    return NextResponse.next();
  }

  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/api/auth/signin';
    url.searchParams.set('callbackUrl', req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  const email = (token.email || '').toLowerCase();
  const role = (token.role || 'USER') as string;

  const allowedEmail = (
    process.env.ADMIN_ALLOWED_EMAIL || 'support@verifactu.business'
  ).toLowerCase();
  const allowedDomain = (process.env.ADMIN_ALLOWED_DOMAIN || 'verifactu.business').toLowerCase();

  const emailOk = email === allowedEmail || email.endsWith(`@${allowedDomain}`);

  // Si el email es valido, permitir acceso (el rol se puede ajustar despues en la DB)
  if (!emailOk) {
    return new NextResponse('Forbidden - Email not authorized', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
