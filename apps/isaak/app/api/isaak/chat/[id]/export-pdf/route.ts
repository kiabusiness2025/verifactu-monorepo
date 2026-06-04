// V1.5.2 — Endpoint que exporta una conversación a PDF.
//
// GET /api/isaak/chat/<conversationId>/export-pdf
//
// Verifica que la conversación pertenece al tenant del usuario, carga
// todos los mensajes user/assistant y los renderiza con
// buildConversationPdf. La descarga se sirve con Content-Disposition:
// attachment para abrir directamente el "Guardar como".

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConversation } from '@/app/lib/holded-chat';
import { loadTenantMeta } from '@/app/lib/isaak-excel-loader';
import {
  buildConversationPdf,
  conversationPdfFilename,
} from '@/app/lib/isaak-conversation-pdf';

export const runtime = 'nodejs';

function extractCreatedAt(m: unknown): string | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const raw = (m as { createdAt?: unknown }).createdAt;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Date) return raw.toISOString();
  return undefined;
}

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'missing_conversation_id' }, { status: 400 });
  }

  const conversation = await getHoldedConversation(
    { tenantId: session.tenantId, userId: session.userId },
    id,
  ).catch(() => null);
  if (!conversation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const messages = (conversation.messages ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: extractCreatedAt(m),
    }));

  if (messages.length === 0) {
    return NextResponse.json({ error: 'empty_conversation' }, { status: 422 });
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

  try {
    const buffer = await buildConversationPdf({
      title,
      tenantName,
      generatedAt,
      messages,
    });
    const filename = conversationPdfFilename(title);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[chat/export-pdf] failed', err);
    return NextResponse.json(
      { error: 'export_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
