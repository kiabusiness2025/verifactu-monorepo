import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { normalizeCanonicalExpense } from '@/lib/expenses/canonical';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/expenses
 * List all expenses for the authenticated tenant
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (fromDate && toDate) {
      where.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      };
    }

    const [expenses, total] = await Promise.all([
      prisma.expenseRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { supplier: { select: { id: true, name: true } } },
      }),
      prisma.expenseRecord.count({ where }),
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    let expenseInput;
    try {
      expenseInput = normalizeCanonicalExpense({
        tenantId,
        date: body?.date,
        description: body?.description,
        amount: Number(body?.amount),
        taxRate: body?.taxRate ? Number(body?.taxRate) : undefined,
        categoryId: body?.categoryId ? Number(body?.categoryId) : undefined,
        reference: body?.reference,
        notes: body?.notes,
        source: body?.source,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Falta información del gasto' },
        { status: 400 }
      );
    }

    if (expenseInput.source !== 'isaak' || !expenseInput.categoryId) {
      return NextResponse.json({ error: 'Para registrar un gasto, usa Isaak' }, { status: 400 });
    }

    // Verify supplier ownership if provided
    if (body?.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: body.supplierId, tenantId },
      });
      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      }
    }

    const categories = await prisma.$queryRaw<{ name: string; is_deductible: boolean }[]>`
      SELECT name, is_deductible
      FROM expense_categories
      WHERE id = ${expenseInput.categoryId}
      LIMIT 1
    `;

    if (!categories.length) {
      return NextResponse.json({ error: 'Categoría no válida' }, { status: 400 });
    }

    const categoryName = categories[0].name;
    const isDeductible = categories[0].is_deductible;
    const noteParts = [
      expenseInput.notes,
      `Deducible:${isDeductible ? 'sí' : 'no'}`,
      `Origen:${expenseInput.source}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const expense = await prisma.expenseRecord.create({
      data: {
        tenantId,
        date: new Date(expenseInput.date),
        description: expenseInput.description,
        category: categoryName,
        amount: expenseInput.amount,
        taxRate: expenseInput.taxRate,
        supplierId: body?.supplierId || null,
        accountCode: body?.accountCode || null,
        reference: expenseInput.reference || null,
        notes: noteParts || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

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
          action: 'COMPANY_VIEW',
          metadata: {
            action: 'EXPENSE.CREATE',
            tenantId,
            expenseId: expense.id,
            supportMode: resolved.supportMode,
            supportSessionId,
            impersonatedUserId,
          },
        },
      });
    } catch {
      // Audit logging should not block the request.
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
