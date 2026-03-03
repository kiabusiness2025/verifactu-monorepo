/**
 * API: POST /api/isaak/conversations/[id]/share
 * 
 * Genera un enlace temporal para compartir la conversación
 */

import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const shareRequestSchema = z.object({
  expiresInHours: z.number().int().min(1).max(24 * 30).optional(),
});

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const { expiresInHours = 24 } = shareRequestSchema.parse(bodyUnknown);

    // Verificar que la conversación pertenece al usuario
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        userId: session.uid
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Generar token único
    const shareToken = randomBytes(32).toString('hex');

    // Calcular expiración
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Crear share
    const share = await prisma.isaakConversationShare.create({
      data: {
        conversationId,
        shareToken,
        expiresAt,
        createdBy: session.uid
      }
    });

    // Generar URL completa
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
    const shareUrl = `${baseUrl}/shared/conversation/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      expiresAt: share.expiresAt,
      token: shareToken
    });

  } catch (error: unknown) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Error al compartir conversación', details: getErrorMessage(error, 'Unknown error') },
      { status: 500 }
    );
  }
}

/**
 * GET /api/isaak/conversations/[id]/share
 * 
 * Lista shares activos de la conversación
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
        { error: 'No autenticado' },
        { status: 401 }
      );
    }


    // Verificar ownership
    const conversation = await prisma.isaakConversation.findFirst({
      where: {
        id: conversationId,
        userId: session.uid
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    // Obtener shares activos (no expirados)
    const shares = await prisma.isaakConversationShare.findMany({
      where: {
        conversationId,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';

    return NextResponse.json({
      shares: shares.map((share: typeof shares[number]) => ({
        id: share.id,
        shareUrl: `${baseUrl}/shared/conversation/${share.shareToken}`,
        expiresAt: share.expiresAt,
        accessCount: share.accessCount,
        lastAccessedAt: share.lastAccessedAt,
        createdAt: share.createdAt
      }))
    });

  } catch (error: unknown) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Error al obtener shares', details: getErrorMessage(error, 'Unknown error') },
      { status: 500 }
    );
  }
}
