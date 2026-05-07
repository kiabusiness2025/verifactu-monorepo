import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/banks/movements/audit?movementId=<id>
 * Retrieves audit trail for a specific movement's matches
 */
export async function GET(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const movementId = request.nextUrl.searchParams.get('movementId');
  if (!movementId) {
    return NextResponse.json({ error: 'movementId query parameter is required' }, { status: 400 });
  }

  // Verify movement belongs to tenant
  const movement = await prisma.seTransaction.findUnique({
    where: { id: movementId },
    select: {
      id: true,
      tenantId: true,
      accountId: true,
      madeOn: true,
      amount: true,
      description: true,
      payee: true,
      payer: true,
    },
  });

  if (!movement || movement.tenantId !== auth.tenantId) {
    return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
  }

  // Get all audit records for this movement
  const audits = await prisma.seTransactionMatchAudit.findMany({
    where: {
      tenantId: auth.tenantId,
      seTransactionId: movementId,
    },
    select: {
      id: true,
      matchScore: true,
      scoreComponents: true,
      evidenceReasons: true,
      autoMatched: true,
      createdAt: true,
      matchedExpense: {
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          reference: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    tenantId: auth.tenantId,
    movement: {
      id: movement.id,
      madeOn: movement.madeOn,
      amount: movement.amount,
      description: movement.description,
      payee: movement.payee,
      payer: movement.payer,
    },
    audits: audits.map((audit) => ({
      id: audit.id,
      matchScore: audit.matchScore,
      scoreComponents: audit.scoreComponents,
      evidenceReasons: audit.evidenceReasons,
      autoMatched: audit.autoMatched,
      createdAt: audit.createdAt,
      matchedExpense: audit.matchedExpense
        ? {
            id: audit.matchedExpense.id,
            amount: audit.matchedExpense.amount,
            date: audit.matchedExpense.date,
            description: audit.matchedExpense.description,
            reference: audit.matchedExpense.reference,
            category: audit.matchedExpense.category,
          }
        : null,
    })),
  });
}
