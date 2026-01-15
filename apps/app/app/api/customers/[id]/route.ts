import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';

/**
 * GET /api/customers/[id]
 * Get customer details
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionPayload();
    if (!session || !session.tenantId || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
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
    if (!session || !session.tenantId || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
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
    if (!session || !session.tenantId || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/customers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
