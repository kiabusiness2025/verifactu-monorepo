import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  buildHoldedVerificationEmail,
  buildHoldedWelcomeEmail,
} from '@/app/lib/communications/holded-email-templates';
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

function readEmailList(...values: Array<string | undefined | null>) {
  const merged = values
    .map((value) => cleanEnv(value || undefined))
    .filter(Boolean)
    .join(',');

  return merged
    .split(/[,\n;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeName(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 3 ? trimmed : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 6 ? trimmed : null;
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

function buildAdminNotificationEmail(input: {
  name: string;
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
        <p style="margin:0 0 10px;"><strong>Nombre:</strong> ${escapeHtml(input.name)}</p>
        <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p style="margin:0 0 10px;"><strong>Origen:</strong> ${escapeHtml(input.source)}</p>
        <p style="margin:0 0 10px;"><strong>Fecha:</strong> ${escapeHtml(input.createdAt)}</p>
        <a href="${escapeHtml(input.accessUrl)}" style="display:inline-block;background:#ff5460;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Abrir producto</a>
      </div>
    `.trim(),
    text: `Nuevo usuario registrado en Holded\n\nNombre: ${input.name}\nEmail: ${input.email}\nOrigen: ${input.source}\nFecha: ${input.createdAt}\n\nProducto: ${input.accessUrl}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
    const source = typeof body?.source === 'string' ? body.source : 'holded_signup';
    const fullName = normalizeName(body?.fullName);
    const phone = normalizePhone(body?.phone);

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const app = ensureAdminApp();
    const decoded = await app.auth().verifyIdToken(idToken);
    if (!decoded.email) {
      return NextResponse.json({ error: 'Missing email in token' }, { status: 400 });
    }

    const userName = fullName || decoded.name || decoded.email.split('@')[0];

    const user = await prisma.user.upsert({
      where: { email: decoded.email },
      update: {
        name: userName,
        authProvider: 'FIREBASE',
        authSubject: decoded.uid,
      },
      create: {
        email: decoded.email,
        name: userName,
        authProvider: 'FIREBASE',
        authSubject: decoded.uid,
      },
    });

    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        status: 'active',
      },
      select: { tenantId: true },
    });

    if (!existingMembership) {
      await prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: {
            name: `${userName} - Holded`,
            profile: {
              create: {
                source: 'manual',
                representative: userName,
                email: decoded.email,
                phone: phone || undefined,
              },
            },
          },
          select: { id: true },
        });

        await tx.membership.create({
          data: {
            tenantId: created.id,
            userId: user.id,
            role: 'owner',
            status: 'active',
          },
        });

        await tx.userPreference.upsert({
          where: { userId: user.id },
          update: { preferredTenantId: created.id },
          create: {
            userId: user.id,
            preferredTenantId: created.id,
          },
        });
      });
    } else {
      await prisma.tenantProfile.upsert({
        where: { tenantId: existingMembership.tenantId },
        update: {
          representative: userName,
          email: decoded.email,
          phone: phone || undefined,
        },
        create: {
          tenantId: existingMembership.tenantId,
          source: 'manual',
          representative: userName,
          email: decoded.email,
          phone: phone || undefined,
        },
      });
    }

    const holdedSite = readOptionalEnv(
      'NEXT_PUBLIC_HOLDED_SITE_URL',
      'https://holded.verifactu.business'
    );
    const adminUrl = new URL(`${holdedSite}/admin`);
    const from = readOptionalEnv('RESEND_FROM', 'Isaak for Holded <holded@verifactu.business>');
    const replyTo = readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');
    const adminRecipients = readEmailList(
      process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
      process.env.HOLDED_ADMIN_EMAILS,
      process.env.ADMIN_EMAILS,
      'soporte@verifactu.business'
    );
    const adminNotification = buildAdminNotificationEmail({
      name: userName,
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

    const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
    let resend: Resend | null = null;
    let verificationEmailId: string | null = null;
    let verificationEmailSent = false;
    let welcomeEmailId: string | null = null;

    if (resendApiKey) {
      resend = new Resend(resendApiKey);

      try {
        const continueUrl = new URL(`${holdedSite}/verificar`);
        continueUrl.searchParams.set('source', source);
        continueUrl.searchParams.set('step', 'verified');
        continueUrl.searchParams.set('email', decoded.email);

        const verificationUrl = await app.auth().generateEmailVerificationLink(decoded.email, {
          url: continueUrl.toString(),
          handleCodeInApp: false,
        });

        const template = buildHoldedVerificationEmail({ email: decoded.email, verificationUrl });
        const verificationResult = await resend.emails.send({
          from,
          to: [decoded.email],
          subject: template.subject,
          html: template.html,
          text: template.text,
          replyTo,
        });

        verificationEmailId = verificationResult.data?.id ?? null;
        verificationEmailSent = true;
      } catch (verificationError) {
        console.error('[holded auth register] verification email failed', {
          error:
            verificationError instanceof Error
              ? verificationError.message
              : String(verificationError),
        });
      }

      try {
        const welcome = buildHoldedWelcomeEmail({
          name: userName,
          email: decoded.email,
          companyName: 'tu empresa',
          phone: phone || undefined,
          source,
        });
        const welcomeResult = await resend.emails.send({
          from,
          to: [decoded.email],
          subject: welcome.subject,
          html: welcome.html,
          text: welcome.text,
          replyTo,
        });

        welcomeEmailId = welcomeResult.data?.id ?? null;
      } catch (welcomeError) {
        console.error('[holded auth register] welcome email failed', {
          error: welcomeError instanceof Error ? welcomeError.message : String(welcomeError),
        });
      }
    }

    if (adminRecipients.length > 0 && resend) {
      try {
        await resend.emails.send({
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
        });
      } catch (notificationError) {
        console.error('[holded auth register] admin notification failed', {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      verificationEmailId,
      verificationEmailSent,
      welcomeEmailId,
    });
  } catch (error) {
    console.error('[holded auth register] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
