import { Resend } from 'resend';

type DisconnectNotificationInput = {
  userEmail: string | null;
  userName: string | null;
  companyName: string | null;
  disconnectedAtIso: string;
};

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

function greeting(name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? `Hola ${trimmed},` : 'Hola,';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function resolveSender() {
  return (
    cleanEnv(process.env.RESEND_FROM_HOLDED) ||
    cleanEnv(process.env.RESEND_FROM) ||
    'Isaak for Holded <holded@verifactu.business>'
  );
}

function resolveReplyTo() {
  return readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');
}

function buildUserEmail(input: DisconnectNotificationInput) {
  const company = input.companyName || 'tu empresa';
  const disconnectedAt = formatDate(input.disconnectedAtIso);

  return {
    subject: 'Holded se ha desconectado de Isaak',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff7f7;">
        <div style="background:#ffffff;border:1px solid #fecaca;border-radius:24px;padding:28px;box-shadow:0 18px 40px rgba(15,23,42,0.06);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;letter-spacing:0.04em;">Aviso de seguridad</div>
          <h1 style="font-size:28px;line-height:1.15;margin:16px 0 12px;">Holded se ha desconectado de Isaak</h1>
          <p style="margin:0 0 14px;">${escapeHtml(greeting(input.userName))}</p>
          <p style="margin:0 0 14px;">Hemos detectado que la conexion de Holded para <strong>${escapeHtml(company)}</strong> se ha desconectado el <strong>${escapeHtml(disconnectedAt)}</strong>.</p>
          <p style="margin:0 0 14px;">Mientras siga desconectado, Isaak perdera acceso a los datos reales de tu empresa en Holded y algunas respuestas o acciones quedaran limitadas.</p>
          <p style="margin:0 0 20px;">Si no has sido tu, revisa el acceso cuanto antes y vuelve a conectar Holded.</p>
          <a href="https://isaak.verifactu.business/settings?section=connections" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Revisar conexion</a>
        </div>
      </div>
    `.trim(),
    text: `${greeting(input.userName)}\n\nHemos detectado que la conexion de Holded para ${company} se ha desconectado el ${disconnectedAt}.\n\nMientras siga desconectado, Isaak perdera acceso a los datos reales de tu empresa en Holded.\n\nRevisa la conexion aqui: https://isaak.verifactu.business/settings?section=connections`,
  };
}

function buildAdminEmail(input: DisconnectNotificationInput) {
  const company = input.companyName || 'empresa no detectada';
  const disconnectedAt = formatDate(input.disconnectedAtIso);

  return {
    subject: `Alerta: Holded desconectado en ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#fff;">
        <h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;">Desconexion de Holded detectada</h1>
        <p style="margin:0 0 10px;"><strong>Empresa:</strong> ${escapeHtml(company)}</p>
        <p style="margin:0 0 10px;"><strong>Email usuario:</strong> ${escapeHtml(input.userEmail || 'no disponible')}</p>
        <p style="margin:0 0 10px;"><strong>Fecha:</strong> ${escapeHtml(disconnectedAt)}</p>
        <p style="margin:0 0 16px;">Isaak deja de tener acceso a datos reales hasta que Holded vuelva a conectarse.</p>
        <a href="https://isaak.verifactu.business/settings?section=connections" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">Abrir ajustes</a>
      </div>
    `.trim(),
    text: `Desconexion de Holded detectada\n\nEmpresa: ${company}\nEmail usuario: ${input.userEmail || 'no disponible'}\nFecha: ${disconnectedAt}\n\nIsaak deja de tener acceso a datos reales hasta que Holded vuelva a conectarse.\n\nAjustes: https://isaak.verifactu.business/settings?section=connections`,
  };
}

export async function sendHoldedDisconnectNotifications(input: DisconnectNotificationInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from = resolveSender();
  const replyTo = resolveReplyTo();
  const adminRecipients = readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
    'soporte@verifactu.business'
  );

  const tasks: Promise<unknown>[] = [];

  if (input.userEmail) {
    const userEmail = buildUserEmail(input);
    tasks.push(
      resend.emails.send({
        from,
        to: [input.userEmail],
        subject: userEmail.subject,
        html: userEmail.html,
        text: userEmail.text,
        replyTo,
      })
    );
  }

  if (adminRecipients.length > 0) {
    const adminEmail = buildAdminEmail(input);
    tasks.push(
      resend.emails.send({
        from,
        to: adminRecipients,
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
        replyTo,
      })
    );
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}
