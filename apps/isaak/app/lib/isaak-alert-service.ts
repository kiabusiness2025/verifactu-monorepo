import type { IsaakAlertChannel, Prisma } from '@prisma/client';
import { sendEmail } from '@verifactu/integrations';
import { prisma } from '@/app/lib/prisma';
import { sendPushToTenant } from '@/app/lib/push-service';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export type CreateAlertInput = {
  tenantId: string;
  type: string;
  title: string;
  body: string;
  dueDate?: Date;
  channel?: IsaakAlertChannel;
  metadata?: Prisma.InputJsonObject;
};

export async function createAlert(input: CreateAlertInput) {
  return prisma.isaakAlert.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      title: input.title,
      body: input.body,
      dueDate: input.dueDate,
      channel: input.channel ?? 'email',
      metadata: input.metadata ?? undefined,
    },
  });
}

function fiscalAlertHtml(title: string, body: string, daysLeft: number) {
  const urgencyColor = daysLeft <= 1 ? '#dc2626' : daysLeft <= 3 ? '#d97706' : '#2361d8';
  const urgencyLabel =
    daysLeft === 0 ? 'Vence HOY' : daysLeft === 1 ? 'Vence MAÑANA' : `Vence en ${daysLeft} días`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Alerta fiscal</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#081936,#0b2060);padding:28px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">Isaak</span>
          <span style="color:#8ba0cc;font-size:13px;margin-left:8px;">Asistente fiscal inteligente</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <span style="display:inline-block;background:${urgencyColor}1a;color:${urgencyColor};font-size:12px;font-weight:700;padding:4px 10px;border-radius:9999px;letter-spacing:.05em;margin-bottom:12px;">
            ${urgencyLabel}
          </span>
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">${title}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${body}</p>
          <a href="${ISAAK_PUBLIC_URL}/fiscal"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:9999px;margin:0 0 24px;">
            Ver calendario fiscal
          </a>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
            Puedes gestionar tus alertas en
            <a href="${ISAAK_PUBLIC_URL}/settings?section=notificaciones" style="color:#2361d8;">ajustes de notificaciones</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            © 2026 Isaak · <a href="${ISAAK_PUBLIC_URL}" style="color:#94a3b8;">${new URL(ISAAK_PUBLIC_URL).hostname}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function fanOutAlert(
  alert: {
    id: string;
    tenantId: string;
    type: string;
    title: string;
    body: string;
    dueDate: Date | null;
    channel: IsaakAlertChannel;
  },
  recipientEmail: string,
  daysLeft: number
) {
  if (alert.channel === 'email') {
    await sendEmail({
      to: recipientEmail,
      from:
        process.env.RESEND_FROM_ISAAK?.trim() ||
        process.env.RESEND_FROM?.trim() ||
        'Isaak <noreply@isaak.app>',
      subject: alert.title,
      html: fiscalAlertHtml(alert.title, alert.body, daysLeft),
    });
  }

  if (alert.channel === 'push' || alert.channel === 'in_app') {
    await sendPushToTenant(alert.tenantId, {
      title: alert.title,
      body: alert.body,
      url: '/fiscal',
      tag: `fiscal-${alert.type}`,
    }).catch(() => null);
  }

  await prisma.isaakAlert.update({
    where: { id: alert.id },
    data: { status: 'sent', sentAt: new Date() },
  });
}
