import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function buildBetaInviteHtml(params: {
  firstName: string;
  companyName: string;
  inviterName: string;
  notes: string;
}) {
  const { firstName, companyName, inviterName, notes } = params;
  const registerUrl = `${ISAAK_URL}/auth`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f8faff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

        <tr><td style="background:#010b2e;padding:28px 32px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:#2361d8;border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <span style="color:#ffffff;font-weight:900;font-size:18px;">I</span>
            </div>
            <div>
              <div style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;">Isaak</div>
              <div style="font-size:11px;color:#93c5fd;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Beta Program</div>
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:32px;">
          <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:9999px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:20px;">
            Acceso anticipado
          </span>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#011c67;letter-spacing:-0.02em;">
            Hola ${firstName}, tienes acceso al programa beta de Isaak
          </h1>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            ${inviterName} te ha invitado a probar Isaak en exclusiva para <strong>${companyName}</strong>.
            Eres uno de los primeros en acceder antes del lanzamiento oficial.
          </p>
          ${notes ? `<div style="background:#f0f4ff;border-left:3px solid #2361d8;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;"><p style="margin:0;font-size:13px;color:#475569;line-height:1.5;">${notes}</p></div>` : ''}
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Qué puedes hacer con Isaak:</p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
            <li>Preguntar sobre tus datos de empresa en español, sin buscar en menús</li>
            <li>Conectar Holded y ver ventas, gastos y facturas en tiempo real</li>
            <li>Cumplimiento VeriFactu incluido — sin software adicional</li>
            <li>Consultas ilimitadas en el plan gratuito, sin tarjeta</li>
          </ul>
          <a href="${registerUrl}" style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9999px;margin-bottom:16px;">
            Crear mi cuenta gratuita →
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Sin tarjeta de crédito · Listo en 2 minutos</p>
        </td></tr>

        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            © 2026 Verifactu Business ·
            <a href="${ISAAK_URL}" style="color:#94a3b8;">${new URL(ISAAK_URL).hostname}</a> ·
            Esta invitación fue enviada por ${inviterName} desde el panel de administración.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);

  const body = (await req.json()) as {
    email?: string;
    firstName?: string;
    companyName?: string;
    notes?: string;
  };

  const email = body.email?.trim();
  const firstName = body.firstName?.trim() || 'amigo';
  const companyName = body.companyName?.trim() || 'tu empresa';
  const notes = body.notes?.trim() || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  if (!resend) {
    return NextResponse.json({ error: 'Resend no configurado' }, { status: 503 });
  }

  const { error } = await resend.emails.send({
    from: 'Isaak de Verifactu Business <no-reply@verifactu.business>',
    to: [email],
    subject: `${firstName}, tienes acceso al programa beta de Isaak`,
    html: buildBetaInviteHtml({
      firstName,
      companyName,
      inviterName: admin.email,
      notes,
    }),
  });

  if (error) {
    console.error('[beta-invite] Resend error', error);
    return NextResponse.json({ error: 'Error al enviar el email' }, { status: 500 });
  }

  console.info('[beta-invite] sent', { to: email, companyName, by: admin.email });
  return NextResponse.json({ ok: true });
}
