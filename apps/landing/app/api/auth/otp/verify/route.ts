/**
 * POST /api/auth/otp/verify
 *
 * Verifies the 6-digit OTP generated during magic-link send.
 * Returns a Firebase custom token the client uses with signInWithCustomToken().
 *
 * Body:    { token: string, otp: string }
 * Success: { ok: true, customToken: string }
 */

import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1_000;

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

function getFirebaseApp() {
  const existing = admin.apps.find((app) => app?.name === '[DEFAULT]');
  if (existing) return existing;

  const projectId = (
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  )?.trim();
  const clientEmail = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL
  )?.trim();
  const privateKeyRaw = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY
  )?.trim();

  if (!projectId || !clientEmail || !privateKeyRaw) return null;

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }),
  });
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
    return NextResponse.json(
      { error: 'Cuerpo de la petición inválido.', code: 'BAD_BODY' },
      { status: 400 }
    );
  }

  const token = (body.token || '').trim();
  const otp = (body.otp || '').replace(/\D/g, '');

  if (!token) {
    return NextResponse.json(
      {
        error: 'No se recibió el token. Pulsa "Reenviar" para solicitar uno nuevo.',
        code: 'MISSING_TOKEN',
      },
      { status: 400 }
    );
  }
  if (otp.length !== 6) {
    return NextResponse.json(
      { error: 'El código debe tener 6 dígitos.', code: 'BAD_OTP_FORMAT' },
      { status: 400 }
    );
  }

  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    console.error('[otp/verify] SESSION_SECRET not configured');
    return NextResponse.json(
      { error: 'Servicio no disponible.', code: 'NO_SECRET' },
      { status: 503 }
    );
  }

  let email: string;
  let storedHmac: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    email = typeof payload.email === 'string' ? payload.email : '';
    storedHmac = typeof payload.h === 'string' ? payload.h : '';
    if (!email || !storedHmac) throw new Error('invalid payload');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isExpired = /expired|exp.*claim/i.test(msg);
    return NextResponse.json(
      {
        error: isExpired
          ? 'El código ha caducado (10 min). Pulsa "Reenviar" para solicitar uno nuevo.'
          : 'El código no es válido. Pulsa "Reenviar" para solicitar uno nuevo.',
        code: isExpired ? 'OTP_EXPIRED' : 'OTP_INVALID',
      },
      { status: 400 }
    );
  }

  const expectedHmac = crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
  const storedBuf = Buffer.from(storedHmac, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  const match =
    storedBuf.length === expectedBuf.length && crypto.timingSafeEqual(storedBuf, expectedBuf);

  if (!match) {
    return NextResponse.json(
      { error: 'Código incorrecto. Comprueba los 6 dígitos del email.', code: 'OTP_WRONG' },
      { status: 400 }
    );
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    console.error('[otp/verify] Firebase Admin not configured');
    return NextResponse.json(
      { error: 'Servicio de autenticación no disponible.', code: 'NO_FIREBASE' },
      { status: 503 }
    );
  }

  try {
    let uid: string;
    try {
      const firebaseUser = await admin.auth(firebaseApp).getUserByEmail(email);
      uid = firebaseUser.uid;
    } catch {
      const newUser = await admin.auth(firebaseApp).createUser({ email });
      uid = newUser.uid;
    }

    const customToken = await admin.auth(firebaseApp).createCustomToken(uid);
    return NextResponse.json({ ok: true, customToken });
  } catch (err) {
    console.error('[otp/verify] Firebase custom token error', err);
    return NextResponse.json(
      { error: 'Error al generar el acceso. Inténtalo de nuevo.', code: 'FIREBASE_ERROR' },
      { status: 500 }
    );
  }
}
