/**
 * Email notifications for Isaak integration connections.
 * One function per integration; all share the same Isaak brand template.
 */
import { Resend } from 'resend';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function cleanEnv(v: string | undefined) {
  return v?.replace(/[\r\n]/g, '').trim();
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function greeting(name: string | null) {
  const n = name?.trim();
  return n ? `Hola ${escapeHtml(n)},` : 'Hola,';
}

function sender() {
  return (
    cleanEnv(process.env.RESEND_FROM_ISAAK) ||
    cleanEnv(process.env.RESEND_FROM) ||
    `Isaak <no-reply@${new URL(ISAAK_PUBLIC_URL).hostname}>`
  );
}

function adminEmails() {
  const raw = [
    process.env.HOLDED_ADMIN_NOTIFICATION_EMAILS,
    process.env.HOLDED_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
    'soporte@verifactu.business',
  ]
    .map((v) => cleanEnv(v || undefined))
    .filter(Boolean)
    .join(',');
  return raw
    .split(/[,\n;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
}

// ─── Brand template ──────────────────────────────────────────────────────────

type TemplateInput = {
  userName: string | null;
  badgeEmoji: string;
  badgeLabel: string;
  badgeColor: string; // hex, e.g. "#16a34a"
  badgeBg: string; // hex, e.g. "#dcfce7"
  heading: string;
  body: string;
  featuresHtml: string;
  ctaLabel: string;
  ctaUrl: string;
};

function buildHtml(t: TemplateInput): string {
  const integrationsUrl = `${ISAAK_PUBLIC_URL}/integrations`;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(t.heading)}</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,0.08);border:1px solid #c7d7f7;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#081936 0%,#0b2060 100%);padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Isaak</span>
                <span style="color:#8ba0cc;font-size:12px;margin-left:8px;">Asistente fiscal inteligente</span>
              </td>
              <td align="right">
                <span style="background:rgba(255,255,255,0.12);color:#c7d7f7;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;">Nueva integración</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 32px 8px;">
          <!-- Badge -->
          <div style="display:inline-block;background:${escapeHtml(t.badgeBg)};border-radius:99px;padding:6px 14px;margin-bottom:20px;">
            <span style="font-size:15px;margin-right:6px;">${t.badgeEmoji}</span>
            <span style="font-size:12px;font-weight:700;color:${escapeHtml(t.badgeColor)};letter-spacing:0.03em;">${escapeHtml(t.badgeLabel)}</span>
          </div>

          <h1 style="font-size:24px;font-weight:700;color:#011c67;margin:0 0 14px;line-height:1.25;">${escapeHtml(t.heading)}</h1>
          <p style="font-size:15px;color:#0f172a;margin:0 0 8px;">${t.userName ? `${greeting(t.userName)}` : 'Hola,'}</p>
          <p style="font-size:14px;color:#475569;line-height:1.65;margin:0 0 20px;">${t.body}</p>

          ${t.featuresHtml}

          <a href="${escapeHtml(t.ctaUrl)}"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9999px;margin-top:8px;">
            ${escapeHtml(t.ctaLabel)}
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8faff;padding:18px 32px;border-top:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#94a3b8;">
                © 2026 Isaak ·
                <a href="${ISAAK_PUBLIC_URL}/integrations" style="color:#2361d8;text-decoration:none;">Gestionar integraciones</a> ·
                <a href="https://isaak.app/privacy" style="color:#2361d8;text-decoration:none;">Privacidad</a>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function featuresBlock(items: string[], color: string): string {
  if (!items.length) return '';
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">
          <span style="color:${escapeHtml(color)};font-weight:700;margin-right:8px;">✓</span>${escapeHtml(item)}
         </td></tr>`
    )
    .join('');
  return `
    <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 8px;">Lo que puedes hacer ahora:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${rows}</table>`;
}

// ─── Google Calendar + Gmail ──────────────────────────────────────────────────

export type GoogleConnectedInput = {
  userEmail: string | null;
  userName: string | null;
  connectedGoogleEmail: string | null;
};

function buildGoogleEmail(input: GoogleConnectedInput) {
  const integrationsUrl = `${ISAAK_PUBLIC_URL}/integrations`;
  const subject = 'Google conectado — Isaak ya accede a tu calendario y correo';
  const html = buildHtml({
    userName: input.userName,
    badgeEmoji: '📅',
    badgeLabel: 'Google conectado',
    badgeColor: '#15803d',
    badgeBg: '#dcfce7',
    heading: 'Google Calendar y Gmail conectados con Isaak',
    body: `Tu cuenta de Google${input.connectedGoogleEmail ? ` (<strong>${escapeHtml(input.connectedGoogleEmail)}</strong>)` : ''} está lista. Isaak puede ahora leer tu agenda y tus facturas en el correo para ayudarte a gestionar plazos y pagos.`,
    featuresHtml: featuresBlock(
      [
        'Ver tus eventos y vencimientos fiscales en el calendario',
        'Detectar facturas recibidas por Gmail automáticamente',
        'Recordatorios inteligentes antes de fechas límite de la AEAT',
        'Preguntar: "¿Qué tengo esta semana?" o "¿Hay facturas pendientes en mi correo?"',
      ],
      '#15803d'
    ),
    ctaLabel: 'Ir a Isaak →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/chat`,
  });
  const text = `${greeting(input.userName)}\n\nGoogle Calendar y Gmail están conectados con Isaak${input.connectedGoogleEmail ? ` (${input.connectedGoogleEmail})` : ''}.\n\nAhora puedes preguntarle a Isaak por tus eventos, vencimientos fiscales y facturas en el correo.\n\nAbre Isaak: ${ISAAK_PUBLIC_URL}/chat\n\nGestionar integraciones: ${integrationsUrl}`;
  return { subject, html, text };
}

export async function sendGoogleConnectedNotification(input: GoogleConnectedInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey || !input.userEmail) return;

  const resend = new Resend(apiKey);
  const from = sender();
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  const email = buildGoogleEmail(input);

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo,
    }),
    ...adminEmails().map((to) =>
      resend.emails.send({
        from,
        to: [to],
        subject: `Isaak: Google conectado por ${input.userEmail ?? 'usuario'}`,
        html: `<p>Usuario <strong>${escapeHtml(input.userEmail ?? '')}</strong> conectó Google (${escapeHtml(input.connectedGoogleEmail ?? 'sin email Google')}) en Isaak.</p>`,
        text: `Google conectado por ${input.userEmail ?? ''} (${input.connectedGoogleEmail ?? ''})`,
        replyTo,
      })
    ),
  ]);
}

