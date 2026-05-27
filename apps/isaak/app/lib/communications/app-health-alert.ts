import { Resend } from 'resend';

export type AppHealthAlertInput = {
  failedServices: string[];
  details: Record<string, unknown>;
  timestamp: string;
};

function cleanEnv(v: string | undefined) {
  return v?.replace(/[\r\n]/g, '').trim();
}

function buildHtml(input: AppHealthAlertInput): string {
  const serviceList = input.failedServices
    .map((s) => `<li style="margin-bottom:4px;">⚠️ <strong>${s}</strong></li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Alerta de sistema</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:28px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:700;">🚨 Isaak — Alerta de sistema</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a;font-weight:600;">Se han detectado fallos en los siguientes servicios:</p>
          <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#374151;">${serviceList}</ul>
          <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
            <pre style="margin:0;font-size:12px;color:#7f1d1d;overflow:auto;">${JSON.stringify(input.details, null, 2)}</pre>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;">Detectado: ${input.timestamp}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendAppHealthAlert(input: AppHealthAlertInput): Promise<void> {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from =
    cleanEnv(process.env.RESEND_FROM_ISAAK) ||
    cleanEnv(process.env.RESEND_FROM) ||
    'Isaak <hola@verifactu.business>';
  const to = cleanEnv(process.env.ADMIN_ALERT_EMAIL) || 'kiabusiness2025@gmail.com';

  await resend.emails.send({
    from,
    to: [to],
    subject: `🚨 Isaak app DOWN — ${input.failedServices.join(', ')}`,
    html: buildHtml(input),
    text: `ALERTA: servicios caídos en Isaak\n\n${input.failedServices.join(', ')}\n\nDetalles:\n${JSON.stringify(input.details, null, 2)}\n\nDetectado: ${input.timestamp}`,
    replyTo: 'soporte@verifactu.business',
  });
}
