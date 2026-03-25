import { NextRequest, NextResponse } from 'next/server';
import { ensureHoldedConversation, listHoldedConversations } from '@/app/lib/holded-chat';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para ver tus chats.' },
      { status: 401 }
    );
  }

  const conversations = await listHoldedConversations({
    tenantId: session.tenantId,
    userId: session.userId,
  });

  return NextResponse.json({
    ok: true,
    conversations,
  });
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para crear un chat.' },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  const conversation = await ensureHoldedConversation(
    {
      tenantId: session.tenantId,
      userId: session.userId,
    },
    {
      titleSeed: title || 'Nuevo chat con Isaak',
    }
  );

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      context: conversation.context,
      summary: conversation.summary,
      messageCount: conversation.messageCount,
      lastActivity: conversation.lastActivity.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    },
  });
}