// ─── Microsoft 365 ────────────────────────────────────────────────────────────

export type MicrosoftConnectedInput = {
  userEmail: string | null;
  userName: string | null;
  microsoftEmail: string | null;
  microsoftDisplayName: string | null;
};

function buildMicrosoftEmail(input: MicrosoftConnectedInput) {
  const integrationsUrl = `${ISAAK_PUBLIC_URL}/integrations`;
  const msAccount = input.microsoftEmail || input.microsoftDisplayName;
  const subject = 'Microsoft 365 conectado — Isaak ya accede a Outlook y OneDrive';
  const html = buildHtml({
    userName: input.userName,
    badgeEmoji: '🔷',
    badgeLabel: 'Microsoft 365 conectado',
    badgeColor: '#1d4ed8',
    badgeBg: '#dbeafe',
    heading: 'Microsoft 365 conectado con Isaak',
    body: `Tu cuenta Microsoft${msAccount ? ` (<strong>${escapeHtml(msAccount)}</strong>)` : ''} está sincronizada. Isaak puede acceder a tu correo de Outlook, calendario y archivos de OneDrive para ayudarte con gestión fiscal y contabilidad.`,
    featuresHtml: featuresBlock(
      [
        'Leer emails de Outlook para detectar facturas y comunicaciones fiscales',
        'Ver eventos del calendario de Microsoft para plazos y reuniones',
        'Acceder a documentos en OneDrive (facturas, contratos, justificantes)',
        'Preguntar: "¿Tengo facturas pendientes en Outlook?" o "¿Qué reuniones hay esta semana?"',
      ],
      '#1d4ed8'
    ),
    ctaLabel: 'Ir a Isaak →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/chat`,
  });
  const text = `${greeting(input.userName)}\n\nMicrosoft 365 está conectado con Isaak${msAccount ? ` (${msAccount})` : ''}.\n\nIsaak ya puede acceder a Outlook, calendario y OneDrive.\n\nAbre Isaak: ${ISAAK_PUBLIC_URL}/chat\n\nGestionar integraciones: ${integrationsUrl}`;
  return { subject, html, text };
}

