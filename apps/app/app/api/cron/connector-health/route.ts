/**
 * POST /api/cron/connector-health
 *
 * Vercel Cron handler: corre todos los checks de superficie pública de los
 * conectores ChatGPT-Holded y Claude-Holded, persiste resultados en
 * `connector_health_checks` y devuelve un summary.
 *
 * Auth: Bearer CRON_SECRET (mismo patrón que /api/cron). En non-production sin
 * CRON_SECRET definido permite ejecutar sin auth para testing local.
 *
 * Schedule (configurado en apps/app/vercel.json): cada 5 minutos.
 */

import { runAllConnectorHealthChecks } from '@/lib/connectorHealth/checks';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function resolveCronSecret(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const direct = request.headers.get('x-cron-secret')?.trim() || '';
  return bearer || direct;
}

function isCronAuthorized(request: NextRequest) {
  const requiredSecret = process.env.CRON_SECRET?.trim() || '';
  if (!requiredSecret) {
    return process.env.NODE_ENV !== 'production';
  }
  const received = resolveCronSecret(request);
  return Boolean(received) && received === requiredSecret;
}

// Vercel Crons invoke with GET; POST kept for manual calls.
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const results = await runAllConnectorHealthChecks();

    // Persistir TODOS los checks en una sola transacción (cae si la DB tira,
    // pero no degradamos el cron por persistencia parcial). Si createMany no
    // está disponible (Accelerate), fallback a inserts individuales.
    try {
      await prisma.connectorHealthCheck.createMany({
        data: results.map((r) => ({
          connector: r.connector,
          checkType: r.checkType,
          target: r.target,
          status: r.status,
          latencyMs: r.latencyMs,
          httpStatus: r.httpStatus ?? null,
          errorCode: r.errorCode ?? null,
          errorMessage: r.errorMessage ?? null,
          metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      });
    } catch (err) {
      console.warn(
        '[cron/connector-health] createMany failed, falling back to individual inserts',
        {
          message: err instanceof Error ? err.message : String(err),
        }
      );
      for (const r of results) {
        try {
          await prisma.connectorHealthCheck.create({
            data: {
              connector: r.connector,
              checkType: r.checkType,
              target: r.target,
              status: r.status,
              latencyMs: r.latencyMs,
              httpStatus: r.httpStatus ?? null,
              errorCode: r.errorCode ?? null,
              errorMessage: r.errorMessage ?? null,
              metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          });
        } catch (writeErr) {
          console.error('[cron/connector-health] failed to persist single check', {
            connector: r.connector,
            checkType: r.checkType,
            message: writeErr instanceof Error ? writeErr.message : String(writeErr),
          });
        }
      }
    }

    const okCount = results.filter((r) => r.status === 'ok').length;
    const degradedCount = results.filter((r) => r.status === 'degraded').length;
    const failCount = results.filter((r) => r.status === 'fail').length;

    return NextResponse.json({
      ok: failCount === 0,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      summary: {
        total: results.length,
        ok: okCount,
        degraded: degradedCount,
        fail: failCount,
      },
      failedChecks: results
        .filter((r) => r.status === 'fail')
        .map((r) => ({
          connector: r.connector,
          checkType: r.checkType,
          errorCode: r.errorCode,
          errorMessage: r.errorMessage,
        })),
    });
  } catch (err) {
    console.error('[cron/connector-health] unhandled failure', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal error',
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
