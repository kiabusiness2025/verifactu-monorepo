import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@verifactu/utils';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { sendCustomEmail } from '@/lib/email/emailService';
import prisma from '@/lib/prisma';
import {
  createCompanyNotificationEmailChangeRequest,
  getConfirmedCompanyNotificationEmail,
} from '@/lib/integrations/companyNotificationEmailStore';

export const runtime = 'nodejs';

const CHANGE_LINK_TTL_MINUTES = 45;

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized || null;
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildChangeRequestEmailHtml(input: {
  currentEmail: string;
  requestedEmail: string;
  confirmUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 55%,#eef4ff 100%);border-bottom:1px solid #fde7ea;">
          <div style="display:inline-flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:#ffffff;border:1px solid #f3d0d7;color:#b4233c;font-size:12px;font-weight:700;letter-spacing:0.04em;">
            Aviso de seguridad
          </div>
        </div>
        <div style="padding:28px;">
          <h1 style="font-size:26px;line-height:1.2;margin:0 0 12px;">Confirma el cambio del correo de empresa</h1>
          <p style="margin:0 0 14px;">Has solicitado cambiar el correo de avisos de tu empresa.</p>
          <p style="margin:0 0 8px;"><strong>Correo actual:</strong> ${input.currentEmail}</p>
          <p style="margin:0 0 18px;"><strong>Nuevo correo:</strong> ${input.requestedEmail}</p>
          <a href="${input.confirmUrl}" style="display:inline-block;background:#ff5460;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Confirmar cambio</a>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;">Este enlace caduca en ${CHANGE_LINK_TTL_MINUTES} minutos.</p>
          <p style="margin:8px 0 0;color:#64748b;font-size:12px;">Si no has sido tú, ignora este mensaje y no se aplicará ningún cambio.</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext({ channelType: 'dashboard' });
  if ('error' in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedEmail = typeof body.newEmail === 'string' ? normalizeEmail(body.newEmail) : null;

  if (!requestedEmail || !looksLikeEmail(requestedEmail)) {
    return NextResponse.json(
      { ok: false, error: 'Indica un correo valido para la empresa.' },
      { status: 400 }
    );
  }

  const confirmedCompanyEmail = await getConfirmedCompanyNotificationEmail(auth.tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: {
      profile: {
        select: {
          email: true,
        },
      },
    },
  });

  const currentConfirmedEmail =
    confirmedCompanyEmail || normalizeEmail(tenant?.profile?.email) || null;

  if (!currentConfirmedEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Aun no hay un correo de empresa confirmado para validar el cambio. Configuralo primero desde soporte.',
      },
      { status: 409 }
    );
  }

  if (currentConfirmedEmail === requestedEmail) {
    return NextResponse.json(
      { ok: false, error: 'Ese correo ya es el correo confirmado de la empresa.' },
      { status: 409 }
    );
  }

  const changeRequest = await createCompanyNotificationEmailChangeRequest({
    tenantId: auth.tenantId,
    requestedEmail,
    currentConfirmedEmail,
    requestedByUid: auth.session.uid,
    ttlMinutes: CHANGE_LINK_TTL_MINUTES,
  });

  const confirmUrl = new URL(
    '/api/integrations/accounting/company-email/change/confirm',
    getAppUrl()
  );
  confirmUrl.searchParams.set('token', changeRequest.token);

  const emailResult = await sendCustomEmail({
    to: currentConfirmedEmail,
    subject: 'Confirma el cambio del correo de avisos de empresa',
    senderProfile: 'holded',
    html: buildChangeRequestEmailHtml({
      currentEmail: currentConfirmedEmail,
      requestedEmail,
      confirmUrl: confirmUrl.toString(),
    }),
  });

  if (!emailResult?.success) {
    return NextResponse.json(
      { ok: false, error: 'No hemos podido enviar el correo de confirmacion.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Hemos enviado un enlace de confirmacion a ${currentConfirmedEmail}.`,
    sentTo: currentConfirmedEmail,
    requestedEmail,
  });
}
