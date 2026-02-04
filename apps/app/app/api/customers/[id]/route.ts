import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';

/**
 * GET /api/customers/[id]
 * Get customer details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, tenantId },
      include: { invoices: { select: { id: true, number: true, issueDate: true, amountGross: true } } },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('GET /api/customers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/customers/[id]
 * Update customer
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, phone, nif, address, city, postalCode, country, paymentTerms, notes, isActive } = body;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(nif !== undefined && { nif }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(postalCode !== undefined && { postalCode }),
        ...(country !== undefined && { country }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('PATCH /api/customers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/customers/[id]
 * Delete customer
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });
    const tenantId = resolved.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant selected' }, { status: 400 });
    }

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id: params.id } });

    try {
      let actorUserId = session.uid;
      let impersonatedUserId: string | null = null;
      let supportSessionId: string | null = null;

      if (resolved.supportMode && resolved.supportSessionId) {
        const supportSession = await prisma.supportSession.findUnique({
          where: { id: resolved.supportSessionId },
          select: { adminId: true, userId: true },
        });
        if (supportSession) {
          actorUserId = supportSession.adminId;
          impersonatedUserId = supportSession.userId;
          supportSessionId = resolved.supportSessionId;
        }
      }

      await prisma.auditLog.create({
        data: {
          actorUserId,
          action: "COMPANY_VIEW",
          metadata: {
            action: "CUSTOMER.DELETE",
            tenantId,
            customerId: params.id,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/customers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
