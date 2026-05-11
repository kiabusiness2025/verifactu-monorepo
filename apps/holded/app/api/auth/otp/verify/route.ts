/**
 * POST /api/auth/otp/verify
 *
 * Verifies the 6-digit OTP generated during magic-link send.
 * Mints a short-lived pre-auth session cookie (email only, 30 min)
 * so the holded-direct API can proceed without the user clicking the link.
 *
 * Body: { token: string, otp: string }
 * Response: { ok: true, email: string } | { error: string }
 */

import crypto from 'node:crypto';
import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
} from '@/app/lib/session';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1_000; // 15 min

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
      { status: 429 }
    );
  }

  let body: { token?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const token = (body.token || '').trim();
  const otp = (body.otp || '').replace(/\D/g, '');

  if (!token || otp.length !== 6) {
    return NextResponse.json({ error: 'Token o código inválido.' }, { status: 400 });
  }

  let secret: string;
  try {
    secret = readSessionSecret();
  } catch {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  let email: string;
  let storedHmac: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    email = typeof payload.email === 'string' ? payload.email : '';
    storedHmac = typeof payload.h === 'string' ? payload.h : '';
    if (!email || !storedHmac) throw new Error('invalid payload');
  } catch {
    return NextResponse.json(
      { error: 'El código ha expirado o no es válido. Solicita uno nuevo.' },
      { status: 400 }
    );
  }

  const expectedHmac = crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');

  const storedBuf = Buffer.from(storedHmac, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  const match =
    storedBuf.length === expectedBuf.length && crypto.timingSafeEqual(storedBuf, expectedBuf);

  if (!match) {
    return NextResponse.json({ error: 'Código incorrecto. Inténtalo de nuevo.' }, { status: 400 });
  }

  const sessionToken = await signSessionToken({
    payload: { email, uid: `otp:${email}`, ver: 1, rememberDevice: true },
    secret,
    expiresIn: '30m',
  });

  const url = new URL(req.url);
  const host = req.headers.get('host');
  const cookieOptions = buildSessionCookieOptions({
    url: url.toString(),
    host,
    domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
    secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
    value: sessionToken,
    maxAgeSeconds: 30 * 60,
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: cookieOptions.value,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    domain: cookieOptions.domain,
    maxAge: cookieOptions.maxAge,
  });

  return response;
}
