import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { SupportChannelType, SupportMessageDirection, SupportTicketStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(parsed, 1), 100);
}

const SUPPORT_TICKET_STATUSES = new Set(Object.values(SupportTicketStatus));

async function validateLinkedResources(input: {
  tenantId: string;
  orderId?: string | null;
  fulfillmentCaseId?: string | null;
  connectionId?: string | null;
}) {
  const [order, fulfillmentCase, connection] = await Promise.all([
    input.orderId
      ? prisma.order.findFirst({
          where: { id: input.orderId, tenantId: input.tenantId },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.fulfillmentCaseId
      ? prisma.fulfillmentCase.findFirst({
          where: { id: input.fulfillmentCaseId, tenantId: input.tenantId },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.connectionId
      ? prisma.externalConnection.findFirst({
          where: { id: input.connectionId, tenantId: input.tenantId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (input.orderId && !order) return 'orderId no pertenece al tenant activo';
  if (input.fulfillmentCaseId && !fulfillmentCase) {
    return 'fulfillmentCaseId no pertenece al tenant activo';
  }
  if (input.connectionId && !connection) {
    return 'connectionId no pertenece al tenant activo';
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'support-ticket-list' },
  });

  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get('status')?.trim() || null;
  const status =
    rawStatus && SUPPORT_TICKET_STATUSES.has(rawStatus as SupportTicketStatus)
      ? (rawStatus as SupportTicketStatus)
      : null;
  const limit = parseLimit(searchParams.get('limit'));

  const items = await prisma.supportTicket.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      status: true,
      priority: true,
      subject: true,
      channelType: true,
      orderId: true,
      fulfillmentCaseId: true,
      connectionId: true,
      lastMessageAt: true,
      resolvedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          direction: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    items,
    tenantId: auth.tenantId,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'support-ticket-create' },
  });

  if ('error' in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const priority = typeof body?.priority === 'string' ? body.priority.trim() || 'normal' : 'normal';
  const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() || null : null;
  const fulfillmentCaseId =
    typeof body?.fulfillmentCaseId === 'string' ? body.fulfillmentCaseId.trim() || null : null;
  const connectionId =
    typeof body?.connectionId === 'string' ? body.connectionId.trim() || null : null;

  if (!subject) {
    return NextResponse.json({ ok: false, error: 'subject es obligatorio' }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ ok: false, error: 'description es obligatorio' }, { status: 400 });
  }

  const linkError = await validateLinkedResources({
    tenantId: auth.tenantId,
    orderId,
    fulfillmentCaseId,
    connectionId,
  });

  if (linkError) {
    return NextResponse.json({ ok: false, error: linkError }, { status: 400 });
  }

  const openedByUserId = auth.resolvedUserId ?? null;

  const ticket = await prisma.$transaction(async (transaction) => {
    const createdTicket = await transaction.supportTicket.create({
      data: {
        tenantId: auth.tenantId,
        orderId,
        fulfillmentCaseId,
        connectionId,
        openedByUserId,
        channelType: SupportChannelType.dashboard,
        priority,
        subject,
        description,
        lastMessageAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        priority: true,
        subject: true,
        channelType: true,
        orderId: true,
        fulfillmentCaseId: true,
        connectionId: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await transaction.supportMessage.create({
      data: {
        ticketId: createdTicket.id,
        tenantId: auth.tenantId,
        userId: openedByUserId,
        direction: SupportMessageDirection.inbound,
        channelType: SupportChannelType.dashboard,
        body: description,
      },
    });

    return createdTicket;
  });

  return NextResponse.json({
    ok: true,
    ticket,
  });
}
