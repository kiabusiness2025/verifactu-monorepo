// Cron endpoint que dispara el worker de envío AEAT.
//
// Vercel cron config (vercel.json):
//   { "path": "/api/cron/aeat-submission-worker", "schedule": "*/15 * * * *" }
//
// PERO: Vercel serverless no puede correr Playwright. Este endpoint
// solo es útil si:
//   (a) Estamos en modo MOCK (tests/desarrollo)
//   (b) Hemos hecho una deploy a Cloud Run/Fly/Render con Playwright
//
// En producción real, este endpoint debería redirigir el procesamiento
// al worker externo (HTTP call) o usar una cola (Redis, etc.). Para v1
// queda como punto de entrada del worker.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min (Vercel pro)

export async function GET(req: NextRequest) {
  // Auth: Vercel cron usa header User-Agent específico, o un secret.
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
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
