// V1.7.4 — Guarda una conversación como PDF en Google Drive del usuario.
//
// POST /api/isaak/chat/<conversationId>/save-to-drive
//
// Requiere que el usuario tenga Google conectado con scope drive.file
// (o drive). Crea la carpeta "Isaak — Conversaciones" si no existe y
// sube el PDF generado con el mismo builder que /export-pdf (V1.5.2).

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConversation } from '@/app/lib/holded-chat';
import { loadTenantMeta } from '@/app/lib/isaak-excel-loader';
import {
  buildConversationPdf,
  conversationPdfFilename,
} from '@/app/lib/isaak-conversation-pdf';
import { uploadFileToDrive } from '@/app/lib/google-drive';

export const runtime = 'nodejs';

const DRIVE_FOLDER = 'Isaak — Conversaciones';

function extractCreatedAt(m: unknown): string | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const raw = (m as { createdAt?: unknown }).createdAt;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Date) return raw.toISOString();
  return undefined;
}

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Context) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'missing_conversation_id' }, { status: 400 });
  }

  const conversation = await getHoldedConversation(
    { tenantId: session.tenantId, userId: session.userId },
    id,
  ).catch(() => null);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const messages = (conversation.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: extractCreatedAt(m),
    }));

  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'empty_conversation' }, { status: 422 });
  }

  let tenantName = 'Tu empresa';
  try {
    const meta = await loadTenantMeta(session.tenantId);
    tenantName = meta.tenantName;
  } catch {
    /* fallback */
  }

  const title = conversation.title ?? 'Conversación con Isaak';
  const generatedAt = new Date().toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let buffer: Buffer;
  try {
    buffer = await buildConversationPdf({ title, tenantName, generatedAt, messages });
  } catch (err) {
    console.error('[chat/save-to-drive] build pdf failed', err);
    return NextResponse.json(
      { ok: false, error: 'pdf_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const filename = conversationPdfFilename(title);
  const driveFileId = await uploadFileToDrive(
    session.tenantId,
    session.userId,
    filename,
    buffer,
    'application/pdf',
    DRIVE_FOLDER,
  );

  if (!driveFileId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'drive_unavailable',
        message:
          'No se pudo subir el archivo a Drive. Comprueba que Google está conectado con permisos de Drive en /integrations.',
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    driveFileId,
    viewUrl: `https://drive.google.com/file/d/${driveFileId}/view`,
    filename,
    folder: DRIVE_FOLDER,
  });
}
