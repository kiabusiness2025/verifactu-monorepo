import { Resend } from 'resend';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';
import type { FiscalDeadline } from '@/app/lib/fiscal-calendar';

export type WeeklyDigestInput = {
  userEmail: string;
  userName: string | null;
  tenantName: string | null;
  conversationsThisWeek: number;
  alertsThisWeek: number;
  upcomingDeadlines: Pick<FiscalDeadline, 'title' | 'date' | 'modelo'>[];
  pnl?: { sales: number; expenses: number | null; margin: number | null } | null;
  bankBalance?: number | null;
};

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function greeting(name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? `Hola ${trimmed},` : 'Hola,';
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(date);
}

function daysUntil(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function urgencyBadge(days: number): { color: string; label: string } {
  if (days <= 3) return { color: '#dc2626', label: `${days}d` };
  if (days <= 7) return { color: '#d97706', label: `${days}d` };
  return { color: '#2361d8', label: `${days}d` };
}

function deadlineRowHtml(d: Pick<FiscalDeadline, 'title' | 'date' | 'modelo'>) {
  const days = daysUntil(d.date);
  const badge = urgencyBadge(days);
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:11px;background:#e2e8f0;color:#475569;padding:2px 7px;border-radius:99px;font-weight:600;margin-right:8px;">
          Mod. ${d.modelo}
        </span>
        <span style="font-size:14px;color:#0f172a;">${d.title}</span>
        <br>
        <span style="font-size:12px;color:#94a3b8;margin-left:0;">${formatShortDate(d.date)}</span>
      </td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">
        <span style="background:${badge.color}1a;color:${badge.color};font-size:12px;font-weight:700;padding:3px 9px;border-radius:99px;">
          ${badge.label}
        </span>
      </td>
    </tr>`;
}

function formatEur(value: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildFinancialHtml(input: WeeklyDigestInput): string {
  const hasPnl = input.pnl != null;
  const hasBankBalance = input.bankBalance != null;
  if (!hasPnl && !hasBankBalance) return '';

  const cells: string[] = [];

  if (hasBankBalance) {
    cells.push(`
      <td style="padding-right:8px;width:33%;">
        <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;">
          <div style="font-size:11px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Saldo bancario</div>
          <div style="font-size:20px;font-weight:700;color:#166534;">${formatEur(input.bankBalance!)}</div>
        </div>
      </td>`);
  }

  if (hasPnl && input.pnl!.sales > 0) {
    cells.push(`
      <td style="padding-right:8px;width:33%;">
        <div style="background:#f0f7ff;border-radius:12px;padding:14px 16px;">
          <div style="font-size:11px;font-weight:600;color:#2361d8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Ventas (mes)</div>
          <div style="font-size:20px;font-weight:700;color:#1e3a8a;">${formatEur(input.pnl!.sales)}</div>
        </div>
      </td>`);
  }

  if (hasPnl && input.pnl!.margin != null) {
    const marginColor = input.pnl!.margin >= 0 ? '#166534' : '#9f1239';
    const marginBg = input.pnl!.margin >= 0 ? '#f0fdf4' : '#fff1f2';
    cells.push(`
      <td style="width:33%;">
        <div style="background:${marginBg};border-radius:12px;padding:14px 16px;">
          <div style="font-size:11px;font-weight:600;color:${marginColor};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Margen (mes)</div>
          <div style="font-size:20px;font-weight:700;color:${marginColor};">${formatEur(input.pnl!.margin)}</div>
        </div>
      </td>`);
  }

  if (cells.length === 0) return '';

  return `
    <tr><td style="padding:24px 32px 0;">
      <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Estado financiero</h2>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>${cells.join('')}</tr></table>
    </td></tr>`;
}

function buildDigestHtml(input: WeeklyDigestInput): string {
  const deadlinesHtml =
    input.upcomingDeadlines.length > 0
      ? `
    <tr><td style="padding:28px 32px 0;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">Próximos vencimientos</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${input.upcomingDeadlines.map(deadlineRowHtml).join('')}
      </table>
    </td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Resumen semanal</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#081936,#0b2060);padding:28px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">Isaak</span>
          <span style="color:#8ba0cc;font-size:13px;margin-left:8px;">Resumen semanal</span>
        </td></tr>

        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0 0 20px;font-size:15px;color:#0f172a;">${greeting(input.userName)}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Aquí tienes el resumen de tu actividad en Isaak esta semana
            ${input.tenantName ? `para <strong>${input.tenantName}</strong>` : ''}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-right:8px;">
                <div style="background:#f0f7ff;border-radius:12px;padding:16px 20px;">
                  <div style="font-size:28px;font-weight:700;color:#2361d8;">${input.conversationsThisWeek}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:2px;">conversaciones</div>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;">
                <div style="background:#fefce8;border-radius:12px;padding:16px 20px;">
                  <div style="font-size:28px;font-weight:700;color:#d97706;">${input.alertsThisWeek}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:2px;">alertas fiscales</div>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        ${buildFinancialHtml(input)}

        ${deadlinesHtml}

        <tr><td style="padding:28px 32px;">
          <a href="${ISAAK_PUBLIC_URL}"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:9999px;">
            Abrir Isaak
          </a>
        </td></tr>

        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            © 2026 Verifactu Business ·
            <a href="${ISAAK_PUBLIC_URL}/settings?section=notificaciones" style="color:#94a3b8;">Gestionar notificaciones</a> ·
            <a href="${ISAAK_PUBLIC_URL}" style="color:#94a3b8;">${new URL(ISAAK_PUBLIC_URL).hostname}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDigestText(input: WeeklyDigestInput): string {
  const lines = [
    `${greeting(input.userName)}`,
    '',
    `Resumen semanal de Isaak${input.tenantName ? ` — ${input.tenantName}` : ''}:`,
    `• ${input.conversationsThisWeek} conversaciones esta semana`,
    `• ${input.alertsThisWeek} alertas fiscales`,
  ];

  if (input.bankBalance != null || input.pnl != null) {
    lines.push('', 'Estado financiero:');
    if (input.bankBalance != null) lines.push(`• Saldo bancario: ${formatEur(input.bankBalance)}`);
    if (input.pnl?.sales) lines.push(`• Ventas (mes): ${formatEur(input.pnl.sales)}`);
    if (input.pnl?.margin != null) lines.push(`• Margen (mes): ${formatEur(input.pnl.margin)}`);
  }

  if (input.upcomingDeadlines.length > 0) {
    lines.push('', 'Próximos vencimientos:');
    for (const d of input.upcomingDeadlines) {
      lines.push(
        `• Mod. ${d.modelo} — ${d.title} (${formatShortDate(d.date)}, ${daysUntil(d.date)}d)`
      );
    }
  }

  lines.push('', `Abre Isaak: ${ISAAK_PUBLIC_URL}`);
  return lines.join('\n');
}

export async function sendWeeklyDigest(input: WeeklyDigestInput) {
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
    subject: 'Tu resumen semanal de Isaak',
    html: buildDigestHtml(input),
    text: buildDigestText(input),
    replyTo: 'soporte@verifactu.business',
  });
}
