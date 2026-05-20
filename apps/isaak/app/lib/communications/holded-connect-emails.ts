import { Resend } from 'resend';

type ConnectInput = {
  userEmail: string | null;
  userName: string | null;
  companyName: string | null;
  connectedAt: string;
  supportedModules?: string[];
};

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function readEmailList(...values: Array<string | undefined | null>) {
  const merged = values
    .map((v) => cleanEnv(v || undefined))
    .filter(Boolean)
    .join(',');
  return merged
    .split(/[,\n;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function greeting(name: string | null) {
  const n = name?.trim();
  return n ? `Hola ${n},` : 'Hola,';
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function moduleLabel(m: string) {
  const map: Record<string, string> = {
    invoicing: 'Ventas',
    accounting: 'Contabilidad',
    crm: 'CRM',
    projects: 'Proyectos',
    team: 'Equipo',
  };
  return map[m] ?? m;
}

function resolveSender() {
  return (
    cleanEnv(process.env.RESEND_FROM_ISAAK) ||
    cleanEnv(process.env.RESEND_FROM) ||
    'Isaak <no-reply@isaak.verifactu.business>'
  );
}

function isaakDashboardUrl() {
  return (
    (cleanEnv(process.env.NEXT_PUBLIC_ISAAK_URL) || 'https://app.verifactu.business') + '/chat'
  );
}

function legalFooter() {
  return `
    <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
      Powered by <a href="https://verifactu.business" style="color:#2361d8;">verifactu.business</a> ·
      <a href="https://app.verifactu.business/privacy" style="color:#2361d8;">Privacidad</a> ·
      <a href="https://app.verifactu.business/terms" style="color:#2361d8;">Términos</a>
    </p>`.trim();
}

function buildUserEmail(input: ConnectInput) {
  const company = input.companyName || 'tu empresa';
  const dashUrl = isaakDashboardUrl();
  const modules = (input.supportedModules ?? []).map(moduleLabel).filter(Boolean);
  const moduleList = modules.length
    ? `<ul style="margin:8px 0 14px;padding-left:18px;">${modules.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`
    : '';

  return {
    subject: `Holded conectado — Isaak ya accede a los datos de ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;background:#f0f4ff;">
        <div style="background:#fff;border:1px solid #c7d7f7;border-radius:24px;padding:28px;box-shadow:0 18px 40px rgba(15,23,42,0.06);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.04em;">Conexión activa</div>
          <h1 style="font-size:26px;line-height:1.2;margin:16px 0 12px;color:#011c67;">Holded ya está conectado con Isaak 🎉</h1>
          <p style="margin:0 0 14px;">${escapeHtml(greeting(input.userName))}</p>
          <p style="margin:0 0 14px;">Hemos conectado correctamente Holded con <strong>${escapeHtml(company)}</strong>. A partir de ahora, Isaak puede responder con datos reales de tu empresa.</p>
          ${moduleList ? `<p style="margin:0 0 8px;">Módulos activos detectados:</p>${moduleList}` : ''}
          <p style="margin:0 0 20px;">Prueba preguntarle a Isaak por tus ventas del mes, cobros pendientes o el estado de un cliente.</p>
          <a href="${dashUrl}" style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">Ir a Isaak →</a>
          ${legalFooter()}
        </div>
      </div>`.trim(),
    text: `${greeting(input.userName)}\n\nHolded ya está conectado con Isaak para ${company}.\n\nMódulos activos: ${modules.join(', ') || 'pendiente de detectar'}.\n\nAbre Isaak aquí: ${dashUrl}`,
  };
}

function buildAdminEmail(input: ConnectInput) {
  const company = input.companyName || 'empresa no detectada';
  const modules = (input.supportedModules ?? []).map(moduleLabel).filter(Boolean);

  return {
    subject: `Isaak: Holded conectado en ${company}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a;max-width:640px;margin:0 auto;padding:24px;">
        <h1 style="font-size:22px;margin:0 0 16px;">Nueva conexión Holded en Isaak</h1>
        <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
        <p><strong>Email usuario:</strong> ${escapeHtml(input.userEmail || 'no disponible')}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(fmtDate(input.connectedAt))}</p>
        <p><strong>Módulos:</strong> ${escapeHtml(modules.join(', ') || 'pendiente')}</p>
        ${legalFooter()}
      </div>`.trim(),
    text: `Nueva conexión Holded en Isaak\n\nEmpresa: ${company}\nEmail: ${input.userEmail || 'no disponible'}\nFecha: ${fmtDate(input.connectedAt)}\nMódulos: ${modules.join(', ') || 'pendiente'}`,
  };
}

export async function sendHoldedConnectNotifications(input: ConnectInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from = resolveSender();
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  const adminRecipients = readEmailList(
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
    'soporte@verifactu.business'
  );

  const tasks: Promise<unknown>[] = [];

  if (input.userEmail) {
    const t = buildUserEmail(input);
    tasks.push(
      resend.emails.send({
        from,
        to: [input.userEmail],
        subject: t.subject,
        html: t.html,
        text: t.text,
        replyTo,
      })
    );
  }

  if (adminRecipients.length > 0) {
    const t = buildAdminEmail(input);
    tasks.push(
      resend.emails.send({
        from,
        to: adminRecipients,
        subject: t.subject,
        html: t.html,
        text: t.text,
        replyTo,
      })
    );
  }

  if (tasks.length) await Promise.allSettled(tasks);
}
