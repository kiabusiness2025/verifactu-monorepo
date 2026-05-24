/**
 * Test/preview endpoint for Isaak integration emails.
 *
 * GET  /api/test/integration-emails?type=google   → returns HTML preview (no send)
 * POST /api/test/integration-emails               → sends test emails via Resend
 *
 * Body: { emailType: "google"|"microsoft"|"banking"|"chift"|"all", testEmail: "..." }
 *
 * Blocked in production unless ISAAK_EMAIL_TEST_ENABLED=true is set.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  sendGoogleConnectedNotification,
  sendMicrosoftConnectedNotification,
  sendBankingConnectedNotification,
  sendChiftConnectedNotification,
} from '@/app/lib/communications/integration-emails';
import { ISAAK_PUBLIC_URL } from '@/app/lib/isaak-navigation';

export const runtime = 'nodejs';

const ALLOWED =
  process.env.NODE_ENV !== 'production' || process.env.ISAAK_EMAIL_TEST_ENABLED === 'true';

// ─── Sample payloads ─────────────────────────────────────────────────────────

function samples(email: string) {
  return {
    google: {
      userEmail: email,
      userName: 'María García',
      connectedGoogleEmail: 'maria.garcia@empresa.com',
    },
    microsoft: {
      userEmail: email,
      userName: 'Carlos Ruiz',
      microsoftEmail: 'c.ruiz@empresa.es',
      microsoftDisplayName: 'Carlos Ruiz',
    },
    banking: {
      userEmail: email,
      userName: 'Ana Martínez',
      bankName: 'Banco Santander',
      accountCount: 3,
    },
    chift: {
      userEmail: email,
      userName: 'Pedro López',
      erpCompanyName: 'Talleres López S.L.',
      erpVat: 'B12345678',
    },
  };
}

// ─── GET — HTML preview ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!ALLOWED) return NextResponse.json({ error: 'Not available in production' }, { status: 403 });

  const type = req.nextUrl.searchParams.get('type') ?? 'google';
  const dummy = 'preview@example.com';
  const s = samples(dummy);

  // Build the HTML by calling the private builder via a one-off Resend mock
  // We re-implement the same HTML builder logic inline for GET preview.
  const previewMap: Record<string, string> = {
    google: buildPreview('google', s.google),
    microsoft: buildPreview('microsoft', s.microsoft),
    banking: buildPreview('banking', s.banking),
    chift: buildPreview('chift', s.chift),
  };

  const html = previewMap[type] ?? previewMap['google'];
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ─── POST — send via Resend ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!ALLOWED) return NextResponse.json({ error: 'Not available in production' }, { status: 403 });

  let body: { emailType?: string; testEmail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { testEmail, emailType } = body;
  if (!testEmail) return NextResponse.json({ error: 'testEmail is required' }, { status: 400 });

  const s = samples(testEmail);
  const types =
    emailType && emailType !== 'all' ? [emailType] : ['google', 'microsoft', 'banking', 'chift'];

  const results: Record<string, { ok: boolean; error?: string }> = {};

  for (const t of types) {
    try {
      switch (t) {
        case 'google':
          await sendGoogleConnectedNotification(s.google);
          break;
        case 'microsoft':
          await sendMicrosoftConnectedNotification(s.microsoft);
          break;
        case 'banking':
          await sendBankingConnectedNotification(s.banking);
          break;
        case 'chift':
          await sendChiftConnectedNotification(s.chift);
          break;
        default:
          throw new Error(`Unknown type: ${t}`);
      }
      results[t] = { ok: true };
    } catch (err) {
      results[t] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const total = types.length;
  const ok = Object.values(results).filter((r) => r.ok).length;

  return NextResponse.json({
    sent: ok,
    total,
    results,
    previewUrls: types.map((t) => `${ISAAK_PUBLIC_URL}/api/test/integration-emails?type=${t}`),
  });
}

// ─── Inline preview renderer (mirrors integration-emails.ts logic) ────────────

function esc(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function featureRows(items: string[], color: string) {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;"><span style="color:${esc(color)};font-weight:700;margin-right:8px;">✓</span>${esc(i)}</td></tr>`
    )
    .join('');
}

function tpl(p: {
  name: string | null;
  emoji: string;
  label: string;
  color: string;
  bg: string;
  heading: string;
  body: string;
  features: string[];
  cta: string;
  ctaUrl: string;
}) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(p.heading)}</title></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,23,42,.08);border:1px solid #c7d7f7;">
<tr><td style="background:linear-gradient(135deg,#081936,#0b2060);padding:24px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><span style="color:#fff;font-size:20px;font-weight:700;">Isaak</span><span style="color:#8ba0cc;font-size:12px;margin-left:8px;">Asistente fiscal inteligente</span></td>
    <td align="right"><span style="background:rgba(255,255,255,.12);color:#c7d7f7;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;">Nueva integración</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;">
  <div style="display:inline-block;background:${esc(p.bg)};border-radius:99px;padding:6px 14px;margin-bottom:20px;">
    <span style="font-size:15px;margin-right:6px;">${p.emoji}</span>
    <span style="font-size:12px;font-weight:700;color:${esc(p.color)};">${esc(p.label)}</span>
  </div>
  <h1 style="font-size:24px;font-weight:700;color:#011c67;margin:0 0 14px;">${esc(p.heading)}</h1>
  <p style="font-size:15px;color:#0f172a;margin:0 0 8px;">${p.name ? `Hola ${esc(p.name)},` : 'Hola,'}</p>
  <p style="font-size:14px;color:#475569;line-height:1.65;margin:0 0 20px;">${p.body}</p>
  <p style="font-size:13px;font-weight:600;color:#0f172a;margin:0 0 8px;">Lo que puedes hacer ahora:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${featureRows(p.features, p.color)}</table>
  <a href="${esc(p.ctaUrl)}" style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9999px;">${esc(p.cta)}</a>
</td></tr>
<tr><td style="background:#f8faff;padding:18px 32px;border-top:1px solid #e2e8f0;">
  <span style="font-size:12px;color:#94a3b8;">© 2026 Verifactu Business · <a href="${ISAAK_PUBLIC_URL}/integrations" style="color:#2361d8;">Gestionar integraciones</a> · <a href="https://verifactu.business/privacy" style="color:#2361d8;">Privacidad</a></span>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildPreview(
  type: string,
  s: ReturnType<typeof samples>[keyof ReturnType<typeof samples>]
) {
  const base = ISAAK_PUBLIC_URL;
  switch (type) {
    case 'google': {
      const g = s as ReturnType<typeof samples>['google'];
      return tpl({
        name: g.userName,
        emoji: '📅',
        label: 'Google conectado',
        color: '#15803d',
        bg: '#dcfce7',
        heading: 'Google Calendar y Gmail conectados con Isaak',
        body: `Tu cuenta de Google (<strong>${esc(g.connectedGoogleEmail ?? '')}</strong>) está lista. Isaak puede ahora leer tu agenda y tus facturas en el correo.`,
        features: [
          'Ver tus eventos y vencimientos fiscales en el calendario',
          'Detectar facturas recibidas por Gmail automáticamente',
          'Recordatorios inteligentes antes de fechas límite de la AEAT',
          'Preguntar: "¿Qué tengo esta semana?" o "¿Hay facturas pendientes en mi correo?"',
        ],
        cta: 'Ir a Isaak →',
        ctaUrl: `${base}/chat`,
      });
    }
    case 'microsoft': {
      const m = s as ReturnType<typeof samples>['microsoft'];
      return tpl({
        name: m.userName,
        emoji: '🔷',
        label: 'Microsoft 365 conectado',
        color: '#1d4ed8',
        bg: '#dbeafe',
        heading: 'Microsoft 365 conectado con Isaak',
        body: `Tu cuenta Microsoft (<strong>${esc(m.microsoftEmail ?? '')}</strong>) está sincronizada. Isaak puede acceder a Outlook, calendario y OneDrive.`,
        features: [
          'Leer emails de Outlook para detectar facturas y comunicaciones fiscales',
          'Ver eventos del calendario de Microsoft para plazos y reuniones',
          'Acceder a documentos en OneDrive (facturas, contratos, justificantes)',
          'Preguntar: "¿Tengo facturas pendientes en Outlook?"',
        ],
        cta: 'Ir a Isaak →',
        ctaUrl: `${base}/chat`,
      });
    }
    case 'banking': {
      const b = s as ReturnType<typeof samples>['banking'];
      return tpl({
        name: b.userName,
        emoji: '🏦',
        label: 'Banca conectada',
        color: '#0f766e',
        bg: '#ccfbf1',
        heading: `${esc(b.bankName ?? 'Banco')} conectado con Isaak`,
        body: `Tu conexión bancaria con <strong>${esc(b.bankName ?? '')}</strong> está activa — <strong>${b.accountCount} cuentas sincronizadas</strong>. Isaak puede analizar movimientos y conciliar pagos.`,
        features: [
          `Ver saldos y movimientos de ${b.bankName ?? 'tu banco'} en tiempo real`,
          'Conciliación automática: cruzar cobros de clientes con facturas emitidas',
          'Detectar pagos duplicados o facturas sin cobrar',
          'Preguntar: "¿Qué cobros tengo pendientes?"',
        ],
        cta: 'Ver mi tesorería →',
        ctaUrl: `${base}/banking`,
      });
    }
    case 'chift': {
      const c = s as ReturnType<typeof samples>['chift'];
      return tpl({
        name: c.userName,
        emoji: '⚙️',
        label: 'ERP conectado',
        color: '#7c3aed',
        bg: '#ede9fe',
        heading: `ERP conectado: ${esc(c.erpCompanyName ?? '')}`,
        body: `Tu software de contabilidad <strong>${esc(c.erpCompanyName ?? '')}</strong> (${esc(c.erpVat ?? '')}) está conectado vía Chift. Isaak puede consultar el plan contable, asientos y facturas.`,
        features: [
          'Consultar el plan de cuentas y saldos contables',
          'Analizar facturas emitidas y recibidas desde el ERP',
          'Ver asientos y diario contable',
          'Preguntar: "¿Cuál es mi resultado contable del trimestre?"',
        ],
        cta: 'Ir a Isaak →',
        ctaUrl: `${base}/chat`,
      });
    }
    default:
      return '<html><body>Unknown type</body></html>';
  }
}
