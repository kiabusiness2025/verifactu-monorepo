import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminContext } from '@/lib/auth';
import type { OrderStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'checkout_pending',
  'paid',
  'provisioning',
  'in_progress',
  'completed',
  'cancelled',
  'refunded',
];

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = statusParam ? { status: statusParam as OrderStatus } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true } },
          lines: {
            include: {
              catalogItem: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: `ORD-${o.id.slice(0, 8)}`,
        tenantName: o.tenant?.name || o.buyerName || 'N/A',
        status: o.status,
        totalAmount: o.totalAmount.toString(),
        itemCount: o.lines.length,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error: unknown) {
    console.error('[admin/orders] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { id, status } = body as { id?: string; status?: string };

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields: id, status' }, { status: 400 });
    }

    if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: status as OrderStatus },
      include: {
        tenant: { select: { id: true, name: true } },
        lines: { include: { catalogItem: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Order ${id} status updated to ${status}`,
      order: {
        id: order.id,
        status: order.status,
        updatedAt: order.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[admin/orders] PATCH error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
