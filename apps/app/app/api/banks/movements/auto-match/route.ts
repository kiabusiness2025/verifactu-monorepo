import { requireTenantContext } from '@/lib/api/tenantAuth';
import { getEffectiveReconciliationConfig } from '@/lib/banking/reconciliationConfig';
import { scoreReconciliation } from '@/lib/banking/reconcileScore';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    from?: string;
    to?: string;
    accountId?: string;
    limit?: number;
    dryRun?: boolean;
  };

  const parsedLimit = Number(body.limit ?? 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;
  const dryRun = body.dryRun !== false;

  const config = await getEffectiveReconciliationConfig(auth.tenantId);

  const movements = await prisma.seTransaction.findMany({
    where: {
      tenantId: auth.tenantId,
      duplicated: false,
      reconciledAt: null,
      ...(body.accountId ? { accountId: body.accountId } : {}),
      ...(body.from || body.to
        ? {
            madeOn: {
              ...(body.from ? { gte: body.from } : {}),
              ...(body.to ? { lte: body.to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ madeOn: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const results: Array<{
    movementId: string;
    score: number;
    reasons: string[];
    autoMatched: boolean;
    candidate: {
      expenseId: string;
      amount: number;
      date: Date;
      description: string;
      reference: string | null;
    } | null;
  }> = [];

  for (const movement of movements) {
    const movementDate = new Date(`${movement.madeOn}T00:00:00.000Z`);
    const movementAmount = Math.abs(Number(movement.amount));

    const maxAmountDelta = Math.max(config.amountToleranceEur * 3, 0.5);
    const minAmount = Math.max(0, movementAmount - maxAmountDelta);
    const maxAmount = movementAmount + maxAmountDelta;

    const candidates = await prisma.expenseRecord.findMany({
      where: {
        tenantId: auth.tenantId,
        amount: {
          gte: minAmount,
          lte: maxAmount,
        },
        date: {
          gte: addDays(movementDate, -(config.dateWindowDays + 14)),
          lte: addDays(movementDate, config.dateWindowDays + 14),
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        reference: true,
      },
    });

    let best: {
      expenseId: string;
      amount: number;
      date: Date;
      description: string;
      reference: string | null;
      score: number;
      reasons: string[];
      details: {
        amountDelta: number;
        dayDistance: number;
        textSimilarity: number;
      };
    } | null = null;

    for (const candidate of candidates) {
      const scored = scoreReconciliation({
        movementAmount,
        movementDate,
        movementText: [movement.description, movement.payee, movement.payer]
          .filter((value): value is string => Boolean(value && value.trim()))
          .join(' '),
        candidateAmount: Number(candidate.amount),
        candidateDate: candidate.date,
        candidateText: [candidate.description, candidate.reference]
          .filter((value): value is string => Boolean(value && value.trim()))
          .join(' '),
        amountToleranceEur: config.amountToleranceEur,
        dateWindowDays: config.dateWindowDays,
      });

      if (!best || scored.score > best.score) {
        best = {
          expenseId: candidate.id,
          amount: Number(candidate.amount),
          date: candidate.date,
          description: candidate.description,
          reference: candidate.reference,
          score: scored.score,
          reasons: scored.reasons,
          details: scored.details,
        };
      }
    }

    const shouldAutoMatch =
      Boolean(best) && config.autoMatchEnabled && (best?.score ?? 0) >= config.confidenceThreshold;

    if (shouldAutoMatch && !dryRun && best) {
      // Update movement to mark as reconciled
      await prisma.seTransaction.update({
        where: { id: movement.id },
        data: { reconciledAt: new Date() },
      });

      // Persist audit record with evidence
      await prisma.seTransactionMatchAudit.create({
        data: {
          tenantId: auth.tenantId,
          seTransactionId: movement.id,
          matchedExpenseId: best.expenseId,
          matchScore: best.score,
          scoreComponents: {
            amountScore: Math.min(
              0.55,
              Math.max(
                0,
                0.55 *
                  (1 - best.details.amountDelta / Math.max(config.amountToleranceEur, 0.01) / 3)
              )
            ),
            dateScore:
              best.details.dayDistance <= config.dateWindowDays
                ? 0.3 * (1 - best.details.dayDistance / (config.dateWindowDays + 1))
                : 0,
            textScore: 0.15 * best.details.textSimilarity,
            amountDelta: best.details.amountDelta,
            dayDistance: best.details.dayDistance,
            textSimilarity: best.details.textSimilarity,
          },
          evidenceReasons: best.reasons,
          autoMatched: true,
        },
      });
    } else if (best && !dryRun) {
      // Also persist for suggested matches (not auto-matched)
      await prisma.seTransactionMatchAudit.create({
        data: {
          tenantId: auth.tenantId,
          seTransactionId: movement.id,
          matchedExpenseId: best.expenseId,
          matchScore: best.score,
          scoreComponents: {
            amountScore: Math.min(
              0.55,
              Math.max(
                0,
                0.55 *
                  (1 - best.details.amountDelta / Math.max(config.amountToleranceEur, 0.01) / 3)
              )
            ),
            dateScore:
              best.details.dayDistance <= config.dateWindowDays
                ? 0.3 * (1 - best.details.dayDistance / (config.dateWindowDays + 1))
                : 0,
            textScore: 0.15 * best.details.textSimilarity,
            amountDelta: best.details.amountDelta,
            dayDistance: best.details.dayDistance,
            textSimilarity: best.details.textSimilarity,
          },
          evidenceReasons: best.reasons,
          autoMatched: false,
        },
      });
    }

    results.push({
      movementId: movement.id,
      score: best?.score ?? 0,
      reasons: best?.reasons ?? [],
      autoMatched: shouldAutoMatch,
      candidate: best
        ? {
            expenseId: best.expenseId,
            amount: best.amount,
            date: best.date,
            description: best.description,
            reference: best.reference,
          }
        : null,
    });
  }

  const autoMatchedCount = results.filter((item) => item.autoMatched).length;

  return NextResponse.json({
    ok: true,
    tenantId: auth.tenantId,
    dryRun,
    config,
    summary: {
      scanned: results.length,
      autoMatched: autoMatchedCount,
      suggestedOnly: results.length - autoMatchedCount,
    },
    results,
  });
}
