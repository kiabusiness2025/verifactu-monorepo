/**
 * POST /api/admin/tenants/[id]/profile-email
 *
 * Envía un email a los usuarios del tenant invitándoles a completar el perfil.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Verifactu Business <soporte@verifactu.business>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.verifactu.business';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tenantId } = await params;
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const customMessage = typeof body.message === 'string' ? body.message.trim() : '';

    // Fetch tenant name + admin users (role = 'admin' or 'owner')
    type TenantRow = { legal_name: string | null; name: string };
    type UserRow = { email: string; name: string | null };

    const [tenants, users] = await Promise.all([
      query<TenantRow>(
        `SELECT COALESCE(legal_name, name) AS legal_name, name FROM tenants WHERE id = $1`,
        [tenantId]
      ),
      query<UserRow>(
        `SELECT u.email, u.name
         FROM users u
         JOIN memberships m ON m.user_id = u.id
         WHERE m.tenant_id = $1
           AND u."isBlocked" = false
           AND u.email IS NOT NULL
         LIMIT 10`,
        [tenantId]
      ),
    ]);

    if (!tenants[0]) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }
    if (users.length === 0) {
      return NextResponse.json({ error: 'No hay usuarios en este tenant' }, { status: 422 });
    }

    const tenantName = tenants[0].legal_name ?? tenants[0].name;

    const results = await Promise.allSettled(
      users.map(async (u) => {
        const firstName = u.name?.split(' ')[0] ?? 'usuario';
        const html = buildEmail(firstName, tenantName, customMessage, APP_URL);
        await resend.emails.send({
          from: FROM,
          to: u.email,
          subject: `Completa el perfil de ${tenantName} en Verifactu Business`,
          html,
        });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return NextResponse.json({ ok: true, sent, failed, total: users.length });
  } catch (error) {
    console.error('[admin][tenants/profile-email] failed', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al enviar email' }, { status: 500 });
  }
}

function buildEmail(firstName: string, tenantName: string, customMessage: string, appUrl: string) {
  const extra = customMessage
    ? `<p style="color:#334155;font-size:14px;line-height:1.6;">${customMessage.replace(/\n/g, '<br>')}</p>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#2361d8;padding:24px 32px;">
            <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Verifactu Business</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Hola, ${firstName}</h1>
            <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Tu empresa <strong>${tenantName}</strong> tiene el perfil incompleto en Verifactu Business.
              Completar estos datos nos permite ofrecerte una experiencia personalizada y mantenerte al día
              con tus obligaciones fiscales.
            </p>
            ${extra}
            <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Accede a tu panel y completa la información en unos minutos:
            </p>
            <a href="${appUrl}" style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;">
              Completar perfil →
            </a>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
              Si tienes dudas, responde a este email y te ayudamos.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Verifactu Business · <a href="https://verifactu.business" style="color:#94a3b8;">verifactu.business</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
