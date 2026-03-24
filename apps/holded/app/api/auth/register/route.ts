import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const DEFAULT_ADMIN_APP_NAME = '[DEFAULT]';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function envOrNull(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function readOptionalEnv(name: string, fallback: string) {
  return cleanEnv(process.env[name]) || fallback;
}

function ensureAdminApp() {
  const existing = admin.apps.find((app) => app?.name === DEFAULT_ADMIN_APP_NAME);
  if (existing) return existing;

  const projectId =
    envOrNull('FIREBASE_ADMIN_PROJECT_ID') ?? requireEnv('FIREBASE_ADMIN_PROJECT_ID');
  const clientEmail =
    envOrNull('FIREBASE_ADMIN_CLIENT_EMAIL') ?? requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKeyRaw =
    envOrNull('FIREBASE_ADMIN_PRIVATE_KEY') ?? requireEnv('FIREBASE_ADMIN_PRIVATE_KEY');

  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
      }),
    },
    DEFAULT_ADMIN_APP_NAME
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildVerificationEmail(input: { email: string; verificationUrl: string }) {
  return {
    subject: 'Confirma tu correo para activar Isaak para Holded',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#ffecef;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">Isaak para Holded</div>
        <h1 style="font-size:28px;line-height:1.2;margin:16px 0 8px;">Un paso más para empezar</h1>
        <p style="margin:0 0 14px;">Hemos creado tu acceso con <strong>${escapeHtml(input.email)}</strong>.</p>
        <p style="margin:0 0 18px;">Confirma tu correo y después podrás iniciar sesión para conectar Holded.</p>
        <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      </div>
    `.trim(),
    text: `Confirma tu correo para activar Isaak para Holded.\n\nEmail: ${input.email}\n\nVerificar: ${input.verificationUrl}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const source = typeof body?.source === 'string' ? body.source : 'holded_signup';

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const app = ensureAdminApp();
    const decoded = await app.auth().verifyIdToken(idToken);
    if (!decoded.email) {
      return NextResponse.json({ error: 'Missing email in token' }, { status: 400 });
    }

    const holdedSite = readOptionalEnv(
      'NEXT_PUBLIC_HOLDED_SITE_URL',
      'https://holded.verifactu.business'
    );
    const url = new URL(`${holdedSite}/auth/holded`);
    url.searchParams.set('source', source);
    url.searchParams.set('registered', '1');

    const verificationUrl = await app.auth().generateEmailVerificationLink(decoded.email, {
      url: url.toString(),
      handleCodeInApp: false,
    });

    const resend = new Resend(requireEnv('RESEND_API_KEY'));
    const from = readOptionalEnv('RESEND_FROM', 'Isaak for Holded <holded@verifactu.business>');
    const template = buildVerificationEmail({ email: decoded.email, verificationUrl });

    const sendResult = await resend.emails.send({
      from,
      to: [decoded.email],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return NextResponse.json({ ok: true, emailId: sendResult.data?.id ?? null });
  } catch (error) {
    console.error('[holded auth register] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
