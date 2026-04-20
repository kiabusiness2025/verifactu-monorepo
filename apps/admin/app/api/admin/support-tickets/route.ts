import { NextResponse } from 'next/server';
import { SupportChannelType, SupportTicketStatus } from '@verifactu/db';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const SUPPORTED_STATUSES = new Set(Object.values(SupportTicketStatus));
const SUPPORTED_CHANNELS = new Set(Object.values(SupportChannelType));

export async function GET(request: Request) {
  await requireAdmin(request);

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get('status')?.trim() || null;
  const rawChannel = searchParams.get('channel')?.trim() || null;
  const rawLimit = Number(searchParams.get('limit') || 100);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 250) : 100;

  const where = {
    ...(rawStatus && SUPPORTED_STATUSES.has(rawStatus as SupportTicketStatus)
      ? { status: rawStatus as SupportTicketStatus }
      : {}),
    ...(rawChannel && SUPPORTED_CHANNELS.has(rawChannel as SupportChannelType)
      ? { channelType: rawChannel as SupportChannelType }
      : {}),
  };

  const items = await prisma.supportTicket.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      status: true,
      priority: true,
      subject: true,
      description: true,
      channelType: true,
      lastMessageAt: true,
      resolvedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      metadataJson: true,
      tenant: {
        select: { id: true, name: true, legalName: true, nif: true },
      },
      openedByUser: {
        select: { id: true, email: true, name: true },
      },
      assignedToUser: {
        select: { id: true, email: true, name: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          body: true,
          direction: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ items });
}
