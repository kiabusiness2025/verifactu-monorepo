// Endpoint para recibir solicitudes de "Prueba gratuita Holded" desde la
// landing — para visitantes que aún no tienen Holded contratado.
//
// El payload se envía por email a soporte@verifactu.business vía Resend.
// Nosotros tiramos del partner de Holded para gestionar el alta.
//
// Sin DB: el caso de uso es bajo volumen (1-10/día estimado). Si crece,
// se persiste en una tabla simple `holded_trial_lead`.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

const COMPANY_SIZE_OPTIONS = ['solo', '1-5', '6-20', '21-50', '50+'] as const;
type CompanySize = (typeof COMPANY_SIZE_OPTIONS)[number];

const SIZE_LABELS: Record<CompanySize, string> = {
  solo: 'Autónomo / unipersonal',
  '1-5': '1-5 empleados',
  '6-20': '6-20 empleados',
  '21-50': '21-50 empleados',
  '50+': 'Más de 50 empleados',
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.' },
      { status: 429 },
    );
  }

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    companySize?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la petición inválido.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const phone = (body.phone ?? '').trim();
  const companyName = (body.companyName ?? '').trim();
  const companySize = (body.companySize ?? '').trim() as CompanySize;
  const notes = (body.notes ?? '').trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Indica tu nombre.' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
  }
  if (companySize && !COMPANY_SIZE_OPTIONS.includes(companySize)) {
    return NextResponse.json({ error: 'Tamaño de empresa inválido.' }, { status: 400 });
  }
  if (notes.length > 1000) {
    return NextResponse.json(
      { error: 'El mensaje es demasiado largo (máx. 1000 caracteres).' },
      { status: 400 },
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.error('[holded-trial] RESEND_API_KEY not set');
    return NextResponse.json(
      { error: 'Servicio de correo no disponible. Inténtalo más tarde.' },
      { status: 503 },
    );
  }

  const fromEmail =
    (process.env.RESEND_FROM_ISAAK || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM)?.trim() ||
    'Isaak <noreply@verifactu.business>';

  const toEmail = (process.env.HOLDED_TRIAL_TO || 'soporte@verifactu.business').trim();

  const sizeLabel = companySize ? SIZE_LABELS[companySize] : '—';

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="background:white;border-radius:16px;border:1px solid #e2e8f0;padding:32px">
          <h1 style="margin:0 0 8px;font-size:18px;color:#011c67">Nueva solicitud de prueba Holded</h1>
          <p style="margin:0 0 20px;color:#64748b;font-size:13px">Llegada desde el formulario de pricing de isaak.chat</p>
          <table cellpadding="6" cellspacing="0" style="font-size:14px;color:#0f172a;width:100%">
            <tr><td style="color:#64748b;width:140px">Nombre</td><td><strong>${escapeHtml(name)}</strong></td></tr>
            <tr><td style="color:#64748b">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#2361d8">${escapeHtml(email)}</a></td></tr>
            ${phone ? `<tr><td style="color:#64748b">Teléfono</td><td>${escapeHtml(phone)}</td></tr>` : ''}
            ${companyName ? `<tr><td style="color:#64748b">Empresa</td><td>${escapeHtml(companyName)}</td></tr>` : ''}
            <tr><td style="color:#64748b">Tamaño</td><td>${escapeHtml(sizeLabel)}</td></tr>
            ${notes ? `<tr><td style="color:#64748b;vertical-align:top">Mensaje</td><td style="white-space:pre-wrap">${escapeHtml(notes)}</td></tr>` : ''}
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:16px">
            IP: ${escapeHtml(ip)} · ${new Date().toISOString().slice(0, 19).replace('T', ' ')}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Nueva solicitud de prueba Holded — isaak.chat`,
    '',
    `Nombre: ${name}`,
    `Email: ${email}`,
    phone ? `Teléfono: ${phone}` : null,
    companyName ? `Empresa: ${companyName}` : null,
    `Tamaño: ${sizeLabel}`,
    notes ? `\nMensaje:\n${notes}` : null,
    '',
    `IP: ${ip} · ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[Isaak] Solicitud prueba Holded — ${name}${companyName ? ` (${companyName})` : ''}`,
        html,
        text,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('[holded-trial] Resend error', { status: sendRes.status, body: errText });
      return NextResponse.json(
        { error: 'No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[holded-trial] Unexpected error', err);
    return NextResponse.json({ error: 'Error interno. Inténtalo de nuevo.' }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
