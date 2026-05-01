import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminContext } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/fulfillment
 * List FulfillmentCase with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status } : {};

    const [cases, total] = await Promise.all([
      prisma.fulfillmentCase.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              tenant: { select: { name: true } },
            },
          },
          tasks: {
            select: { id: true, title: true, status: true, assignedTo: true },
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
        orderNumber: c.order?.orderNumber || `ORD-${c.orderId.slice(0, 8)}`,
        tenantName: c.order?.tenant?.name || 'N/A',
        status: c.status,
        priority: c.priority,
        taskCount: c.tasks.length,
        assignedTaskCount: c.tasks.filter((t) => t.assignedTo).length,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error: any) {
    console.error('[admin/fulfillment] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/fulfillment/[id]
 * Update FulfillmentCase status or assign task
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminContext(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, taskId, taskStatus, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // If updating case status
    if (status) {
      const validStatuses = ['pending', 'assigned', 'in-progress', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      const fulfillmentCase = await prisma.fulfillmentCase.update({
        where: { id },
        data: { status, updatedAt: new Date() },
        include: { tasks: { select: { id: true, status: true } } },
      });

      return NextResponse.json({
        ok: true,
        message: `Case ${id} status updated to ${status}`,
        case: { id: fulfillmentCase.id, status: fulfillmentCase.status },
      });
    }

    // If updating task assignment
    if (taskId) {
      const validTaskStatuses = ['pending', 'assigned', 'in-progress', 'completed', 'failed'];
      if (taskStatus && !validTaskStatuses.includes(taskStatus)) {
        return NextResponse.json(
          { error: `Invalid task status. Must be one of: ${validTaskStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      const task = await prisma.fulfillmentTask.update({
        where: { id: taskId },
        data: {
          assignedTo: assignedTo || undefined,
          status: taskStatus || (assignedTo ? 'assigned' : 'pending'),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Task ${taskId} assigned to ${assignedTo || 'unassigned'}`,
        task: { id: task.id, assignedTo: task.assignedTo, status: task.status },
      });
    }

    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin/fulfillment] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