export async function sendMicrosoftConnectedNotification(input: MicrosoftConnectedInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey || !input.userEmail) return;

  const resend = new Resend(apiKey);
  const from = sender();
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  const email = buildMicrosoftEmail(input);

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo,
    }),
    ...adminEmails().map((to) =>
      resend.emails.send({
        from,
        to: [to],
        subject: `Isaak: Microsoft 365 conectado por ${input.userEmail ?? 'usuario'}`,
        html: `<p>Usuario <strong>${escapeHtml(input.userEmail ?? '')}</strong> conectó Microsoft 365 (${escapeHtml(input.microsoftEmail ?? input.microsoftDisplayName ?? 'sin info')}) en Isaak.</p>`,
        text: `Microsoft 365 conectado por ${input.userEmail ?? ''} (${input.microsoftEmail ?? input.microsoftDisplayName ?? ''})`,
        replyTo,
      })
    ),
  ]);
}

// ─── Salt Edge (Banking) ──────────────────────────────────────────────────────

export type BankingConnectedInput = {
  userEmail: string | null;
  userName: string | null;
  bankName: string | null;
  accountCount?: number;
};

function buildBankingEmail(input: BankingConnectedInput) {
  const integrationsUrl = `${ISAAK_PUBLIC_URL}/integrations`;
  const bank = input.bankName || 'tu banco';
  const accounts = input.accountCount ?? 0;
  const subject = `Cuenta bancaria conectada — Isaak ya ve los movimientos de ${bank}`;
  const html = buildHtml({
    userName: input.userName,
    badgeEmoji: '🏦',
    badgeLabel: 'Banca conectada',
    badgeColor: '#0f766e',
    badgeBg: '#ccfbf1',
    heading: `${escapeHtml(bank)} conectado con Isaak`,
    body: `Tu conexión bancaria con <strong>${escapeHtml(bank)}</strong> está activa${accounts > 0 ? ` — <strong>${accounts} cuenta${accounts > 1 ? 's' : ''} sincronizada${accounts > 1 ? 's' : ''}</strong>` : ''}. Isaak puede ahora analizar tus movimientos, conciliar pagos y alertarte de cobros o pagos relevantes.`,
    featuresHtml: featuresBlock(
      [
        `Ver saldos y movimientos de ${bank} en tiempo real`,
        'Conciliación automática: cruzar cobros de clientes con facturas emitidas',
        'Detectar pagos duplicados o facturas sin cobrar',
        'Preguntar: "¿Qué cobros tengo pendientes?" o "¿Cuánto he pagado este mes?"',
      ],
      '#0f766e'
    ),
    ctaLabel: 'Ver mi tesorería →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/banking`,
  });
  const text = `${greeting(input.userName)}\n\n${bank} está conectado con Isaak${accounts > 0 ? ` (${accounts} cuenta${accounts > 1 ? 's' : ''})` : ''}.\n\nAhora puedes consultar movimientos, conciliar cobros y analizar tu tesorería con Isaak.\n\nAbre Isaak: ${ISAAK_PUBLIC_URL}/banking\n\nGestionar integraciones: ${integrationsUrl}`;
  return { subject, html, text };
}

