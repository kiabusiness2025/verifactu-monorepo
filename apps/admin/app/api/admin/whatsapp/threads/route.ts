import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { WhatsAppThreadStatus } from '@verifactu/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const mode = searchParams.get('mode') || undefined;
  const phone = searchParams.get('phone')?.trim() || undefined;
  const cursor = searchParams.get('cursor') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  const validStatuses = Object.values(WhatsAppThreadStatus);
  const where = {
    ...(status && validStatuses.includes(status as WhatsAppThreadStatus)
      ? { status: status as WhatsAppThreadStatus }
      : {}),
    ...(mode ? { mode } : {}),
    ...(phone ? { phoneNumber: { contains: phone } } : {}),
  };

  const items = await prisma.whatsAppThread.findMany({
    where,
    orderBy: { lastMessageAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      mode: true,
      language: true,
      lastMessageAt: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
      assignedAgent: { select: { id: true, name: true, email: true } },
      events: {
        orderBy: { occurredAt: 'desc' },
        take: 1,
        select: { id: true, body: true, direction: true, occurredAt: true },
      },
    },
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return NextResponse.json({ items: data, nextCursor });
}
