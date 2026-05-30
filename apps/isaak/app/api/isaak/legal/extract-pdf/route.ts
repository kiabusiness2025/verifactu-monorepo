// V1.2 — Extrae el texto plano de un PDF subido por el usuario.
//
// POST /api/isaak/legal/extract-pdf
// Content-Type: multipart/form-data, field name "file"
//
// Devuelve { ok, text, pages, sizeKb, filename, truncated }.
//
// Pensado para el Asesor Legal: el usuario sube un contrato en PDF y este
// endpoint le devuelve el texto que luego puede pegar en el chat (o que
// el cliente envía directamente al LLM con la tool isaak_review_contract).
//
// Reutiliza `makePdfParseAdapter` y `normalizeExtractedText` de
// aeat-corpus-extractors — mismo motor que usa el cron de re-ingest.

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import {
  makePdfParseAdapter,
  normalizeExtractedText,
} from '@/app/lib/aeat-corpus-extractors';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = 'application/pdf';
const MIN_TEXT_LENGTH = 200;
const MAX_TEXT_LENGTH = 30_000; // mismo límite que reviewContract()

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { ok: false, error: 'invalid_form_data' },
      { status: 400 },
    );
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
        message: `Solo se aceptan PDFs (${ACCEPTED_MIME}). Recibido: ${file.type}.`,
      },
      { status: 400 },
    );
  }

  let buffer: Uint8Array;
  try {
    buffer = new Uint8Array(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { ok: false, error: 'read_failed', message: 'No pude leer el archivo.' },
      { status: 400 },
    );
  }

  const extract = makePdfParseAdapter();
  let extracted: Awaited<ReturnType<ReturnType<typeof makePdfParseAdapter>>>;
  try {
    extracted = await extract(buffer);
  } catch (err) {
    console.error('[legal/extract-pdf] pdf-parse failed', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'pdf_parse_failed',
        message:
          'No pude extraer texto del PDF. Si es un escaneado, prueba con un OCR antes de subirlo.',
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
          'El PDF tiene muy poco texto extraíble. Si es un escaneado, conviértelo con OCR; si es un formulario en blanco, sube uno con contenido.',
        chars: normalized.length,
        pages: extracted.meta?.pageCount ?? null,
      },
      { status: 422 },
    );
  }

  const truncated = normalized.length > MAX_TEXT_LENGTH;
  const text = truncated ? normalized.slice(0, MAX_TEXT_LENGTH) : normalized;

  return NextResponse.json({
    ok: true,
    text,
    pages: extracted.meta?.pageCount ?? null,
    sizeKb: Math.round(file.size / 1024),
    filename: file.name,
    truncated,
    truncatedNote: truncated
      ? `El contrato superaba ${MAX_TEXT_LENGTH} caracteres; he conservado los primeros para la revisión. Considera enviar las secciones clave por separado.`
      : null,
  });
}
