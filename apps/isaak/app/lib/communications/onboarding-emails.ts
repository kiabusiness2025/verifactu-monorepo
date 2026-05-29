/**
 * Onboarding nudge emails — sent by the daily cron at D+1, D+3, D+7.
 *
 * emailType values (stored in IsaakOnboardingEmail for dedup):
 *   connect_erp   — D+1: no ERP connected yet
 *   first_steps   — D+3: few or no chats, encourage first query
 *   upgrade_cta   — D+7: Free plan, has been active, pitch upgrade
 */
import { Resend } from 'resend';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

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

// ─── Shared brand wrapper ─────────────────────────────────────────────────────

function buildEmail(opts: {
  subject: string;
  userName: string | null;
  intro: string;
  stepsHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}): { subject: string; html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${escapeHtml(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,0.08);border:1px solid #c7d7f7;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#081936 0%,#0b2060 100%);padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Isaak</span>
          <span style="color:#8ba0cc;font-size:12px;margin-left:8px;">Asistente fiscal inteligente</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 32px 24px;">
          <p style="font-size:15px;color:#0f172a;margin:0 0 6px;">${greeting(opts.userName)}</p>
          <p style="font-size:14px;color:#475569;line-height:1.65;margin:0 0 24px;">${opts.intro}</p>

          ${opts.stepsHtml}

          <a href="${escapeHtml(opts.ctaUrl)}"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9999px;margin-top:4px;">
            ${escapeHtml(opts.ctaLabel)}
          </a>

          ${opts.footerNote ? `<p style="font-size:12px;color:#94a3b8;margin:20px 0 0;">${opts.footerNote}</p>` : ''}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <span style="font-size:12px;color:#94a3b8;">
            © 2026 Verifactu Business ·
            <a href="${ISAAK_PUBLIC_URL}/integrations" style="color:#2361d8;text-decoration:none;">Integraciones</a> ·
            <a href="${ISAAK_PUBLIC_URL}/settings" style="color:#2361d8;text-decoration:none;">Configuración</a>
          </span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greeting(opts.userName)}\n\n${opts.intro}\n\n${opts.ctaLabel}: ${opts.ctaUrl}`;
  return { subject: opts.subject, html, text };
}

function stepsBlock(steps: { emoji: string; title: string; desc: string }[]): string {
  const rows = steps
    .map(
      (s) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <span style="font-size:20px;margin-right:12px;">${s.emoji}</span>
        <span style="font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(s.title)}</span>
        <span style="font-size:13px;color:#64748b;margin-left:6px;">— ${escapeHtml(s.desc)}</span>
      </td>
    </tr>`
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${rows}</table>`;
}

// ─── connect_erp (D+1) ────────────────────────────────────────────────────────

export function buildConnectErpEmail(userName: string | null) {
  return buildEmail({
    subject: 'Conecta tu ERP y desbloquea todo Isaak',
    userName,
    intro:
      'Isaak puede responderte preguntas fiscales generales, pero con tu ERP conectado pasa a otro nivel: ve tus ventas reales, calcula el IVA del trimestre, detecta facturas impagadas y mucho más.',
    stepsHtml: stepsBlock([
      {
        emoji: '📊',
        title: 'Datos reales en tiempo real',
        desc: 'Ventas, gastos, cobros y KPIs de tu empresa',
      },
      {
        emoji: '📅',
        title: 'Modelos AEAT pre-rellenados',
        desc: '303, 130, 390 con tus datos de Holded',
      },
      {
        emoji: '🔔',
        title: 'Alertas fiscales automáticas',
        desc: 'Te avisamos 15, 7 y 3 días antes de cada vencimiento',
      },
    ]),
    ctaLabel: 'Conectar mi ERP →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/integrations`,
    footerNote: 'Solo tarda 2 minutos. Necesitas tu API key de Holded.',
  });
}

// ─── first_steps (D+3) ───────────────────────────────────────────────────────

export function buildFirstStepsEmail(userName: string | null) {
  return buildEmail({
    subject: '¿Sabes qué puedes preguntarle a Isaak?',
    userName,
    intro:
      'Isaak está listo para ayudarte. Aquí tienes algunas preguntas que nuestros usuarios hacen cada semana — cópiala y pégala en el chat:',
    stepsHtml: stepsBlock([
      {
        emoji: '💬',
        title: '"¿Cuánto IVA debo pagar este trimestre?"',
        desc: 'Calcula el modelo 303 estimado',
      },
      {
        emoji: '💬',
        title: '"¿Qué facturas tengo sin cobrar?"',
        desc: 'Lista de clientes con deuda pendiente',
      },
      {
        emoji: '💬',
        title: '"Resume mis gastos de este mes"',
        desc: 'Categoriza y totaliza por proveedor',
      },
      {
        emoji: '💬',
        title: '"¿Cuándo es el próximo vencimiento fiscal?"',
        desc: 'Calendario fiscal personalizado',
      },
    ]),
    ctaLabel: 'Abrir el chat →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/chat`,
  });
}

// ─── upgrade_cta (D+7) ───────────────────────────────────────────────────────

export function buildUpgradeCtaEmail(userName: string | null, queriesUsed: number) {
  const used =
    queriesUsed > 0
      ? `Ya has hecho ${queriesUsed} consulta${queriesUsed > 1 ? 's' : ''} con Isaak Free. `
      : '';
  return buildEmail({
    subject: 'Desbloquea todo Isaak por 29 €/mes',
    userName,
    intro: `${used}Con el plan Pro conectas tu ERP, tu banco y la AEAT — todo con contexto real de tu empresa. 14 días de prueba sin tarjeta.`,
    stepsHtml: stepsBlock([
      {
        emoji: '✅',
        title: 'ERP y banca conectados',
        desc: 'Isaak ve tus ventas, gastos y movimientos bancarios reales',
      },
      {
        emoji: '✅',
        title: 'Modelos AEAT incluidos',
        desc: '303, 130, 111, 347 y más — borradores automáticos',
      },
      {
        emoji: '✅',
        title: 'Alertas fiscales automáticas',
        desc: 'Email y push antes de cada vencimiento AEAT',
      },
    ]),
    ctaLabel: 'Ver planes →',
    ctaUrl: `${ISAAK_PUBLIC_URL}/pricing`,
    footerNote: 'Puedes cancelar cuando quieras. Sin permanencia.',
  });
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

export type OnboardingEmailInput = {
  userEmail: string;
  userName: string | null;
  queriesUsed?: number;
};

async function send(
  input: OnboardingEmailInput,
  email: { subject: string; html: string; text: string }
) {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  const replyTo = cleanEnv(process.env.RESEND_REPLY_TO) || 'soporte@verifactu.business';
  await resend.emails.send({
    from: sender(),
    to: [input.userEmail],
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo,
  });
}

export async function sendConnectErpNudge(input: OnboardingEmailInput) {
  await send(input, buildConnectErpEmail(input.userName));
}

export async function sendFirstStepsNudge(input: OnboardingEmailInput) {
  await send(input, buildFirstStepsEmail(input.userName));
}

export async function sendUpgradeCtaNudge(input: OnboardingEmailInput) {
  await send(input, buildUpgradeCtaEmail(input.userName, input.queriesUsed ?? 0));
}
