import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/prisma';

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
        <h1 style="font-size:28px;line-height:1.2;margin:16px 0 8px;">Un paso mas para empezar</h1>
        <p style="margin:0 0 14px;">Hemos creado tu acceso con <strong>${escapeHtml(input.email)}</strong>.</p>
        <p style="margin:0 0 18px;">Confirma tu correo y despues podras iniciar sesion para conectar Holded.</p>
        <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
      </div>
    `.trim(),
    text: `Confirma tu correo para activar Isaak para Holded.\n\nEmail: ${input.email}\n\nVerificar: ${input.verificationUrl}`,
  };
}

function buildWelcomeEmail(input: { email: string; accessUrl: string; dashboardUrl: string }) {
  return {
    subject: 'Bienvenido a Isaak para Holded',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#ffecef;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">Isaak para Holded</div>
        <h1 style="font-size:28px;line-height:1.2;margin:16px 0 8px;">Tu acceso ya esta preparado</h1>
        <p style="margin:0 0 14px;">Gracias por empezar con <strong>${escapeHtml(input.email)}</strong>.</p>
        <p style="margin:0 0 18px;">Siguientes pasos: confirma tu correo, entra en tu acceso y pega tu API key de Holded para activar el onboarding gratuito.</p>
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Abrir acceso</a>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Dashboard previsto tras la conexion: ${escapeHtml(input.dashboardUrl)}</p>
      </div>
    `.trim(),
    text: `Bienvenido a Isaak para Holded.\n\n1) Confirma tu correo.\n2) Entra en tu acceso.\n3) Conecta tu API key de Holded.\n4) Accede al dashboard.\n\nAcceso: ${input.accessUrl}\nDashboard: ${input.dashboardUrl}`,
  };
}

function buildAdminNotificationEmail(input: {
  email: string;
  source: string;
  accessUrl: string;
  createdAt: string;
}) {
  return {
    subject: `Nuevo usuario Holded: ${input.email}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#eef4ff;color:#1f55c0;font-size:12px;font-weight:700;letter-spacing:0.04em;">Admin Holded</div>
        <h1 style="font-size:24px;line-height:1.2;margin:16px 0 8px;">Nuevo usuario registrado</h1>
        <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin:0 0 10px;"><strong>Origen:</strong> ${escapeHtml(input.source)}</p>
        <p style="margin:0 0 10px;"><strong>Fecha:</strong> ${escapeHtml(input.createdAt)}</p>
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Abrir producto</a>
      </div>
    `.trim(),
    text: `Nuevo usuario registrado en Holded\n\nEmail: ${input.email}\nOrigen: ${input.source}\nFecha: ${input.createdAt}\n\nProducto: ${input.accessUrl}`,
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

    await prisma.user.upsert({
      where: { email: decoded.email },
      update: {
        name: decoded.name || decoded.email.split('@')[0],
        authProvider: 'FIREBASE',
        authSubject: decoded.uid,
      },
      create: {
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0],
        authProvider: 'FIREBASE',
        authSubject: decoded.uid,
      },
    });

    const holdedSite = readOptionalEnv(
      'NEXT_PUBLIC_HOLDED_SITE_URL',
      'https://holded.verifactu.business'
    );
    const accessUrl = new URL(`${holdedSite}/auth/holded`);
    accessUrl.searchParams.set('source', source);
    const dashboardUrl = new URL(`${holdedSite}/dashboard`);
    dashboardUrl.searchParams.set('source', source);
    const adminUrl = new URL(`${holdedSite}/admin`);
    const continueUrl = new URL(`${holdedSite}/verificar`);
    continueUrl.searchParams.set('source', source);
    continueUrl.searchParams.set('step', 'verified');
    continueUrl.searchParams.set('email', decoded.email);

    const verificationUrl = await app.auth().generateEmailVerificationLink(decoded.email, {
      url: continueUrl.toString(),
      handleCodeInApp: false,
    });

    const resend = new Resend(requireEnv('RESEND_API_KEY'));
    const from = readOptionalEnv('RESEND_FROM', 'Isaak for Holded <holded@verifactu.business>');
    const replyTo = readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');
    const adminRecipients = (
      process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS?.trim() || 'soporte@verifactu.business'
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const template = buildVerificationEmail({ email: decoded.email, verificationUrl });
    const welcome = buildWelcomeEmail({
      email: decoded.email,
      accessUrl: accessUrl.toString(),
      dashboardUrl: dashboardUrl.toString(),
    });
    const adminNotification = buildAdminNotificationEmail({
      email: decoded.email,
      source,
      accessUrl: adminUrl.toString(),
      createdAt: new Date().toISOString(),
    });
    let newUsersCount = 0;
    let connectedCount = 0;
    let disconnectedCount = 0;

    try {
      [newUsersCount, connectedCount, disconnectedCount] = await Promise.all([
        prisma.user.count({
          where: {
            authProvider: 'FIREBASE',
            createdAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
            },
          },
        }),
        prisma.externalConnection.count({
          where: { provider: 'holded', connectionStatus: 'connected' },
        }),
        prisma.externalConnection.count({
          where: { provider: 'holded', connectionStatus: 'disconnected' },
        }),
      ]);
    } catch (summaryError) {
      console.warn('[holded auth register] admin summary unavailable', {
        error: summaryError instanceof Error ? summaryError.message : String(summaryError),
      });
    }

    const [verificationResult, welcomeResult] = await Promise.all([
      resend.emails.send({
        from,
        to: [decoded.email],
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo,
      }),
      resend.emails.send({
        from,
        to: [decoded.email],
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
        replyTo,
      }),
    ]);

    if (adminRecipients.length > 0) {
      resend.emails
        .send({
          from,
          to: adminRecipients,
          subject: adminNotification.subject,
          html: `${adminNotification.html}
            <p style="margin:16px 0 0;color:#475569;font-size:13px;">
              Resumen rapido: nuevos usuarios (7 dias): ${newUsersCount} · conexiones activas: ${connectedCount} · conexiones desconectadas: ${disconnectedCount}
            </p>
            <p style="margin:16px 0 0;">
              <a href="${adminUrl.toString()}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:700;">Abrir panel admin</a>
            </p>`,
          text: `${adminNotification.text}\n\nResumen rapido: nuevos usuarios (7 dias): ${newUsersCount} · conexiones activas: ${connectedCount} · conexiones desconectadas: ${disconnectedCount}\n\nPanel admin: ${adminUrl.toString()}`,
          replyTo,
        })
        .catch((notificationError) => {
          console.error('[holded auth register] admin notification failed', {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          });
        });
    }

    return NextResponse.json({
      ok: true,
      verificationEmailId: verificationResult.data?.id ?? null,
      welcomeEmailId: welcomeResult.data?.id ?? null,
    });
  } catch (error) {
    console.error('[holded auth register] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
