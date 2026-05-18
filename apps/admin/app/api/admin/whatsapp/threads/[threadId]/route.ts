import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type Params = { params: Promise<{ threadId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { threadId } = await params;

  const thread = await prisma.whatsAppThread.findUnique({
    where: { id: threadId },
    include: {
      tenant: { select: { id: true, name: true, nif: true } },
      assignedAgent: { select: { id: true, name: true, email: true } },
      events: {
        orderBy: { occurredAt: 'asc' },
        select: {
          id: true,
          direction: true,
          eventType: true,
          body: true,
          payload: true,
          occurredAt: true,
          status: true,
        },
      },
    },
  });

  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ thread });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin(req);

  const { threadId } = await params;
  const body = await req.json();

  const allowed = ['mode', 'status', 'assignedAgentId', 'language'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const thread = await prisma.whatsAppThread.update({
    where: { id: threadId },
    data,
    select: { id: true, mode: true, status: true, assignedAgentId: true, language: true },
  });

  return NextResponse.json({ thread });
}
