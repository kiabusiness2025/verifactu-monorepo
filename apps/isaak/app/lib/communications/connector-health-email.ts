import { Resend } from 'resend';

export type ConnectorHealthAlertInput = {
  userEmail: string;
  userName: string | null;
  connector: 'holded' | 'banking';
  connectorName: string;
  reason: string;
  actionUrl: string;
  actionLabel: string;
};

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function greeting(name: string | null) {
  const n = name?.trim();
  return n ? `Hola ${n},` : 'Hola,';
}

function buildHtml(input: ConnectorHealthAlertInput): string {
  const iconColor = '#d97706';
  const iconBg = '#fef3c7';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Problema de conexión</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#081936,#0b2060);padding:28px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">Isaak</span>
          <span style="color:#8ba0cc;font-size:13px;margin-left:8px;">Asistente fiscal inteligente</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="display:inline-flex;align-items:center;background:${iconBg};border-radius:12px;padding:10px 14px;margin-bottom:20px;">
            <span style="font-size:18px;margin-right:8px;">⚠️</span>
            <span style="font-size:13px;font-weight:700;color:${iconColor};">Conexión con problema</span>
          </div>
          <p style="margin:0 0 8px;font-size:15px;color:#0f172a;">${greeting(input.userName)}</p>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            Isaak ha detectado un problema con tu conexión de <strong>${input.connectorName}</strong>:
          </p>
          <div style="background:#fef3c7;border-left:4px solid #d97706;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">${input.reason}</p>
          </div>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
            Mientras no se resuelva, Isaak puede responder con datos desactualizados o sin acceso a información de ${input.connectorName}.
            Reconecta o revisa la integración para restaurar la funcionalidad completa.
          </p>
          <a href="${input.actionUrl}"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:9999px;">
            ${input.actionLabel}
          </a>
        </td></tr>
        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            © 2026 Verifactu Business ·
            <a href="https://isaak.verifactu.business/settings?section=integraciones" style="color:#94a3b8;">Gestionar integraciones</a> ·
            <a href="https://isaak.verifactu.business" style="color:#94a3b8;">isaak.verifactu.business</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(input: ConnectorHealthAlertInput): string {
  return [
    greeting(input.userName),
    '',
    `Isaak ha detectado un problema con tu conexión de ${input.connectorName}:`,
    '',
    input.reason,
    '',
    'Mientras no se resuelva, Isaak puede responder con datos desactualizados.',
    '',
    `${input.actionLabel}: ${input.actionUrl}`,
  ].join('\n');
}

export async function sendConnectorHealthAlert(input: ConnectorHealthAlertInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from =
    cleanEnv(process.env.RESEND_FROM_ISAAK) ||
    cleanEnv(process.env.RESEND_FROM) ||
    'Isaak <hola@verifactu.business>';

  await resend.emails.send({
    from,
    to: [input.userEmail],
    subject: `Problema con tu conexión de ${input.connectorName} en Isaak`,
    html: buildHtml(input),
    text: buildText(input),
    replyTo: 'soporte@verifactu.business',
  });
}
