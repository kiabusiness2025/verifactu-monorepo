import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminContext } from '@/lib/auth';
import type { FulfillmentStatus, FulfillmentTaskStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_CASE_STATUSES: FulfillmentStatus[] = [
  'pending_intake',
  'awaiting_client',
  'scheduled',
  'in_execution',
  'blocked',
  'delivered',
  'closed',
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

    const where = statusParam ? { status: statusParam as FulfillmentStatus } : {};

    const [cases, total] = await Promise.all([
      prisma.fulfillmentCase.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              tenant: { select: { name: true } },
            },
          },
          tasks: {
            select: { id: true, title: true, status: true, assignedToUserId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.fulfillmentCase.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      cases: cases.map((c) => ({
        id: c.id,
        orderId: c.orderId,
        orderNumber: `ORD-${c.orderId.slice(0, 8)}`,
        tenantName: c.order?.tenant?.name || 'N/A',
        status: c.status,
        taskCount: c.tasks.length,
        assignedTaskCount: c.tasks.filter((t) => t.assignedToUserId).length,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error: unknown) {
    console.error('[admin/fulfillment] GET error:', error);
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
    const { id, status, taskId, taskStatus, assignedTo } = body as {
      id?: string;
      status?: string;
      taskId?: string;
      taskStatus?: string;
      assignedTo?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    if (status) {
      if (!VALID_CASE_STATUSES.includes(status as FulfillmentStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_CASE_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }

      const fulfillmentCase = await prisma.fulfillmentCase.update({
        where: { id },
        data: { status: status as FulfillmentStatus },
        include: { tasks: { select: { id: true, status: true } } },
      });

      return NextResponse.json({
        ok: true,
        message: `Case ${id} status updated to ${status}`,
        case: { id: fulfillmentCase.id, status: fulfillmentCase.status },
      });
    }

    if (taskId) {
      const task = await prisma.fulfillmentTask.update({
        where: { id: taskId },
        data: {
          assignedToUserId: assignedTo || null,
          ...(taskStatus ? { status: taskStatus as FulfillmentTaskStatus } : {}),
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Task ${taskId} assigned to ${assignedTo || 'unassigned'}`,
        task: { id: task.id, assignedToUserId: task.assignedToUserId, status: task.status },
      });
    }

    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[admin/fulfillment] PATCH error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
