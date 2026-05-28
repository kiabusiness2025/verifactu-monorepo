/**
 * GET /api/cron/aeat-corpus-reingest
 *
 * Re-ingestión trimestral del corpus AEAT (manuales prácticos, BOE
 * consolidados, INFORMA, FAQs sede). Se ejecuta el día 1 de enero,
 * abril, julio y octubre a las 04:00 UTC (madrugadas en España, hora
 * de mínima carga AEAT).
 *
 * El cron NO ingesta automáticamente PDFs porque pdfExtractor es
 * inyectable y por defecto está en `makeNoopPdfExtractor()` para no
 * arrastrar dependencias nativas a la rama main. Cuando se instale
 * pdf-parse y se configure CORPUS_PDF_EXTRACTOR_ENABLED=1, el cron
 * ingestará también los manuales AEAT.
 *
 * Auth: Bearer CRON_SECRET.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 600;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { ingestAllSources } = await import('@/app/lib/aeat-corpus-ingester');
    const { makePdfParseAdapter } = await import('@/app/lib/aeat-corpus-extractors');

    // Por defecto solo BOE consolidados + INFORMA + sede FAQs (todo HTML
    // estable). Los manuales en PDF requieren extractor configurado.
    const pdfEnabled = process.env.CORPUS_PDF_EXTRACTOR_ENABLED === '1';
    const sourceTypes = pdfEnabled
      ? undefined // todos (incluye manual_aeat PDFs)
      : (['boe', 'informa', 'sede_faq', 'doctrina_dgt'] as const);

    const result = await ingestAllSources({
      sourceTypes: sourceTypes as never,
      replaceAll: true, // chunking puede cambiar entre versiones
      pdfExtractor: pdfEnabled ? makePdfParseAdapter() : undefined,
    });

    return NextResponse.json({
      ...result,
      pdfEnabled,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'reingest_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
