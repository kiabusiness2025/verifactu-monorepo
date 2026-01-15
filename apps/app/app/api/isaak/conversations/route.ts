import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/isaak/conversations
 * Obtener historial de conversaciones del usuario
 * 
 * Query params:
 * - limit?: number (default: 20)
 * - offset?: number (default: 0)
 * - search?: string (buscar en títulos/resumen)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.tenantId || !session.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    // Obtener conversaciones del usuario
    const conversations = await prisma.isaakConversation.findMany({
      where: {
        tenantId: session.tenantId,
        userId: session.uid,
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { lastActivity: 'desc' },
      take: limit,
      skip: offset,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const total = await prisma.isaakConversation.count({
      where: {
        tenantId: session.tenantId,
        userId: session.uid,
      },
    });

    return NextResponse.json({
      conversations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[ISAAK] Get conversations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/isaak/conversations
 * Crear nueva conversación
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.tenantId || !session.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { title, context } = await req.json();

    const conversation = await prisma.isaakConversation.create({
      data: {
        tenantId: session.tenantId,
        userId: session.uid,
        title: title || 'Nueva conversación con Isaak',
        context: context || null,
        lastActivity: new Date(),
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('[ISAAK] Create conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
