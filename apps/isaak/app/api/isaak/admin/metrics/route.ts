// V1.4 — Endpoint admin con KPIs agregados sobre IsaakChatMetric.
//
// GET /api/isaak/admin/metrics?days=7
//
// Devuelve agregados para dashboards rápidos sin tener que abrir Vercel
// Postgres directamente:
//   - totals: requests, tokens, costEur
//   - latency: avg, p50, p95
//   - byDay: timeseries de últimos N días
//   - byModel: distribución de modelo usado
//   - topTools: top tools por nº de invocaciones
//   - errors: count de fallbacks y judge blocks
//   - routedTo: distribución del classifier
//
// Acceso: solo emails listados en ADMIN_EMAILS o HOLDED_ADMIN_EMAILS.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS ?? process.env.HOLDED_ADMIN_EMAILS ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function isAdminSession() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user?.email) return null;
  const admins = getAdminEmails();
  if (admins.length === 0) return null;
  if (!admins.includes(user.email.toLowerCase())) return null;
  return { userId: session.userId, email: user.email };
}

type CountRow = { value: string; count: bigint };
type DayRow = {
  day: Date;
  requests: bigint;
  in_tokens: bigint;
  out_tokens: bigint;
  cost_eur: number | string;
  avg_latency: number | string;
};

export async function GET(req: NextRequest) {
  const admin = await isAdminSession();
  if (!admin) return NextResponse.json({ error: 'admin_required' }, { status: 403 });

  const daysRaw = Number(new URL(req.url).searchParams.get('days') ?? '7');
  const days = Math.max(1, Math.min(90, Number.isFinite(daysRaw) ? daysRaw : 7));
  const since = new Date(Date.now() - days * 86_400_000);

  try {
    const [totals, latencyStats, byDay, byModel, byRouted, topToolsRaw, errorCounts, topReferrers] =
      await Promise.all([
        prisma.isaakChatMetric.aggregate({
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          _sum: {
            inputTokens: true,
            outputTokens: true,
            estimatedCostEur: true,
            judgeInvocations: true,
            judgeBlocks: true,
          },
          _avg: { latencyMs: true, firstTokenMs: true },
        }),
        // p50 / p95 latency — Postgres percentile_cont
        prisma.$queryRawUnsafe<{ p50: number; p95: number }[]>(
          `SELECT
             percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
           FROM isaak_chat_metrics
           WHERE created_at >= $1`,
          since
        ),
        prisma.$queryRawUnsafe<DayRow[]>(
          `SELECT
             date_trunc('day', created_at)::date AS day,
             count(*)::bigint AS requests,
             sum(input_tokens)::bigint AS in_tokens,
             sum(output_tokens)::bigint AS out_tokens,
             sum(estimated_cost_eur) AS cost_eur,
             avg(latency_ms) AS avg_latency
           FROM isaak_chat_metrics
           WHERE created_at >= $1
           GROUP BY 1
           ORDER BY 1 ASC`,
          since
        ),
        prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT model_used AS value, count(*)::bigint AS count
           FROM isaak_chat_metrics
           WHERE created_at >= $1
           GROUP BY 1
           ORDER BY count DESC
           LIMIT 15`,
          since
        ),
        prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT COALESCE(routed_to, 'unknown') AS value, count(*)::bigint AS count
           FROM isaak_chat_metrics
           WHERE created_at >= $1
           GROUP BY 1
           ORDER BY count DESC`,
          since
        ),
        // unnest tool_names para contar tools individuales
        prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT t AS value, count(*)::bigint AS count
           FROM isaak_chat_metrics, unnest(tool_names) AS t
           WHERE created_at >= $1 AND t IS NOT NULL
           GROUP BY t
           ORDER BY count DESC
           LIMIT 20`,
          since
        ),
        prisma.$queryRawUnsafe<{ fallbacks: bigint; clarifications: bigint }[]>(
          `SELECT
             sum(CASE WHEN is_fallback THEN 1 ELSE 0 END)::bigint AS fallbacks,
             sum(CASE WHEN is_clarification THEN 1 ELSE 0 END)::bigint AS clarifications
           FROM isaak_chat_metrics
           WHERE created_at >= $1`,
          since
        ),
        // V1.8.4 — Top referrers desde el QR/link compartido
        prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT metadata_json->>'ref' AS value, count(*)::bigint AS count
           FROM usage_events
           WHERE created_at >= $1
             AND source = 'referral_qr'
             AND metadata_json->>'kind' = 'referral_view'
             AND metadata_json->>'ref' IS NOT NULL
           GROUP BY 1
           ORDER BY count DESC
           LIMIT 20`,
          since
        ),
      ]);

    const lat = latencyStats[0] ?? { p50: 0, p95: 0 };
    const err = errorCounts[0] ?? { fallbacks: BigInt(0), clarifications: BigInt(0) };

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      totals: {
        requests: totals._count._all,
        inputTokens: Number(totals._sum.inputTokens ?? 0),
        outputTokens: Number(totals._sum.outputTokens ?? 0),
        costEur: Number(totals._sum.estimatedCostEur ?? 0),
        judgeInvocations: Number(totals._sum.judgeInvocations ?? 0),
        judgeBlocks: Number(totals._sum.judgeBlocks ?? 0),
        fallbacks: Number(err.fallbacks),
        clarifications: Number(err.clarifications),
      },
      latency: {
        avgMs: Math.round(totals._avg.latencyMs ?? 0),
        firstTokenAvgMs: Math.round(totals._avg.firstTokenMs ?? 0),
        p50Ms: Math.round(Number(lat.p50) || 0),
        p95Ms: Math.round(Number(lat.p95) || 0),
      },
      byDay: byDay.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        requests: Number(r.requests),
        inputTokens: Number(r.in_tokens),
        outputTokens: Number(r.out_tokens),
        costEur: Number(r.cost_eur),
        avgLatencyMs: Math.round(Number(r.avg_latency) || 0),
      })),
      byModel: byModel.map((r) => ({ model: r.value, count: Number(r.count) })),
      byRoutedTo: byRouted.map((r) => ({ routedTo: r.value, count: Number(r.count) })),
      topTools: topToolsRaw.map((r) => ({ toolName: r.value, count: Number(r.count) })),
      topReferrers: topReferrers.map((r) => ({ ref: r.value, count: Number(r.count) })),
    });
  } catch (err) {
    console.error('[admin/metrics] failed', err);
    return NextResponse.json({ error: 'metrics_failed' }, { status: 500 });
  }
}
