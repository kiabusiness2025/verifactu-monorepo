import admin from 'firebase-admin';
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
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 3600_000 });
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildIsaakMagicLinkEmail(link: string): { html: string; text: string } {
  const safeLink = escapeHtml(link);
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || 'https://verifactu.business';
  const avatarUrl = `${landingUrl.replace(/\/$/, '')}/Isaak/isaak-avatar-verifactu.png`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:20px;text-align:center;">
          <span style="display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:#ffffff;border:1px solid #dbe7ff;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
            <img src="${avatarUrl}" alt="Isaak" width="34" height="34" style="display:block;border-radius:999px;border:0;object-fit:cover;" />
            <span style="text-align:left;">
              <span style="display:block;font-size:15px;font-weight:800;color:#0f172a;line-height:1.1;">Isaak</span>
              <span style="display:block;font-size:12px;color:#64748b;line-height:1.2;">Asistente fiscal</span>
            </span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:24px;border:1px solid #dbe7ff;padding:36px;box-shadow:0 18px 44px rgba(15,23,42,0.08);">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#2361d8;">Acceso seguro</p>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.15;font-weight:800;color:#0f172a;">Tu enlace para entrar en Isaak</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
            Pulsa el boton para iniciar sesion. El enlace caduca en <strong>10 minutos</strong> y solo puede usarse una vez.
          </p>
          <a href="${safeLink}" style="display:block;text-align:center;background:#2361d8;color:#ffffff;font-weight:800;font-size:15px;padding:14px 24px;border-radius:16px;text-decoration:none;margin-bottom:22px;">
            Acceder a Isaak &rarr;
          </a>
          <div style="padding:14px 16px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              Si el boton no abre, copia este enlace en tu navegador:<br />
              <a href="${safeLink}" style="color:#2361d8;word-break:break-all;">${safeLink}</a>
            </p>
          </div>
          <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
            Si no solicitaste este acceso, puedes ignorar este correo.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Verifactu Business &middot; <a href="${landingUrl}" style="color:#94a3b8;">verifactu.business</a>
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
    'El enlace caduca en 10 minutos y solo puede usarse una vez.',
    'Si no lo solicitaste, ignora este correo.',
  ].join('\n');

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

    const link = await admin.auth(app).generateSignInWithEmailLink(email, {
      url: continueUrl,
      handleCodeInApp: true,
    });

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (!resendApiKey) {
      console.error('[magic-link] RESEND_API_KEY not set');
      return NextResponse.json({ error: 'Servicio de correo no disponible.' }, { status: 503 });
    }

    const fromEmail =
      (
        process.env.RESEND_FROM_ISAAK ||
        process.env.RESEND_FROM_EMAIL ||
        process.env.RESEND_FROM
      )?.trim() || 'Isaak <noreply@verifactu.business>';

    const { html, text } = buildIsaakMagicLinkEmail(link);

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
      console.error('[magic-link] Resend rejected email', {
        status: sendRes.status,
        from: fromEmail,
        to: email,
        body: errText.slice(0, 500),
      });

      let userError = 'No pudimos enviar el correo. Intentalo de nuevo en unos minutos.';
      let httpStatus = 502;

      if (sendRes.status === 401 || sendRes.status === 403) {
        userError =
          'El servicio de correo no esta configurado correctamente. Contacta con soporte (soporte@verifactu.business).';
        httpStatus = 503;
        if (/not verified|domain/i.test(errText)) {
          console.error(
            `[magic-link] Hint: sender domain for ${fromEmail} is not verified in Resend.`
          );
        }
      } else if (sendRes.status === 429) {
        userError = 'Demasiados envios. Espera unos minutos e intentalo de nuevo.';
        httpStatus = 429;
      }

      return NextResponse.json({ error: userError }, { status: httpStatus });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[magic-link] Unexpected error', err);
    return NextResponse.json({ error: 'Error interno. Intentalo de nuevo.' }, { status: 500 });
  }
}
