import { NextResponse } from 'next/server';
import { buildSessionCookieOptions } from '@/app/lib/session';

export const runtime = 'nodejs';

const DEFAULT_SHARED_COOKIE_DOMAIN = '.verifactu.business';
const DEFAULT_SHARED_COOKIE_SAMESITE = 'none';
const DEFAULT_SHARED_COOKIE_SECURE = 'true';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get('host');

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN || DEFAULT_SHARED_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE || DEFAULT_SHARED_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || DEFAULT_SHARED_COOKIE_SAMESITE,
      value: '',
      maxAgeSeconds: 0,
    })
  );

  return response;
}
