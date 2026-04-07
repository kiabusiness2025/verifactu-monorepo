import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@verifactu/utils';
import { sendCustomEmail } from '@/lib/email/emailService';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { getPreferredFirstName } from '@/lib/personName';
import {
  mintHoldedEmailVerificationToken,
  mintHoldedOnboardingTokenForSubject,
} from '@/lib/oauth/mcp';

export const runtime = 'nodejs';

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitizeReturnUrl(value: string | null | undefined) {
  const fallback = new URL('/onboarding/holded', getAppUrl());
  if (!value) return fallback;

  try {
    const parsed = new URL(value, getAppUrl());
    if (parsed.origin !== fallback.origin) return fallback;
    if (!parsed.pathname.startsWith('/onboarding/holded')) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function buildVerificationEmailHtml(input: {
  firstName: string;
  verificationUrl: string;
  email: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Confirma tu correo para conectar Holded</h2>
      <p>Hola ${input.firstName},</p>
      <p>Solo nos falta confirmar que este correo es tuyo antes de seguir con la conexion del conector directo de Holded para ChatGPT.</p>
      <p>
        <a href="${input.verificationUrl}" style="display:inline-block; background:#111111; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:999px; font-weight:600;">
          Confirmar correo y continuar
        </a>
      </p>
      <p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
      <p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>
      <p style="font-size:13px; color:#5b6777;">Correo asociado: ${input.email}</p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  const onboardingSession = await resolveHoldedOnboardingSessionFromHeaders(request.headers);
  if (!onboardingSession?.uid) {
    return NextResponse.json({ ok: false, error: 'onboarding session required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const returnUrl = sanitizeReturnUrl(typeof body?.returnUrl === 'string' ? body.returnUrl : null);

  if (!looksLikeEmail(email)) {
    return NextResponse.json({ ok: false, error: 'valid email required' }, { status: 400 });
  }

  const verificationToken = await mintHoldedEmailVerificationToken({
    uid: onboardingSession.uid,
    email,
    name: onboardingSession.name,
    tenantId: onboardingSession.tenantId,
    firstName: onboardingSession.firstName,
    lastName: onboardingSession.lastName,
    returnUrl: returnUrl.toString(),
  });

  const verificationUrl = new URL('/onboarding/holded/verify', getAppUrl());
  verificationUrl.searchParams.set('token', verificationToken);

  const emailResult = await sendCustomEmail({
    to: email,
    subject: 'Confirma tu correo para conectar Holded',
    html: buildVerificationEmailHtml({
      firstName: getPreferredFirstName({
        firstName: onboardingSession.firstName,
        fullName: onboardingSession.name,
        email,
        fallback: 'equipo',
      }),
      verificationUrl: verificationUrl.toString(),
      email,
    }),
  });

  if (!emailResult?.success) {
    return NextResponse.json(
      { ok: false, error: 'No hemos podido enviar el correo de verificacion.' },
      { status: 502 }
    );
  }

  const onboardingToken = await mintHoldedOnboardingTokenForSubject({
    uid: onboardingSession.uid,
    email,
    name: onboardingSession.name,
    tenantId: onboardingSession.tenantId,
    authMethod: 'email',
    emailVerified: false,
    firstName: onboardingSession.firstName,
    lastName: onboardingSession.lastName,
    verifiedAt: onboardingSession.verifiedAt,
  });

  return NextResponse.json({
    ok: true,
    onboardingToken,
    identity: {
      authMethod: 'email',
      email,
      emailVerified: false,
    },
  });
}
