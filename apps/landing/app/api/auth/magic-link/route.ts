import crypto from 'node:crypto';
import admin from 'firebase-admin';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;

const ALLOWED_ORIGINS = [
  'https://isaak.app',
  'https://www.isaak.app',
  'https://isaak.chat',
  'https://www.isaak.chat',
  'https://verifactu.business',
  'https://www.verifactu.business',
  'https://isaak.verifactu.business',
  'https://app.verifactu.business',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
];

function getClientIp(req: Request): string {
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

function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function computeOtpHmac(secret: string, email: string, otp: string): string {
  return crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
}

async function signOtpToken(secret: string, email: string, otpHmac: string): Promise<string> {
  return new SignJWT({ email, h: otpHmac })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(secret));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildIsaakMagicLinkEmail(link: string, otpCode?: string): { html: string; text: string } {
  const safeLink = escapeHtml(link);
  const avatarUrl = 'https://isaak.app/Isaak/isaak-avatar-verifactu.png';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="${avatarUrl}" alt="Isaak" width="56" height="56"
            style="display:inline-block;border-radius:999px;border:3px solid #dbe7ff;box-shadow:0 4px 16px rgba(35,97,216,0.15);" />
          <div style="margin-top:10px;font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">Isaak</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Asistente fiscal inteligente</div>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:24px;border:1px solid #dbe7ff;padding:36px;box-shadow:0 18px 44px rgba(15,23,42,0.08);">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#2361d8;">Acceso seguro</p>
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:800;color:#0f172a;">Tu enlace para entrar en Isaak</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#475569;line-height:1.7;">
            Pulsa el botón para iniciar sesión. El enlace caduca en <strong>10 minutos</strong> y solo puede usarse una vez.
          </p>

          <a href="${safeLink}" style="display:block;text-align:center;background:#2361d8;color:#ffffff;font-weight:800;font-size:15px;padding:16px 24px;border-radius:16px;text-decoration:none;margin-bottom:24px;letter-spacing:-0.01em;">
            Acceder a Isaak &rarr;
          </a>

          ${
            otpCode
              ? `<div style="margin:0 0 24px;padding:20px 24px;background:#f8faff;border-radius:16px;text-align:center;border:1px solid #dbe7ff;">
            <p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5;">
              ¿Abriste el correo en otro dispositivo?<br/>Introduce este código en la pantalla de acceso:
            </p>
            <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#0f172a;font-family:'Courier New',monospace;padding:6px 0 2px;">${otpCode}</div>
            <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">Caduca en 10 minutos</p>
          </div>`
              : ''
          }

          <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              Si el botón no abre, copia este enlace en tu navegador:<br />
              <a href="${safeLink}" style="color:#2361d8;word-break:break-all;font-size:11px;">${safeLink}</a>
            </p>
          </div>

          <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
            Si no solicitaste este acceso, puedes ignorar este correo con total seguridad.
          </p>
        </td></tr>

        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Isaak &middot; <a href="https://isaak.app" style="color:#94a3b8;">isaak.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    'Tu enlace para entrar en Isaak:',
    link,
    '',
    otpCode ? `O introduce este código en la pantalla de acceso: ${otpCode}` : '',
    otpCode ? '' : '',
    'El enlace caduca en 10 minutos y solo puede usarse una vez.',
    'Si no lo solicitaste, ignora este correo.',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  return { html, text };
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e intentalo de nuevo.' },
      { status: 429 }
    );
  }

  let body: { email?: string; continueUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la peticion invalido.' }, { status: 400 });
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
    return NextResponse.json({ error: 'URL de continuacion invalida.' }, { status: 400 });
  }

  if (!ALLOWED_ORIGINS.includes(continueOrigin)) {
    return NextResponse.json({ error: 'URL de continuacion no permitida.' }, { status: 400 });
  }

  try {
    const app = getFirebaseApp();
    if (!app) {
      return NextResponse.json(
        { error: 'Servicio de autenticacion no disponible en este entorno.' },
        { status: 503 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      console.error('[magic-link] RESEND_API_KEY not set');
      return NextResponse.json({ error: 'Servicio de correo no disponible.' }, { status: 503 });
    }

    const link = await admin.auth(app).generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    const sessionSecret = process.env.SESSION_SECRET?.trim();
    let otpToken: string | undefined;
    let otpCode: string | undefined;
    if (sessionSecret) {
      otpCode = generateOtp();
      const otpHmac = computeOtpHmac(sessionSecret, email, otpCode);
      otpToken = await signOtpToken(sessionSecret, email, otpHmac);
    }

    const fromEmail =
      (
        process.env.RESEND_FROM_ISAAK ||
        process.env.RESEND_FROM_EMAIL ||
        process.env.RESEND_FROM
      )?.trim() || 'Isaak <noreply@isaak.app>';

    const { html, text } = buildIsaakMagicLinkEmail(link, otpCode);

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Tu enlace de acceso a Isaak',
        html,
        text,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('[magic-link] Resend error', { status: sendRes.status, body: errText });
      return NextResponse.json(
        { error: 'No pudimos enviar el correo. Intentalo de nuevo en unos minutos.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ...(otpToken ? { otpToken } : {}) });
  } catch (err) {
    console.error('[magic-link] Unexpected error', err);
    return NextResponse.json({ error: 'Error interno. Intentalo de nuevo.' }, { status: 500 });
  }
}
