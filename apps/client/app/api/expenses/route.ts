import { getSessionPayload } from '@/lib/session';
import { ensureTenantAccess } from '@/src/server/workspace';
import type { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';

interface CreateExpenseRequest {
  tenantId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  taxRate?: number;
  supplierId?: string;
  reference?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSessionPayload();

    if (!session?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as CreateExpenseRequest;

    // Validate required fields
    if (
      !body.tenantId ||
      !body.date ||
      !body.description ||
      !body.category ||
      body.amount === undefined ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the session user has access to the requested tenant (prevents IDOR)
    await ensureTenantAccess(session.uid, body.tenantId);

    const taxRate = Number.isFinite(body.taxRate) && body.taxRate! >= 0 ? body.taxRate! : 0.21;

    // Create expense
    const expense = await prisma.expenseRecord.create({
      data: {
        tenantId: body.tenantId,
        date: new Date(body.date),
        description: body.description,
        category: body.category,
        amount: body.amount as unknown as Decimal,
        taxRate: taxRate as unknown as Decimal,
        supplierId: body.supplierId,
        reference: body.reference,
        status: 'received',
      },
    });

    return NextResponse.json(
      {
        ok: true,
        expense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
