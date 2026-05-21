/**
 * POST /api/cron/profile-reminders
 *
 * Envía recordatorios de perfil incompleto a tenants Holded que llevan
 * más de 3 días sin recibir uno.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  (Vercel cron / llamada externa)
 *       OR admin session cookie               (llamada manual desde el panel)
 *
 * Se llama automáticamente por Vercel Cron (ver vercel.json).
 * También puede ejecutarse manualmente desde /admin-marketing.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FROM = 'Verifactu Business <soporte@verifactu.business>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.verifactu.business';
const REMINDER_INTERVAL_DAYS = 3;

type TenantRow = {
  id: string;
  tenant_name: string;
  missing_fields: string[];
};

type UserRow = {
  email: string;
  name: string | null;
};

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  try {
    await requireAdmin(req);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Ensure reminder log table exists
  await query(
    `CREATE TABLE IF NOT EXISTS profile_reminder_logs (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id  UUID        NOT NULL,
      sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      users_notified INT     NOT NULL DEFAULT 0
    )`,
    []
  );

  // Tenants with Holded connection + incomplete profile + not reminded recently
  const incompleteRaw = await query<{
    id: string;
    tenant_name: string;
    has_email: boolean;
    has_phone: boolean;
    has_cnae: boolean;
    has_representative: boolean;
  }>(
    `SELECT
       t.id,
       COALESCE(t.legal_name, t.name) AS tenant_name,
       (tp.email IS NOT NULL)           AS has_email,
       (tp.phone IS NOT NULL)           AS has_phone,
       (tp.cnae  IS NOT NULL)           AS has_cnae,
       (tp.representative IS NOT NULL)  AS has_representative
     FROM tenants t
     LEFT JOIN tenant_profiles tp ON tp.tenant_id = t.id
     WHERE EXISTS (
       SELECT 1 FROM external_connections ec
       WHERE ec.tenant_id = t.id AND ec.provider = 'holded'
     )
     AND (
       tp.tenant_id IS NULL
       OR tp.email IS NULL
       OR tp.phone IS NULL
       OR tp.cnae IS NULL
       OR tp.representative IS NULL
     )
     AND t.id NOT IN (
       SELECT DISTINCT tenant_id FROM profile_reminder_logs
       WHERE sent_at > NOW() - ($1 * INTERVAL '1 day')
     )
     ORDER BY t.id`,
    [REMINDER_INTERVAL_DAYS]
  );

  const tenants: TenantRow[] = incompleteRaw.map((r) => ({
    id: r.id,
    tenant_name: r.tenant_name,
    missing_fields: [
      ...(!r.has_email ? ['email'] : []),
      ...(!r.has_phone ? ['teléfono'] : []),
      ...(!r.has_cnae ? ['CNAE'] : []),
      ...(!r.has_representative ? ['representante'] : []),
    ],
  }));

  if (tenants.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, tenants_notified: 0 });
  }

  let totalSent = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    // Get users of this tenant
    const users = await query<UserRow>(
      `SELECT u.email, u.name
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       WHERE m.tenant_id = $1
         AND u."isBlocked" = false
         AND u.email IS NOT NULL
       LIMIT 5`,
      [tenant.id]
    );

    if (users.length === 0) {
      totalSkipped++;
      continue;
    }

    const results = await Promise.allSettled(
      users.map(async (u) => {
        const firstName = u.name?.split(' ')[0] ?? 'usuario';
        const html = buildReminderEmail(
          firstName,
          tenant.tenant_name,
          tenant.missing_fields,
          APP_URL
        );
        await resend.emails.send({
          from: FROM,
          to: u.email,
          subject: `Completa el perfil de ${tenant.tenant_name} para mejorar tu experiencia`,
          html,
        });
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    if (sent > 0) {
      await query(`INSERT INTO profile_reminder_logs (tenant_id, users_notified) VALUES ($1, $2)`, [
        tenant.id,
        sent,
      ]);
      totalSent++;
    } else {
      totalSkipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    tenants_notified: totalSent,
    skipped: totalSkipped,
    total_incomplete: tenants.length,
  });
}

function buildReminderEmail(
  firstName: string,
  tenantName: string,
  missingFields: string[],
  appUrl: string
) {
  const fieldList =
    missingFields.length > 0
      ? `<ul style="margin:8px 0 16px;padding-left:20px;color:#334155;font-size:13px;">
        ${missingFields.map((f) => `<li>${f}</li>`).join('')}
       </ul>`
      : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:#2361d8;padding:20px 32px;">
            <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Verifactu Business</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Hola, ${firstName}</h1>
            <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 12px;">
              El perfil de <strong>${tenantName}</strong> está incompleto.
              Estos datos nos ayudan a personalizar tu experiencia y mantenerte al día con tus obligaciones fiscales:
            </p>
            ${fieldList}
            <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Solo te llevará un par de minutos completarlos desde tu panel:
            </p>
            <a href="${appUrl}" style="display:inline-block;background:#2361d8;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;">
              Completar perfil →
            </a>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
              Recibirás este recordatorio cada pocos días hasta que completes el perfil.
              Si tienes dudas, responde a este email.
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
