/**
 * Auto-refresco de los health-checks de conectores.
 *
 * El cron de Vercel (`/api/cron/connector-health`, cada 5 min) es la vía
 * principal para mantener `connector_health_checks` al día. Pero si el cron
 * deja de dispararse, el estado mostrado en las landings se queda obsoleto
 * ("última comprobación hace N días").
 *
 * Este helper permite que el endpoint público se autocure: cuando detecta
 * datos viejos, programa un refresco en segundo plano (vía `after()`) que
 * ejecuta los checks y los persiste. Así el estado se mantiene fresco con el
 * propio tráfico de las landings, sin depender únicamente del cron.
 *
 * Es best-effort: si falla, se loguea y se ignora — el cron sigue siendo el
 * respaldo y nunca se degrada la respuesta del endpoint público.
 */

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { runAllConnectorHealthChecks, type HealthCheckResult } from './checks';

/** Datos más viejos que esto se consideran obsoletos y disparan un refresco. */
export const HEALTH_STALE_AFTER_MS = 15 * 60 * 1000;

// Throttle en memoria: como mucho un refresco cada 3 min por instancia
// serverless. Evita que ráfagas de tráfico lancen runs solapados.
const REFRESH_THROTTLE_MS = 3 * 60 * 1000;
let lastRefreshStartedAt = 0;

function toCreateData(r: HealthCheckResult) {
  return {
    connector: r.connector,
    checkType: r.checkType,
    target: r.target,
    status: r.status,
    latencyMs: r.latencyMs,
    httpStatus: r.httpStatus ?? null,
    errorCode: r.errorCode ?? null,
    errorMessage: r.errorMessage ?? null,
    metadata: (r.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

async function persistResults(results: HealthCheckResult[]): Promise<void> {
  const data = results.map(toCreateData);
  try {
    await prisma.connectorHealthCheck.createMany({ data });
  } catch {
    // Prisma Accelerate no siempre soporta createMany — fallback a inserts
    // individuales, igual que el cron.
    for (const row of data) {
      try {
        await prisma.connectorHealthCheck.create({ data: row });
      } catch (err) {
        console.warn('[connectorHealth] background insert failed', {
          checkType: row.checkType,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Ejecuta todos los checks y los persiste. Pensado para llamarse desde
 * `after()` en el endpoint público. Aplica un throttle en memoria para no
 * solapar ejecuciones. Nunca lanza: cualquier error se loguea.
 */
export async function refreshConnectorHealthInBackground(): Promise<void> {
  const now = Date.now();
  if (now - lastRefreshStartedAt < REFRESH_THROTTLE_MS) return;
  lastRefreshStartedAt = now;

  try {
    const results = await runAllConnectorHealthChecks();
    await persistResults(results);
  } catch (err) {
    console.warn('[connectorHealth] background refresh failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