export async function sendBankingConnectedNotification(input: BankingConnectedInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey || !input.userEmail) return;

  const resend = new Resend(apiKey);
  const from = sender();
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  const email = buildBankingEmail(input);

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo,
    }),
    ...adminEmails().map((to) =>
      resend.emails.send({
        from,
        to: [to],
        subject: `Isaak: Banco conectado (${input.bankName ?? '?'}) por ${input.userEmail ?? 'usuario'}`,
        html: `<p>Usuario <strong>${escapeHtml(input.userEmail ?? '')}</strong> conectó <strong>${escapeHtml(input.bankName ?? 'banco desconocido')}</strong> en Isaak (${input.accountCount ?? 0} cuentas).</p>`,
        text: `Banco conectado: ${input.bankName ?? ''} por ${input.userEmail ?? ''} (${input.accountCount ?? 0} cuentas)`,
        replyTo,
      })
    ),
  ]);
}

// ─── Chift / ERP ─────────────────────────────────────────────────────────────

export type ChiftConnectedInput = {
  userEmail: string | null;
  userName: string | null;
  erpCompanyName: string | null;
  erpVat?: string | null;
};

function buildChiftEmail(input: ChiftConnectedInput) {
  const integrationsUrl = `${ISAAK_PUBLIC_URL}/integrations`;
  const company = input.erpCompanyName || 'tu ERP';
  const subject = `ERP conectado — Isaak ya accede a la contabilidad de ${company}`;
  const html = buildHtml({
    userName: input.userName,
    badgeEmoji: '⚙️',
    badgeLabel: 'ERP conectado',
    badgeColor: '#7c3aed',
    badgeBg: '#ede9fe',
    heading: `ERP conectado: ${escapeHtml(company)}`,
    body: `Tu software de contabilidad <strong>${escapeHtml(company)}</strong>${input.erpVat ? ` (${escapeHtml(input.erpVat)})` : ''} está conectado vía Chift. Isaak ahora puede consultar tu plan contable, asientos, facturas y reportes directamente desde tu ERP.`,
    featuresHtml: featuresBlock(
      [
        'Consultar el plan de cuentas y saldos contables',
        'Analizar facturas emitidas y recibidas desde el ERP',
        'Ver asientos y diario contable',
        'Cruzar datos fiscales con la contabilidad para cerrar trimestres',
        'Preguntar: "¿Cuál es mi resultado contable del trimestre?" o "¿Hay facturas sin contabilizar?"',
      ],
      '#7c3aed'
    ),
    ctaLabel: 'Ir a Isaak →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/chat`,
  });
  const text = `${greeting(input.userName)}\n\nERP conectado: ${company}${input.erpVat ? ` (${input.erpVat})` : ''} vía Chift.\n\nIsaak ya puede consultar tu contabilidad, facturas y asientos.\n\nAbre Isaak: ${ISAAK_PUBLIC_URL}/chat\n\nGestionar integraciones: ${integrationsUrl}`;
  return { subject, html, text };
}

export async function sendChiftConnectedNotification(input: ChiftConnectedInput) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey || !input.userEmail) return;

  const resend = new Resend(apiKey);
  const from = sender();
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  const email = buildChiftEmail(input);

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: [input.userEmail],
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo,
    }),
    ...adminEmails().map((to) =>
      resend.emails.send({
        from,
        to: [to],
        subject: `Isaak: ERP conectado (${input.erpCompanyName ?? '?'}) por ${input.userEmail ?? 'usuario'}`,
        html: `<p>Usuario <strong>${escapeHtml(input.userEmail ?? '')}</strong> conectó ERP <strong>${escapeHtml(input.erpCompanyName ?? 'desconocido')}</strong>${input.erpVat ? ` (${escapeHtml(input.erpVat)})` : ''} en Isaak vía Chift.</p>`,
        text: `ERP conectado: ${input.erpCompanyName ?? ''} por ${input.userEmail ?? ''}`,
        replyTo,
      })
    ),
  ]);
}
