import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(parsed, 1), 100);
}

const ORDER_STATUSES = new Set(Object.values(OrderStatus));

export async function GET(request: NextRequest) {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'orders-list' },
  });

  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get('status')?.trim() || null;
  const status =
    rawStatus && ORDER_STATUSES.has(rawStatus as OrderStatus) ? (rawStatus as OrderStatus) : null;
  const limit = parseLimit(searchParams.get('limit'));

  const items = await prisma.order.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      buyerName: true,
      buyerEmail: true,
      sourceChannel: true,
      currency: true,
      subtotalAmount: true,
      taxAmount: true,
      totalAmount: true,
      paidAt: true,
      provisionedAt: true,
      createdAt: true,
      updatedAt: true,
      lines: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          quantity: true,
          unitAmount: true,
          taxAmount: true,
          totalAmount: true,
          catalogItem: {
            select: {
              id: true,
              slug: true,
              itemType: true,
              name: true,
            },
          },
          catalogPrice: {
            select: {
              id: true,
              code: true,
              name: true,
              billingCadence: true,
            },
          },
        },
      },
      fulfillmentCases: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          caseType: true,
          title: true,
          status: true,
          scheduledFor: true,
          deliveredAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    items,
    tenantId: auth.tenantId,
  });
}
