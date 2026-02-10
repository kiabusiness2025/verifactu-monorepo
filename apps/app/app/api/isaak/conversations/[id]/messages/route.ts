import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/isaak/conversations/[id]/messages
 * Guardar un mensaje en la conversación
 * 
 * Body:
 * {
 *   "role": "user" | "assistant",
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verificar acceso
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
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

