/**
 * POST /api/admin/isaak/upload
 * Recibe un archivo PDF (multipart), extrae el texto y lo devuelve.
 * El cliente almacena el texto y lo envía en llamadas posteriores al chat.
 */

import { requireAdmin } from '@/lib/adminAuth';
import { NextRequest, NextResponse } from 'next/server';
// pdf-parse no tiene tipos publicados — importar con require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 12_000; // límite para no saturar el contexto de Claude

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, numpages } = await pdfParse(buffer);

    const trimmedText = text.trim().slice(0, MAX_CHARS);

    return NextResponse.json({
      filename: file.name,
      text: trimmedText,
      pages: numpages,
      chars: trimmedText.length,
      truncated: text.trim().length > MAX_CHARS,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/upload]', error);
    return NextResponse.json({ error: 'Error procesando el PDF' }, { status: 500 });
  }
}
