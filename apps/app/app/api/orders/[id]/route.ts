import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireTenantContext({
    channelType: 'dashboard',
    metadata: { source: 'order-detail' },
  });

  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;

  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      tenantId: auth.tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      status: true,
      buyerName: true,
      buyerEmail: true,
      buyerPhone: true,
      sourceChannel: true,
      currency: true,
      subtotalAmount: true,
      taxAmount: true,
      totalAmount: true,
      stripeCheckoutSessionId: true,
      stripePaymentIntentId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      paidAt: true,
      provisionedAt: true,
      cancelledAt: true,
      refundedAt: true,
      metadataJson: true,
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
          metadataJson: true,
          catalogItem: {
            select: {
              id: true,
              slug: true,
              itemType: true,
              name: true,
              summary: true,
            },
          },
          catalogPrice: {
            select: {
              id: true,
              code: true,
              name: true,
              currency: true,
              unitAmount: true,
              billingCadence: true,
              intervalCount: true,
              trialDays: true,
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
          description: true,
          status: true,
          blockedReason: true,
          scheduledFor: true,
          startedAt: true,
          deliveredAt: true,
          closedAt: true,
          metadataJson: true,
          updatedAt: true,
          tasks: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              sortOrder: true,
              dueAt: true,
              completedAt: true,
            },
          },
        },
      },
      supportTickets: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          priority: true,
          subject: true,
          channelType: true,
          lastMessageAt: true,
          resolvedAt: true,
          closedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}
