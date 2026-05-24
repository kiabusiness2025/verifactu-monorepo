/**
 * POST /api/isaak/banking/reconcile
 *   → Ejecuta conciliación bancaria para el tenant autenticado.
 *     Devuelve { matched, skipped, total }.
 *
 * GET /api/isaak/banking/reconcile
 *   → Devuelve estadísticas + sugerencias pendientes (hasta 20 transacciones)
 *     + matches auto-aplicados recientes (últimos 30 días).
 *
 * POST /api/isaak/banking/reconcile  { action: 'confirm', txId, expenseId }
 *   → Confirma manualmente un match.
 *
 * POST /api/isaak/banking/reconcile  { action: 'dismiss', txId }
 *   → Descarta la transacción (marca como conciliada sin gasto asociado).
 *
 * POST /api/isaak/banking/reconcile  { action: 'undo', txId }
 *   → Deshace un match (falso positivo del auto-apply).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import {
  AUTO_APPLY_THRESHOLD,
  reconcileTenant,
  loadPendingSuggestions,
  loadRecentAutoMatched,
  confirmMatch,
  undoMatch,
} from '@/app/lib/bank-reconciliation';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }
  const { tenantId } = session;

  const [totalTx, reconciledTx, suggestions, autoMatched] = await Promise.all([
    prisma.seTransaction.count({
      where: { tenantId, amount: { lt: 0 }, duplicated: false, status: 'posted' },
    }),
    prisma.seTransaction.count({
      where: { tenantId, amount: { lt: 0 }, duplicated: false, reconciledAt: { not: null } },
    }),
    loadPendingSuggestions(tenantId, 20),
    loadRecentAutoMatched(tenantId, 20),
  ]);

  return NextResponse.json({
    stats: {
      total: totalTx,
      reconciled: reconciledTx,
      pending: totalTx - reconciledTx,
      autoApplyThreshold: AUTO_APPLY_THRESHOLD,
    },
    suggestions: suggestions.map(({ tx, candidates }) => ({
      tx: {
        id: tx.id,
        amount: Number(tx.amount),
        madeOn: tx.madeOn,
        description: tx.description,
        payee: tx.payee,
        category: tx.category,
      },
      candidates: candidates.map((c) => ({
        expenseId: c.expenseId,
        score: Math.round(c.score * 100),
        evidenceReasons: c.evidenceReasons,
        scoreComponents: c.scoreComponents,
      })),
    })),
    autoMatched: autoMatched.map((m) => ({
      txId: m.txId,
      txAmount: m.txAmount,
      txMadeOn: m.txMadeOn,
      txDescription: m.txDescription,
      expenseId: m.expenseId,
      expenseDescription: m.expenseDescription,
      expenseSupplier: m.expenseSupplier,
      scorePercent: Math.round(m.matchScore * 100),
      matchedAt: m.matchedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  }
  const { tenantId } = session;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    txId?: string;
    expenseId?: string;
  };

  if (body.action === 'confirm') {
    if (!body.txId || !body.expenseId) {
      return NextResponse.json({ error: 'txId y expenseId requeridos.' }, { status: 400 });
    }
    // Verify ownership
    const tx = await prisma.seTransaction.findFirst({ where: { id: body.txId, tenantId } });
    if (!tx) return NextResponse.json({ error: 'Transacción no encontrada.' }, { status: 404 });
    const expense = await prisma.expenseRecord.findFirst({
      where: { id: body.expenseId, tenantId },
    });
    if (!expense) return NextResponse.json({ error: 'Gasto no encontrado.' }, { status: 404 });

    await confirmMatch(tenantId, body.txId, body.expenseId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'dismiss') {
    if (!body.txId) return NextResponse.json({ error: 'txId requerido.' }, { status: 400 });
    const tx = await prisma.seTransaction.findFirst({ where: { id: body.txId, tenantId } });
    if (!tx) return NextResponse.json({ error: 'Transacción no encontrada.' }, { status: 404 });
    await prisma.seTransaction.update({
      where: { id: body.txId },
      data: { reconciledAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'undo') {
    if (!body.txId) return NextResponse.json({ error: 'txId requerido.' }, { status: 400 });
    const tx = await prisma.seTransaction.findFirst({ where: { id: body.txId, tenantId } });
    if (!tx) return NextResponse.json({ error: 'Transacción no encontrada.' }, { status: 404 });
    await undoMatch(tenantId, body.txId);
    return NextResponse.json({ ok: true });
  }

  // Default: run full reconciliation
  const result = await reconcileTenant(tenantId);
  return NextResponse.json(result);
}
