/**
 * GET /api/public/status/{connector}
 *
 * Endpoint público (sin auth) que devuelve el estado actual del conector
 * para que las landings de holded.verifactu.business lo embeban.
 *
 * Devuelve, por cada `checkType` definido en lib/connectorHealth/checks.ts:
 *   - status: ok | degraded | fail (último resultado)
 *   - latencyMs: latencia del último check
 *   - lastCheckedAt: timestamp del último check
 *   - uptime24h: % de checks `ok` en las últimas 24h
 *   - lastFailedAt: fecha del último fail en 30 días (o null)
 *
 * Además computa un `overall` agregado para el widget compacto.
 *
 * Cache: 60s edge + 300s SWR para que aguante picos de tráfico en las landings
 * sin saturar la DB. La granularidad real del estado es de 5 min (cron) — más
 * fino que eso no aporta.
 */

import prisma from '@/lib/prisma';
import { getCheckDefinitions, type ConnectorId } from '@/lib/connectorHealth/checks';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CONNECTORS: ReadonlyArray<ConnectorId> = ['chatgpt', 'claude'];

function applyCors<T extends { headers: Headers }>(response: T) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

export async function OPTIONS() {
  return applyCors(new NextResponse(null, { status: 204 }));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ connector: string }> }) {
  const { connector: connectorParam } = await ctx.params;
  const connector = connectorParam as ConnectorId;
  if (!ALLOWED_CONNECTORS.includes(connector)) {
    return applyCors(
      NextResponse.json(
        { error: 'unknown_connector', allowed: ALLOWED_CONNECTORS },
        { status: 404 }
      )
    );
  }

  const expectedChecks = getCheckDefinitions().filter((c) => c.connector === connector);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Una sola query trae los últimos 30 días de este conector; agregamos en
    // memoria para evitar N+1 queries (uno por checkType).
    const rows = await prisma.connectorHealthCheck.findMany({
      where: { connector, checkedAt: { gte: since30d } },
      orderBy: { checkedAt: 'desc' },
      select: {
        checkType: true,
        status: true,
        latencyMs: true,
        httpStatus: true,
        errorCode: true,
        errorMessage: true,
        checkedAt: true,
        target: true,
      },
    });

    const byCheckType = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byCheckType.get(row.checkType);
      if (list) list.push(row);
      else byCheckType.set(row.checkType, [row]);
    }

    const checks = expectedChecks.map((def) => {
      const history = byCheckType.get(def.checkType) ?? [];
      const latest = history[0];
      const last24h = history.filter((r) => r.checkedAt >= since24h);
      const okCount24h = last24h.filter((r) => r.status === 'ok' || r.status === 'degraded').length;
      const uptime24h =
        last24h.length === 0 ? null : Math.round((okCount24h / last24h.length) * 1000) / 10;
      const lastFailedAt = history.find((r) => r.status === 'fail')?.checkedAt ?? null;
      const latestLatencyP95 = (() => {
        // Aproximación: ordenar latencias del último día y coger el p95.
        const samples = last24h.map((r) => r.latencyMs).sort((a, b) => a - b);
        if (samples.length === 0) return null;
        const idx = Math.min(samples.length - 1, Math.floor(samples.length * 0.95));
        return samples[idx];
      })();

      // `kind` viene de la definición; fallback por prefijo `tool_` para
      // tolerar definiciones antiguas o mocks de test sin el campo.
      const kind =
        ('kind' in def && def.kind) || (def.checkType.startsWith('tool_') ? 'tool' : 'surface');

      return {
        checkType: def.checkType,
        kind,
        target: def.target,
        status: latest?.status ?? 'unknown',
        latencyMs: latest?.latencyMs ?? null,
        httpStatus: latest?.httpStatus ?? null,
        lastCheckedAt: latest?.checkedAt.toISOString() ?? null,
        lastErrorCode: latest?.status === 'fail' ? latest.errorCode : null,
        lastErrorMessage: latest?.status === 'fail' ? latest.errorMessage : null,
        uptime24hPct: uptime24h,
        latencyP95Ms24h: latestLatencyP95,
        lastFailedAt: lastFailedAt ? lastFailedAt.toISOString() : null,
        sampleCount24h: last24h.length,
      };
    });

    // Overall: cae al peor estado de cualquier check (fail > degraded > ok).
    const overall: 'operational' | 'degraded' | 'down' | 'unknown' = (() => {
      if (checks.every((c) => c.status === 'unknown')) return 'unknown';
      if (checks.some((c) => c.status === 'fail')) return 'down';
      if (checks.some((c) => c.status === 'degraded')) return 'degraded';
      return 'operational';
    })();

    const lastCheckedAt = checks.reduce<string | null>((acc, c) => {
      if (!c.lastCheckedAt) return acc;
      if (!acc) return c.lastCheckedAt;
      return c.lastCheckedAt > acc ? c.lastCheckedAt : acc;
    }, null);

    const okCount = checks.filter((c) => c.status === 'ok').length;
    const overallUptime24hPct = (() => {
      const sampled = checks.filter((c) => c.uptime24hPct !== null);
      if (sampled.length === 0) return null;
      const sum = sampled.reduce((acc, c) => acc + (c.uptime24hPct ?? 0), 0);
      return Math.round((sum / sampled.length) * 10) / 10;
    })();

    // Resumen separado de la familia `tool` (revisión en vivo de cada tool
    // del conector) — alimenta el bloque "tools operativas X/Y" del badge.
    const toolChecks = checks.filter((c) => c.kind === 'tool');
    const surfaceChecks = checks.filter((c) => c.kind !== 'tool');

    return applyCors(
      NextResponse.json({
        connector,
        overall,
        lastCheckedAt,
        checksTotal: checks.length,
        checksOk: okCount,
        checksDegraded: checks.filter((c) => c.status === 'degraded').length,
        checksFail: checks.filter((c) => c.status === 'fail').length,
        checksUnknown: checks.filter((c) => c.status === 'unknown').length,
        surfaceTotal: surfaceChecks.length,
        surfaceOk: surfaceChecks.filter((c) => c.status === 'ok').length,
        toolsTotal: toolChecks.length,
        toolsOk: toolChecks.filter((c) => c.status === 'ok').length,
        toolsDegraded: toolChecks.filter((c) => c.status === 'degraded').length,
        toolsFail: toolChecks.filter((c) => c.status === 'fail').length,
        toolsUnknown: toolChecks.filter((c) => c.status === 'unknown').length,
        overallUptime24hPct,
        checks,
      })
    );
  } catch (err) {
    console.error('[public/status] DB read failed', {
      connector,
      message: err instanceof Error ? err.message : String(err),
    });
    // Degradar a respuesta neutra para no romper el render de la landing.
    return applyCors(
      NextResponse.json(
        {
          connector,
          overall: 'unknown',
          lastCheckedAt: null,
          error: 'status_unavailable',
          checks: expectedChecks.map((def) => ({
            checkType: def.checkType,
            kind:
              ('kind' in def && def.kind) ||
              (def.checkType.startsWith('tool_') ? 'tool' : 'surface'),
            target: def.target,
            status: 'unknown',
            latencyMs: null,
            lastCheckedAt: null,
            uptime24hPct: null,
            sampleCount24h: 0,
          })),
        },
        { status: 200 }
      )
    );
  }
}
