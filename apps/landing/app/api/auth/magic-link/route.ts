import admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;
const DEFAULT_ADMIN_APP_NAME = '[DEFAULT]';
const ISAAK_ADMIN_APP_NAME = 'isaak-admin';

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
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }

  if (entry.count >= MAX_PER_HOUR) return false;

  entry.count++;
  return true;
}

function envOrNull(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function ensureAdminApp(appName: string, envPrefix: string, required: boolean) {
  const existing = admin.apps.find((a) => a?.name === appName);
  if (existing) return existing;

  const projectId =
    envOrNull(`${envPrefix}PROJECT_ID`) ||
    (envPrefix === 'FIREBASE_ADMIN_' ? envOrNull('FIREBASE_PROJECT_ID') : null);
  const clientEmail =
    envOrNull(`${envPrefix}CLIENT_EMAIL`) ||
    (envPrefix === 'FIREBASE_ADMIN_' ? envOrNull('FIREBASE_CLIENT_EMAIL') : null);
  const privateKeyRaw =
    envOrNull(`${envPrefix}PRIVATE_KEY`) ||
    (envPrefix === 'FIREBASE_ADMIN_' ? envOrNull('FIREBASE_PRIVATE_KEY') : null);

  if (!projectId || !clientEmail || !privateKeyRaw) {
    if (required) {
      console.error('[magic-link] Missing Firebase Admin env vars', { envPrefix });
    }
    return null;
  }

  const options = {
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }),
  };

  return appName === DEFAULT_ADMIN_APP_NAME
    ? admin.initializeApp(options)
    : admin.initializeApp(options, appName);
}

function shouldUseIsaakFirebase(continueUrl: string) {
  try {
    const parsed = new URL(continueUrl);
    return (
      parsed.pathname.startsWith('/auth/isaak') ||
      [
        'isaak.app',
        'www.isaak.app',
        'isaak.chat',
        'www.isaak.chat',
        'isaak.verifactu.business',
      ].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function getFirebaseApp(continueUrl: string) {
  if (shouldUseIsaakFirebase(continueUrl)) {
    const isaakApp = ensureAdminApp(ISAAK_ADMIN_APP_NAME, 'ISAAK_FIREBASE_ADMIN_', false);
    if (isaakApp) return isaakApp;
  }

  return ensureAdminApp(DEFAULT_ADMIN_APP_NAME, 'FIREBASE_ADMIN_', true);
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

  // Validate continueUrl is one of our allowed origins
  const allowedOrigins = [
    'https://isaak.app',
    'https://www.isaak.app',
    'https://isaak.chat',
    'https://www.isaak.chat',
    'https://verifactu.business',
    'https://isaak.verifactu.business',
    'https://app.verifactu.business',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ];

  let continueOrigin: string;
  try {
    continueOrigin = new URL(continueUrl).origin;
  } catch {
    return NextResponse.json({ error: 'URL de continuación inválida.' }, { status: 400 });
  }

  if (!allowedOrigins.includes(continueOrigin)) {
    return NextResponse.json({ error: 'URL de continuación no permitida.' }, { status: 400 });
  }

  // Use Firebase Admin to generate a sign-in link
  // Note: Firebase Admin SDK can generate action links directly
  // This avoids exposing Firebase client SDK keys in API routes
  try {
    const app = getFirebaseApp(continueUrl);
    if (!app) {
      return NextResponse.json(
        { error: 'Servicio de autenticación no disponible en este entorno.' },
        { status: 503 }
      );
    }

    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: true,
    };

    const link = await admin.auth(app).generateSignInWithEmailLink(email, actionCodeSettings);

    // Send via Resend
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

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="padding-bottom:24px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;background:#2361d8;border-radius:10px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-size:18px">✦</span>
            </div>
            <span style="font-size:18px;font-weight:700;color:#011c67">Isaak</span>
          </div>
        </td></tr>
        <tr><td style="background:white;border-radius:20px;border:1px solid #e2e8f0;padding:40px;box-shadow:0 4px 24px rgba(15,23,42,0.06)">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#011c67">
            Tu enlace de acceso
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">
            Haz clic en el botón para acceder a Isaak. El enlace es válido durante 10 minutos y solo puede usarse una vez.
          </p>
          <a href="${link}" style="display:block;text-align:center;background:#2361d8;color:white;font-weight:600;font-size:15px;padding:14px 24px;border-radius:12px;text-decoration:none;margin-bottom:24px">
            Acceder a Isaak →
          </a>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
            Si no solicitaste este acceso, puedes ignorar este correo con total seguridad.<br>
            Este enlace caduca automáticamente en 10 minutos.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            Verifactu Business · <a href="https://verifactu.business" style="color:#94a3b8">verifactu.business</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
        text: `Accede a Isaak: ${link}\n\nEste enlace caduca en 10 minutos y solo puede usarse una vez.\n\nSi no lo solicitaste, ignora este correo.`,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      // Log estructurado para que el admin pueda identificar la causa exacta
      // en Vercel Logs (Resend devuelve JSON con `name` y `message`).
      console.error('[magic-link] Resend rejected email', {
        status: sendRes.status,
        from: fromEmail,
        to: email,
        body: errText.slice(0, 500),
      });

      // Mapeo de causas comunes para devolver mensaje útil al usuario.
      let userError = 'No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.';
      let httpStatus = 502;
      if (sendRes.status === 401 || sendRes.status === 403) {
        // Auth/domain. El admin debe verificar el dominio en
        // https://resend.com/domains o regenerar la API key.
        userError =
          'El servicio de correo no está configurado correctamente. Contacta con soporte (soporte@verifactu.business).';
        httpStatus = 503;
        // Hint específico si el cuerpo menciona "not verified"
        if (/not verified|domain/i.test(errText)) {
          console.error(
            `[magic-link] Hint: dominio del 'from' (${fromEmail}) NO está verificado en Resend. ` +
              `Verifícalo en https://resend.com/domains o cambia RESEND_FROM_ISAAK a un sender verificado.`
          );
        }
      } else if (sendRes.status === 429) {
        userError = 'Demasiados envíos. Espera unos minutos e inténtalo de nuevo.';
        httpStatus = 429;
      }
      // Para 422 y otros 4xx/5xx mantenemos el 502 genérico — el cuerpo
      // queda en logs para diagnóstico, pero no exponemos al usuario.

      return NextResponse.json({ error: userError }, { status: httpStatus });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[magic-link] Unexpected error', err);
    return NextResponse.json({ error: 'Error interno. Inténtalo de nuevo.' }, { status: 500 });
  }
}
