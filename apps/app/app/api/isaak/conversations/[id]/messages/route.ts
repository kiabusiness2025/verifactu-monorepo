import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/isaak/conversations/[id]/messages
 * Guardar un mensaje en la conversación
 * 
 * Body:
 * {
 *   "role": "user" | "assistant",
 *   "content": string,
 *   "tokens": number? (opcional),
 *   "metadata": object? (opcional)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    const { role, content, tokens, metadata } = await req.json();

    if (!role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: role, content' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "assistant"' },
        { status: 400 }
      );
    }

    // Verificar que la conversación pertenece al usuario/tenant
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Guardar mensaje
    const message = await prisma.isaakConversationMsg.create({
      data: {
        conversationId,
        role,
        content,
        tokens: tokens || null,
        metadata: metadata || null,
      },
    });

    // Actualizar contador y lastActivity en la conversación
    await prisma.isaakConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        lastActivity: new Date(),
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('[ISAAK] Save message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/isaak/conversations/[id]/messages
 * Obtener todos los mensajes de una conversación
 * 
 * Query params:
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verificar acceso
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Obtener mensajes
    const messages = await prisma.isaakConversationMsg.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.isaakConversationMsg.count({
      where: { conversationId },
    });

    return NextResponse.json({
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[ISAAK] Get messages error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/isaak/conversations/[id]/messages/[messageId]
 * Eliminar un mensaje específico
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getSessionPayload(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    const messageId = params.messageId;

    // Verificar acceso a la conversación
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Eliminar mensaje
    await prisma.isaakConversationMsg.delete({
      where: {
        id: messageId,
      },
    });

    // Decrementar contador
    await prisma.isaakConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { decrement: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ISAAK] Delete message error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 500 }
    );
  }
}
