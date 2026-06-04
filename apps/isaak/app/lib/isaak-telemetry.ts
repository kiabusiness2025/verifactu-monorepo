// V1.4 — Telemetría estructurada en formato JSON line para Vercel logs.
//
// Filosofía: lo que YA persiste en IsaakChatMetric se queda como está
// (DB-backed dashboard). Lo demás (eventos puntuales: auto-memory,
// compaction, tool individual, sub-agente legal) se loguea en JSON line
// para poder filtrarlo y agregarlo con las queries de Vercel logs.
//
// Cada evento lleva un prefijo "[iSky]" que actúa como discriminator
// para grep / Vercel logs filter. Los campos `event`, `tenantId` y
// `latencyMs` están en todos para uniformar dashboards.
//
// Ejemplo de uso:
//   logEvent({ event: 'memory.auto_extract', tenantId, inserted: 2,
//              candidates: 3, latencyMs: 850 });

type BaseEvent = {
  event: string;
  tenantId?: string | null;
  userId?: string | null;
  conversationId?: string | null;
  latencyMs?: number;
};

type AnyEvent = BaseEvent & Record<string, unknown>;

const PREFIX = '[iSky]';

/**
 * Emite un evento estructurado. No bloquea ni puede tirar la request —
 * cualquier error se traga silenciosamente.
 */
export function logEvent(payload: AnyEvent): void {
  try {
    // Vercel logs aplanan el objeto pasado como segundo arg de console.info;
    // mantener un prefijo + objeto separado preserva ambos modos (humano y
    // máquina).
    console.info(`${PREFIX} ${payload.event}`, {
      ts: new Date().toISOString(),
      ...payload,
    });
  } catch {
    /* fail-silent */
  }
}

/**
 * Emite un error operativo (no excepción crítica del usuario). Mismo
 * formato pero con severity error.
 */
export function logError(payload: AnyEvent & { error: string | Error }): void {
  try {
    const errMessage =
      payload.error instanceof Error ? payload.error.message : String(payload.error);
    const errStack = payload.error instanceof Error ? payload.error.stack : undefined;
    console.error(`${PREFIX} ${payload.event}`, {
      ts: new Date().toISOString(),
      ...payload,
      error: errMessage,
      stack: errStack,
    });
  } catch {
    /* fail-silent */
  }
}

/**
 * Helper para envolver una operación async y emitir un evento con su
 * latencia. Si la operación tira, emite error y re-lanza.
 *
 * Uso:
 *   const result = await trackEvent('tool.holded_get_pnl', { tenantId },
 *     async () => holdedGetPnL(apiKey));
 */
export async function trackEvent<T>(
  event: string,
  context: Omit<BaseEvent, 'event' | 'latencyMs'>,
  op: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await op();
    logEvent({ event, ...context, latencyMs: Date.now() - start, ok: true });
    return result;
  } catch (err) {
    logError({
      event,
      ...context,
      latencyMs: Date.now() - start,
      ok: false,
      error: err instanceof Error ? err : String(err),
    });
    throw err;
  }
}
