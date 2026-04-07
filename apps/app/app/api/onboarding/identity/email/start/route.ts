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
  const holdedLogoUrl = new URL('/brand/holded/holded-diamond-logo.png', getAppUrl()).toString();

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 55%,#eef4ff 100%);border-bottom:1px solid #fde7ea;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;">
                <div style="display:inline-flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:#ffffff;border:1px solid #f3d0d7;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">
                  <img src="${holdedLogoUrl}" alt="Holded" width="18" height="18" style="display:block;border:0;" />
                  Holded
                </div>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:28px;">
          <h1 style="font-size:28px;line-height:1.15;margin:0 0 12px;">Confirma tu correo para continuar con Holded</h1>
          <p style="margin:0 0 14px;">Hola ${input.firstName},</p>
          <p style="margin:0 0 14px;">Ya hemos preparado el acceso para el conector directo de Holded. Solo falta confirmar que este correo es tuyo para desbloquear el siguiente paso del onboarding.</p>
          <p style="margin:0 0 18px;"><strong>Correo asociado:</strong> ${input.email}</p>
          <a href="${input.verificationUrl}" style="display:inline-block;background:#ff5460;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar correo y volver</a>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Cuando abras el enlace volveras al onboarding y se habilitara automaticamente el paso Usuario.</p>
          <div style="margin:18px 0 0;padding:16px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="font-weight:700;margin:0 0 8px;">Si el boton no funciona</div>
            <p style="margin:0 0 8px;color:#475569;">Copia y pega este enlace en tu navegador:</p>
            <p style="margin:0;word-break:break-all;"><a href="${input.verificationUrl}" style="color:#b4233c;text-decoration:none;">${input.verificationUrl}</a></p>
          </div>
          <p style="margin:18px 0 0;color:#64748b;font-size:12px;">Powered by <a href="https://verifactu.business" style="color:#b4233c;text-decoration:none;">verifactu.business</a></p>
        </div>
      </div>
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
    senderProfile: 'holded',
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
