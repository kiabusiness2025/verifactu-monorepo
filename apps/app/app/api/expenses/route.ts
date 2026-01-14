import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/expenses
 * List all expenses for the authenticated tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id || !session?.tenant?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';

    const skip = (page - 1) * limit;

    const where: any = { tenantId: session.tenantId };
    
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
    const session = await getSession();
    if (!session?.user?.id || !session?.tenant?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, description, category, amount, taxRate, supplierId, accountCode, reference, notes } = body;

    if (!date || !description || !category || !amount) {
      return NextResponse.json(
        { error: 'Date, description, category, and amount are required' },
        { status: 400 }
      );
    }

    // Verify supplier ownership if provided
    if (supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: supplierId, tenantId: session.tenantId },
      });
      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      }
    }

    const expense = await prisma.expenseRecord.create({
      data: {
        tenantId: session.tenantId,
        date: new Date(date),
        description,
        category,
        amount: parseFloat(amount),
        taxRate: parseFloat(taxRate) || 0.21,
        supplierId: supplierId || null,
        accountCode: accountCode || null,
        reference: reference || null,
        notes: notes || null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
