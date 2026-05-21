/**
 * POST /api/admin/marketing/send
 *
 * Envía una campaña de email a un segmento de usuarios.
 *
 * Segmentos:
 *  - all_users          → todos los usuarios con email
 *  - holded_connected   → usuarios cuyo tenant tiene conexión Holded activa
 *  - holded_error       → usuarios cuyo tenant tiene conexión Holded con error
 *
 * Con dryRun=true devuelve la lista de destinatarios sin enviar.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { prisma, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FROM = 'Verifactu Business <soporte@verifactu.business>';
const BATCH_SIZE = 100;

type Segment = 'all_users' | 'holded_connected' | 'holded_error';

const SEGMENT_QUERY: Record<Segment, string> = {
  all_users: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    WHERE u.email IS NOT NULL
      AND u."isBlocked" = false
    ORDER BY u.email
  `,
  holded_connected: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    JOIN external_connections ec ON ec.tenant_id = m.tenant_id
    WHERE ec.provider = 'holded'
      AND ec.connection_status = 'connected'
      AND u."isBlocked" = false
    ORDER BY u.email
  `,
  holded_error: `
    SELECT DISTINCT u.email, u.name
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    JOIN external_connections ec ON ec.tenant_id = m.tenant_id
    WHERE ec.provider = 'holded'
      AND ec.connection_status = 'error'
      AND u."isBlocked" = false
    ORDER BY u.email
  `,
};

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await req.json();
    const { segment, subject, html, text, dryRun } = body as {
      segment: Segment;
      subject: string;
      html?: string;
      text?: string;
      dryRun?: boolean;
    };

    if (!segment || !SEGMENT_QUERY[segment]) {
      return NextResponse.json(
        { error: 'Segmento inválido. Usa: all_users, holded_connected, holded_error' },
        { status: 400 }
      );
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'El asunto es obligatorio' }, { status: 400 });
    }
    if (!html?.trim() && !text?.trim()) {
      return NextResponse.json({ error: 'Proporciona html o text' }, { status: 400 });
    }

    const recipients = await query<{ email: string; name: string | null }>(
      SEGMENT_QUERY[segment],
      []
    );

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        segment,
        recipientCount: recipients.length,
        recipients: recipients.slice(0, 50).map((r) => r.email),
        truncated: recipients.length > 50,
      });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, message: 'Sin destinatarios' });
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      const batch = chunk.map((r) => ({
        from: FROM,
        to: r.email,
        subject: subject.trim(),
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        tags: [
          { name: 'campaign_segment', value: segment },
          { name: 'sent_by', value: admin.email ?? 'admin' },
        ],
      }));

      try {
        // Cast: el validator de arriba garantiza que html?.trim() || text?.trim()
        // exista antes de entrar al loop. TypeScript no propaga ese narrowing
        // al spread condicional `...(html ? { html } : {})`, así que el tipo
        // del batch tiene html opcional. Resend.batch.send acepta items con
        // html OR text en runtime; el tipo declarado pide html requerido.
        const result = await resend.batch.send(batch as Parameters<typeof resend.batch.send>[0]);
        if ((result as { error?: unknown }).error) {
          failed += chunk.length;
          console.error('[marketing/send] batch error', (result as { error?: unknown }).error);
        } else {
          sent += chunk.length;
        }
      } catch (batchErr) {
        failed += chunk.length;
        console.error('[marketing/send] batch threw', batchErr);
      }
    }

    console.log(
      `[admin][marketing/send] segment=${segment} sent=${sent} failed=${failed} by=${admin.email}`
    );

    await prisma.marketingCampaign.create({
      data: {
        segment,
        subject: subject.trim(),
        sentBy: admin.email ?? 'admin',
        sentCount: sent,
        failCount: failed,
        totalCount: recipients.length,
      },
    });

    return NextResponse.json({ ok: true, segment, sent, failed, total: recipients.length });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[admin][marketing/send] failed', error);
    return NextResponse.json({ error: 'Error al enviar campaña' }, { status: 500 });
  }
}
