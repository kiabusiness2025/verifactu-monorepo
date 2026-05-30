// V1.2 — Sube un PDF y recibe la revisión legal en una sola llamada.
//
// POST /api/isaak/legal/review-pdf
// Content-Type: multipart/form-data, field "file"
//
// Pipeline:
//   1. Extrae texto del PDF (pdf-parse + normalizeExtractedText)
//   2. Llama a reviewContract() con el texto (sub-agente Asesor Legal)
//   3. Devuelve { ok: true, review: ContractReview, source: {...} }
//
// Reutiliza los dos primitivos ya implementados — esto es solo el atajo
// "una llamada" para la página /asesor-legal (UI dedicada con dropzone).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  makePdfParseAdapter,
  normalizeExtractedText,
} from '@/app/lib/aeat-corpus-extractors';
import { reviewContract, CONTRACT_TYPES } from '@/app/lib/isaak-legal-advisor';
import type { ContractType } from '@/app/lib/isaak-legal-advisor';
import { loadTenantMeta } from '@/app/lib/isaak-excel-loader';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = 'application/pdf';
const MIN_TEXT_LENGTH = 200;
const MAX_TEXT_LENGTH = 30_000;

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ ok: false, error: 'invalid_form_data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: 'file_too_large',
        message: `El PDF no puede superar ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
      },
      { status: 413 },
    );
  }
  if (file.type && file.type !== ACCEPTED_MIME) {
    return NextResponse.json(
      {
        ok: false,
        error: 'unsupported_mime',
        message: `Solo se aceptan PDFs. Recibido: ${file.type}.`,
      },
      { status: 400 },
    );
  }

  // Hint opcional del tipo de contrato (NDA, arrendamiento, etc.).
  const rawType = (formData.get('contractType') as string | null)?.trim() ?? '';
  const contractType: ContractType | null =
    rawType && (CONTRACT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as ContractType)
      : null;

  let buffer: Uint8Array;
  try {
    buffer = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { ok: false, error: 'read_failed', message: 'No pude leer el archivo.' },
      { status: 400 },
    );
  }

  let extracted: Awaited<ReturnType<ReturnType<typeof makePdfParseAdapter>>>;
  try {
    extracted = await makePdfParseAdapter()(buffer);
  } catch (err) {
    console.error('[legal/review-pdf] pdf-parse failed', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'pdf_parse_failed',
        message:
          'No pude extraer texto del PDF. Si es un escaneado, pásalo por un OCR antes.',
      },
      { status: 422 },
    );
  }

  const normalized = normalizeExtractedText(extracted.text);
  if (normalized.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: 'text_too_short',
        message:
          'El PDF tiene poco texto extraíble. Si es un escaneado, conviértelo con OCR primero.',
        chars: normalized.length,
      },
      { status: 422 },
    );
  }

  const truncated = normalized.length > MAX_TEXT_LENGTH;
  const text = truncated ? normalized.slice(0, MAX_TEXT_LENGTH) : normalized;

  // Contexto del tenant — solo para mejorar el prompt
  let tenantContext: { name?: string; activity?: string } | undefined;
  try {
    const meta = await loadTenantMeta(session.tenantId);
    if (meta.tenantName) tenantContext = { name: meta.tenantName };
  } catch {
    /* opcional, no bloquea */
  }

  const review = await reviewContract({
    contractText: text,
    contractType,
    tenantContext,
  });

  if (!review.ok) {
    return NextResponse.json(
      { ok: false, error: review.error, message: review.message },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    review,
    source: {
      filename: file.name,
      sizeKb: Math.round(file.size / 1024),
      pages: extracted.meta?.pageCount ?? null,
      textTruncated: truncated,
    },
  });
}
