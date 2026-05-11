/**
 * POST /api/auth/magic-link
 *
 * Genera un Firebase sign-in link via Admin SDK y lo envía por Resend.
 * Esto reemplaza el uso directo de sendSignInLinkToEmail del SDK cliente,
 * cuyo servidor SMTP (noreply@*.firebaseapp.com) tiene problemas de
 * entregabilidad con Gmail y frecuentemente cae en spam.
 *
 * Requiere en Vercel (apps/holded):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *   RESEND_API_KEY
 *   RESEND_FROM_HOLDED  (opcional, default: Holded <no-reply@holded.verifactu.business>)
 */

import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;

const ALLOWED_ORIGINS = [
  'https://holded.verifactu.business',
  'https://claude.verifactu.business',
  'https://app.verifactu.business',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

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
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

function getFirebaseAdminApp() {
  const APP_NAME = 'holded-magic-link';
  const existing = admin.apps.find((a) => a?.name === APP_NAME);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKeyRaw) return null;

  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
      }),
    },
    APP_NAME
  );
}

function buildMagicLinkEmail(link: string): { html: string; text: string } {
  const holdedLogoUrl =
    (process.env.NEXT_PUBLIC_HOLDED_SITE_URL?.trim() || 'https://holded.verifactu.business') +
    '/brand/holded/holded-diamond-logo.png';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:20px;text-align:center;">
          <img src="${holdedLogoUrl}" alt="Holded" width="36" height="36"
            style="display:inline-block;border-radius:10px;vertical-align:middle;margin-right:8px;" />
          <span style="font-size:18px;font-weight:700;color:#0f172a;vertical-align:middle;">Holded · Verifactu</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;padding:40px;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Tu enlace de acceso</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
            Haz clic en el botón para iniciar sesión en el Conector Holded.<br>
            El enlace es válido durante <strong>10 minutos</strong> y solo puede usarse una vez.
          </p>
          <a href="${link}"
            style="display:block;text-align:center;background:#ff5460;color:#ffffff;font-weight:700;font-size:15px;padding:14px 24px;border-radius:50px;text-decoration:none;margin-bottom:24px;">
            Acceder al Conector Holded →
          </a>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
            Si no solicitaste este acceso, puedes ignorar este correo con total seguridad.<br>
            Este enlace caduca automáticamente en 10 minutos.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Powered by <a href="https://verifactu.business" style="color:#94a3b8;">verifactu.business</a>
            &nbsp;·&nbsp;
            <a href="https://holded.verifactu.business/privacy" style="color:#94a3b8;">Privacidad</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Accede al Conector Holded:\n${link}\n\nEste enlace caduca en 10 minutos y solo puede usarse una vez.\n\nSi no lo solicitaste, ignora este correo.`;

  return { html, text };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
      { status: 429 }
    );
  }

  let body: { email?: string; continueUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
  }

  const continueUrl = (body.continueUrl || '').trim();
  if (!continueUrl) {
    return NextResponse.json({ error: 'URL de continuación requerida.' }, { status: 400 });
  }

  let continueOrigin: string;
  try {
    continueOrigin = new URL(continueUrl).origin;
  } catch {
    return NextResponse.json({ error: 'URL de continuación inválida.' }, { status: 400 });
  }

  if (!ALLOWED_ORIGINS.includes(continueOrigin)) {
    return NextResponse.json({ error: 'URL de continuación no permitida.' }, { status: 400 });
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    console.error('[magic-link] Firebase Admin not configured — check FIREBASE_ADMIN_* env vars');
    return NextResponse.json(
      { error: 'Servicio de autenticación no disponible.' },
      { status: 503 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error('[magic-link] RESEND_API_KEY not set');
    return NextResponse.json({ error: 'Servicio de correo no disponible.' }, { status: 503 });
  }

  try {
    const link = await admin.auth(app).generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    const fromEmail =
      process.env.RESEND_FROM_HOLDED?.trim() || 'Holded <no-reply@holded.verifactu.business>';

    const { html, text } = buildMagicLinkEmail(link);

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Tu enlace de acceso al Conector Holded',
        html,
        text,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('[magic-link] Resend error', { status: sendRes.status, body: errText });
      return NextResponse.json(
        { error: 'No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[magic-link] Unexpected error', err);
    return NextResponse.json({ error: 'Error interno. Inténtalo de nuevo.' }, { status: 500 });
  }
}
