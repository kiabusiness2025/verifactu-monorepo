import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/isaak/conversations/[id]
 * Obtener detalles de una conversación
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId,
        userId: session.uid,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('[ISAAK] Get conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/isaak/conversations/[id]
 * Actualizar conversación (título, resumen, etc)
 * 
 * Body:
 * {
 *   "title"?: string,
 *   "summary"?: string,
 *   "context"?: string
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verificar acceso
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, summary, context } = body;

    const updated = await prisma.isaakConversation.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(summary && { summary }),
        ...(context && { context }),
      },
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error('[ISAAK] Update conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/isaak/conversations/[id]
 * Eliminar una conversación y todos sus mensajes
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionPayload();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verificar acceso
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: params.id,
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Eliminar conversación (cascada elimina mensajes)
    await prisma.isaakConversation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ISAAK] Delete conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
