// Cron endpoint que dispara el worker de envío AEAT.
//
// IMPORTANTE: este endpoint NO está registrado en vercel.json a propósito.
// Vercel serverless no puede correr Playwright (~300MB binarios).
// El worker debe correr en un host con disco persistente:
//   * Cloud Run / Fly.io / Render workers
//   * GitHub Actions cron (.github/workflows/aeat-submission-worker.yml)
//   * Máquina local del usuario (pilot inicial)
//
// El path /api/cron/aeat-submission-worker existe como interfaz HTTP
// que el worker externo puede invocar (con CRON_SECRET) para procesar
// el batch pendiente. Gated por AEAT_SUBMISSION_WORKER_ENABLED=true.
//
// Ver apps/isaak/app/lib/aeat-browser/README.md para opciones de deploy.

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min (Vercel pro)

// Auth pattern unificada con el resto de crons: si CRON_SECRET no está
// configurado, el endpoint queda CERRADO (no abierto). timingSafeEqual
// para evitar timing attacks.
function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  // Auth: Bearer CRON_SECRET. Si falta el env, el endpoint queda
  // cerrado (return false) — corregido R3 audit pre-merge.
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const isWorkerEnabled = process.env.AEAT_SUBMISSION_WORKER_ENABLED === 'true';
  if (!isWorkerEnabled) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'AEAT_SUBMISSION_WORKER_ENABLED no está activado.',
      message: 'Setea AEAT_SUBMISSION_WORKER_ENABLED=true cuando tengas Playwright + pre-pro creds.',
    });
  }

  // Importar el worker en runtime (Playwright es pesado)
  try {
    const { processPendingSubmissions } = await import(
      '@/app/lib/aeat-browser/submission-worker'
    );
    const { PlaywrightBrowserAdapter } = await import(
      '@/app/lib/aeat-browser/adapters/playwright-stub'
    );
    const environment = (process.env.AEAT_ENVIRONMENT === 'prod' ? 'prod' : 'pre') as
      | 'prod'
      | 'pre';
    const result = await processPendingSubmissions({
      adapterFactory: () => new PlaywrightBrowserAdapter(),
      environment,
      maxBatch: Number.parseInt(process.env.AEAT_WORKER_BATCH_SIZE ?? '5', 10),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'worker_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
