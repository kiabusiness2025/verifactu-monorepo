/**
 * GET /api/admin/tenants/[id]/isaak-usage
 * Métricas de uso de Isaak para un tenant.
 */

import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id: tenantId } = await params;

    const [convRows, msgRows, activeRows, dailyRows, recentRows, topRows] = await Promise.all([
      // Totals: conversations + first/last activity
      query<{
        total: number;
        last_activity: string | null;
        first_activity: string | null;
      }>(
        `SELECT
           COUNT(*)::int               AS total,
           MAX(last_activity)::text    AS last_activity,
           MIN(created_at)::text       AS first_activity
         FROM isaak_conversations
         WHERE tenant_id = $1::uuid`,
        [tenantId]
      ),

      // Messages: total, last 30 days, by role
      query<{
        total_messages: number;
        messages_30d: number;
        user_messages: number;
        assistant_messages: number;
      }>(
        `SELECT
           COUNT(*)::int                                                           AS total_messages,
           COUNT(*) FILTER (WHERE m.created_at >= NOW() - INTERVAL '30 days')::int AS messages_30d,
           COUNT(*) FILTER (WHERE m.role = 'user')::int                            AS user_messages,
           COUNT(*) FILTER (WHERE m.role = 'assistant')::int                       AS assistant_messages
         FROM isaak_conversation_messages m
         JOIN isaak_conversations c ON c.id = m.conversation_id
         WHERE c.tenant_id = $1::uuid`,
        [tenantId]
      ),

      // Active users last 7 days
      query<{ active_users: number }>(
        `SELECT COUNT(DISTINCT user_id)::int AS active_users
         FROM isaak_conversations
         WHERE tenant_id = $1::uuid
           AND last_activity >= NOW() - INTERVAL '7 days'`,
        [tenantId]
      ),

      // Messages per day last 14 days (user turns only)
      query<{ day: string; user_msgs: number }>(
        `SELECT
           date_trunc('day', m.created_at AT TIME ZONE 'UTC')::date::text AS day,
           COUNT(*) FILTER (WHERE m.role = 'user')::int                   AS user_msgs
         FROM isaak_conversation_messages m
         JOIN isaak_conversations c ON c.id = m.conversation_id
         WHERE c.tenant_id = $1::uuid
           AND m.created_at >= NOW() - INTERVAL '14 days'
         GROUP BY 1
         ORDER BY 1`,
        [tenantId]
      ),

      // Recent 5 conversations
      query<{
        id: string;
        title: string | null;
        message_count: number;
        last_activity: string;
        user_email: string;
        user_name: string | null;
      }>(
        `SELECT
           ic.id,
           ic.title,
           ic.message_count,
           ic.last_activity::text,
           u.email  AS user_email,
           u.name   AS user_name
         FROM isaak_conversations ic
         JOIN "User" u ON u.id = ic.user_id
         WHERE ic.tenant_id = $1::uuid
         ORDER BY ic.last_activity DESC
         LIMIT 5`,
        [tenantId]
      ),

      // Top 5 users by message count
      query<{
        user_id: string;
        user_email: string;
        user_name: string | null;
        conversations: number;
        messages: number;
      }>(
        `SELECT
           ic.user_id,
           u.email                      AS user_email,
           u.name                       AS user_name,
           COUNT(DISTINCT ic.id)::int   AS conversations,
           COALESCE(SUM(ic.message_count), 0)::int AS messages
         FROM isaak_conversations ic
         JOIN "User" u ON u.id = ic.user_id
         WHERE ic.tenant_id = $1::uuid
         GROUP BY ic.user_id, u.email, u.name
         ORDER BY messages DESC
         LIMIT 5`,
        [tenantId]
      ),
    ]);

    const conv = convRows[0] ?? { total: 0, last_activity: null, first_activity: null };
    const msg = msgRows[0] ?? {
      total_messages: 0,
      messages_30d: 0,
      user_messages: 0,
      assistant_messages: 0,
    };
    const active = activeRows[0]?.active_users ?? 0;

    return NextResponse.json({
      conversations: {
        total: conv.total,
        firstActivityAt: conv.first_activity,
        lastActivityAt: conv.last_activity,
      },
      messages: {
        total: msg.total_messages,
        last30Days: msg.messages_30d,
        byRole: {
          user: msg.user_messages,
          assistant: msg.assistant_messages,
        },
      },
      activeUsers7d: active,
      dailyMessages: dailyRows,
      recentConversations: recentRows,
      topUsers: topRows,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-usage GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
