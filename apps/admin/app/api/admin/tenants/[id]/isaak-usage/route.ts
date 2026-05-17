/**
 * GET /api/admin/tenants/[id]/isaak-usage
 * Devuelve métricas de uso de Isaak para el tenant:
 * conversaciones, mensajes, feedback y última actividad.
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

    const [convRows, msgRows, feedbackRows, eventRows] = await Promise.all([
      // Conversations
      query<{
        total: number;
        last_activity: string | null;
        first_activity: string | null;
      }>(
        `SELECT
           COUNT(*)::int          AS total,
           MAX("updatedAt")::text AS last_activity,
           MIN("createdAt")::text AS first_activity
         FROM "IsaakConversation"
         WHERE "tenantId" = $1`,
        [tenantId]
      ),
      // Messages (last 30 days vs total)
      query<{
        total_messages: number;
        messages_30d: number;
        user_messages: number;
        assistant_messages: number;
      }>(
        `SELECT
           COUNT(*)::int                                                      AS total_messages,
           COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days')::int AS messages_30d,
           COUNT(*) FILTER (WHERE role = 'user')::int                        AS user_messages,
           COUNT(*) FILTER (WHERE role = 'assistant')::int                   AS assistant_messages
         FROM "IsaakConversationMsg" m
         JOIN "IsaakConversation"    c ON c.id = m."conversationId"
         WHERE c."tenantId" = $1`,
        [tenantId]
      ),
      // Feedback from isaak_feedback table (module_key = holded_chat)
      query<{
        thumbs_up: number;
        thumbs_down: number;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE rating = 'thumbs_up')::int   AS thumbs_up,
           COUNT(*) FILTER (WHERE rating = 'thumbs_down')::int AS thumbs_down
         FROM isaak_feedback
         WHERE module_key = 'holded_chat'
           AND tenant_id  = $1::uuid`,
        [tenantId]
      ).catch(() => [{ thumbs_up: 0, thumbs_down: 0 }]),
      // Usage events (FIRST_CHAT_CREATED, etc.)
      query<{ type: string; count: number }>(
        `SELECT type, COUNT(*)::int AS count
         FROM "UsageEvent"
         WHERE "tenantId" = $1
           AND type LIKE '%CHAT%'
         GROUP BY type`,
        [tenantId]
      ).catch(() => [] as { type: string; count: number }[]),
    ]);

    const conv = convRows[0] ?? { total: 0, last_activity: null, first_activity: null };
    const msg = msgRows[0] ?? {
      total_messages: 0,
      messages_30d: 0,
      user_messages: 0,
      assistant_messages: 0,
    };
    const fb = feedbackRows[0] ?? { thumbs_up: 0, thumbs_down: 0 };

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
      feedback: {
        thumbsUp: fb.thumbs_up,
        thumbsDown: fb.thumbs_down,
      },
      usageEvents: eventRows,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak-usage GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
