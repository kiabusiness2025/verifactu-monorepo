import { NextResponse } from 'next/server';
import { getHoldedConversation } from '@/app/lib/holded-chat';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '@/app/lib/holded-session';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para ver este chat.' },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const conversation = await getHoldedConversation(
    {
      tenantId: session.tenantId,
      userId: session.userId,
    },
    id
  );

  if (!conversation) {
    return NextResponse.json({ error: 'Chat no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    conversation,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para editar este chat.' },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return NextResponse.json({ error: 'Escribe un titulo valido.' }, { status: 400 });
  }

  const existing = await prisma.isaakConversation.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      userId: session.userId,
      context: 'holded_free_dashboard',
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Chat no encontrado.' }, { status: 404 });
  }

  const updated = await prisma.isaakConversation.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json({
    ok: true,
    conversation: {
      id: updated.id,
      title: updated.title,
      context: updated.context,
      summary: updated.summary,
      messageCount: updated.messageCount,
      lastActivity: updated.lastActivity.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getHoldedSession();

  if (!session?.tenantId || !session.userId) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesion para borrar este chat.' },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const existing = await prisma.isaakConversation.findFirst({
    where: {
      id,
      tenantId: session.tenantId,
      userId: session.userId,
      context: 'holded_free_dashboard',
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Chat no encontrado.' }, { status: 404 });
  }

  await prisma.isaakConversation.delete({
    where: { id },
  });

  return NextResponse.json({
    ok: true,
    deleted: true,
  });
}
