import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/articles/[id]
 * Get article details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const article = await prisma.article.findFirst({
      where: { id: id, tenantId },
      include: { invoiceLines: { select: { id: true, invoiceId: true, quantity: true, unitPrice: true } } },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('GET /api/articles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/articles/[id]
 * Update article
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const existing = await prisma.article.findFirst({
      where: { id: id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, description, category, unitPrice, taxRate, accountCode, unit, stock, notes, isActive } = body;

    // Check for duplicate code if code is being changed
    if (code && code !== existing.code) {
      const duplicate = await prisma.article.findFirst({
        where: { tenantId, code },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Article code already exists' }, { status: 409 });
      }
    }

    const article = await prisma.article.update({
      where: { id: id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(unitPrice !== undefined && { unitPrice: parseFloat(unitPrice) }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) }),
        ...(accountCode !== undefined && { accountCode }),
        ...(unit !== undefined && { unit }),
        ...(stock !== undefined && { stock: stock ? parseInt(stock) : null }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error('PATCH /api/articles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/articles/[id]
 * Delete article
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const existing = await prisma.article.findFirst({
      where: { id: id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await prisma.article.delete({ where: { id: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/articles/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
