/**
 * GET /api/admin/profile-reminders/status
 *
 * Devuelve estadísticas de recordatorios de perfil incompleto para el dashboard.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REMINDER_INTERVAL_DAYS = 3;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    // Check if reminder log table exists
    const tableCheck = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profile_reminder_logs'
      ) AS exists`,
      []
    );
    const tableExists = tableCheck[0]?.exists ?? false;

    // Count tenants with incomplete profiles that have Holded connections
    const [incompleteResult, lastBatchResult, pendingResult] = await Promise.all([
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
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
         )`,
        []
      ),
      tableExists
        ? query<{ last_sent: string | null; total_sent: number }>(
            `SELECT
               MAX(sent_at)::text AS last_sent,
               COUNT(*)::int      AS total_sent
             FROM profile_reminder_logs`,
            []
          )
        : Promise.resolve([{ last_sent: null, total_sent: 0 }]),
      tableExists
        ? query<{ count: number }>(
            `SELECT COUNT(DISTINCT t.id)::int AS count
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
             )`,
            [REMINDER_INTERVAL_DAYS]
          )
        : Promise.resolve([{ count: 0 }]),
    ]);

    return NextResponse.json({
      incomplete: incompleteResult[0]?.count ?? 0,
      pending_reminder: pendingResult[0]?.count ?? 0,
      last_sent: lastBatchResult[0]?.last_sent ?? null,
      total_reminders_sent: lastBatchResult[0]?.total_sent ?? 0,
      interval_days: REMINDER_INTERVAL_DAYS,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al obtener estado' }, { status: 500 });
  }
}
