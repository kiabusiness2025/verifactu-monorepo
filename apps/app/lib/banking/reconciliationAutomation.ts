import { getEffectiveReconciliationConfig } from '@/lib/banking/reconciliationConfig';
import { scoreReconciliation } from '@/lib/banking/reconcileScore';
import prisma from '@/lib/prisma';

type MatchCandidate = {
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
};

export type TenantReconciliationResult = {
  tenantId: string;
  dryRun: boolean;
  config: Awaited<ReturnType<typeof getEffectiveReconciliationConfig>>;
  summary: {
    scanned: number;
    autoMatched: number;
    suggestedOnly: number;
  };
  results: Array<{
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
  }>;
};

export type GlobalReconciliationRunResult = {
  tenantCount: number;
  scanned: number;
  autoMatched: number;
  suggestedOnly: number;
  alertsCreated: number;
  tenantResults: Array<{
    tenantId: string;
    scanned: number;
    autoMatched: number;
    suggestedOnly: number;
    alertCreated: boolean;
    alertReason?: string;
  }>;
  errors: Array<{ tenantId: string; error: string }>;
};

export type ReconciliationMetrics = {
  generatedAt: string;
  scope: 'tenant' | 'global';
  tenantId?: string;
  volumes: {
    totalTransactions: number;
    totalUnreconciled: number;
    staleUnreconciled7d: number;
    unreconciledWithoutAudit: number;
  };
  matching: {
    autoMatched30d: number;
    suggested30d: number;
    totalAudits30d: number;
    autoMatchRatio: number;
    avgScore30d: number;
  };
  health: {
    unresolvedRiskRatio: number;
    estimatedErrors: number;
  };
};

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateOnlyIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function scoreBreakdown(
  details: MatchCandidate['details'],
  amountToleranceEur: number,
  dateWindowDays: number
) {
  return {
    amountScore: Math.min(
      0.55,
      Math.max(0, 0.55 * (1 - details.amountDelta / Math.max(amountToleranceEur, 0.01) / 3))
    ),
    dateScore:
      details.dayDistance <= dateWindowDays
        ? 0.3 * (1 - details.dayDistance / (dateWindowDays + 1))
        : 0,
    textScore: 0.15 * details.textSimilarity,
    amountDelta: details.amountDelta,
    dayDistance: details.dayDistance,
    textSimilarity: details.textSimilarity,
  };
}

async function findBestCandidate(input: {
  tenantId: string;
  movementAmount: number;
  movementDate: Date;
  movementText: string;
  amountToleranceEur: number;
  dateWindowDays: number;
}) {
  const maxAmountDelta = Math.max(input.amountToleranceEur * 3, 0.5);
  const minAmount = Math.max(0, input.movementAmount - maxAmountDelta);
  const maxAmount = input.movementAmount + maxAmountDelta;

  const candidates = await prisma.expenseRecord.findMany({
    where: {
      tenantId: input.tenantId,
      amount: {
        gte: minAmount,
        lte: maxAmount,
      },
      date: {
        gte: addDays(input.movementDate, -(input.dateWindowDays + 14)),
        lte: addDays(input.movementDate, input.dateWindowDays + 14),
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

  let best: MatchCandidate | null = null;

  for (const candidate of candidates) {
    const scored = scoreReconciliation({
      movementAmount: input.movementAmount,
      movementDate: input.movementDate,
      movementText: input.movementText,
      candidateAmount: Number(candidate.amount),
      candidateDate: candidate.date,
      candidateText: [candidate.description, candidate.reference]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(' '),
      amountToleranceEur: input.amountToleranceEur,
      dateWindowDays: input.dateWindowDays,
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

  return best;
}

export async function runTenantReconciliationAutoMatch(input: {
  tenantId: string;
  from?: string;
  to?: string;
  accountId?: string;
  limit?: number;
  dryRun?: boolean;
  persistSuggestions?: boolean;
}): Promise<TenantReconciliationResult> {
  const parsedLimit = Number(input.limit ?? 50);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 200)) : 50;
  const dryRun = input.dryRun !== false;
  const persistSuggestions = input.persistSuggestions !== false;

  const config = await getEffectiveReconciliationConfig(input.tenantId);

  const movements = await prisma.seTransaction.findMany({
    where: {
      tenantId: input.tenantId,
      duplicated: false,
      reconciledAt: null,
      ...(input.accountId ? { accountId: input.accountId } : {}),
      ...(input.from || input.to
        ? {
            madeOn: {
              ...(input.from ? { gte: input.from } : {}),
              ...(input.to ? { lte: input.to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ madeOn: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  const results: TenantReconciliationResult['results'] = [];

  for (const movement of movements) {
    const movementDate = new Date(`${movement.madeOn}T00:00:00.000Z`);
    const movementAmount = Math.abs(Number(movement.amount));

    const best = await findBestCandidate({
      tenantId: input.tenantId,
      movementAmount,
      movementDate,
      movementText: [movement.description, movement.payee, movement.payer]
        .filter((value): value is string => Boolean(value && value.trim()))
        .join(' '),
      amountToleranceEur: config.amountToleranceEur,
      dateWindowDays: config.dateWindowDays,
    });

    const shouldAutoMatch =
      Boolean(best) && config.autoMatchEnabled && (best?.score ?? 0) >= config.confidenceThreshold;

    if (shouldAutoMatch && !dryRun && best) {
      await prisma.seTransaction.update({
        where: { id: movement.id },
        data: { reconciledAt: new Date() },
      });

      await prisma.seTransactionMatchAudit.create({
        data: {
          tenantId: input.tenantId,
          seTransactionId: movement.id,
          matchedExpenseId: best.expenseId,
          matchScore: best.score,
          scoreComponents: scoreBreakdown(
            best.details,
            config.amountToleranceEur,
            config.dateWindowDays
          ),
          evidenceReasons: best.reasons,
          autoMatched: true,
        },
      });
    } else if (best && !dryRun && persistSuggestions) {
      await prisma.seTransactionMatchAudit.create({
        data: {
          tenantId: input.tenantId,
          seTransactionId: movement.id,
          matchedExpenseId: best.expenseId,
          matchScore: best.score,
          scoreComponents: scoreBreakdown(
            best.details,
            config.amountToleranceEur,
            config.dateWindowDays
          ),
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

  return {
    tenantId: input.tenantId,
    dryRun,
    config,
    summary: {
      scanned: results.length,
      autoMatched: autoMatchedCount,
      suggestedOnly: results.length - autoMatchedCount,
    },
    results,
  };
}

export async function createUnreconciledAlertIfNeeded(input: {
  tenantId: string;
  alertDays?: number;
  minUnmatchedForAlert?: number;
}) {
  const alertDays = Math.max(1, Math.min(30, Number(input.alertDays ?? 7)));
  const minUnmatchedForAlert = Math.max(1, Math.min(1000, Number(input.minUnmatchedForAlert ?? 5)));
  const staleBefore = toDateOnlyIso(addDays(new Date(), -alertDays));

  const staleCount = await prisma.seTransaction.count({
    where: {
      tenantId: input.tenantId,
      duplicated: false,
      reconciledAt: null,
      madeOn: { lte: staleBefore },
    },
  });

  if (staleCount < minUnmatchedForAlert) {
    return { created: false, reason: 'threshold_not_met', staleCount } as const;
  }

  const recentExisting = await prisma.isaakAlert.findFirst({
    where: {
      tenantId: input.tenantId,
      type: 'bank_reconciliation_unmatched',
      status: { in: ['pending', 'sent'] },
      createdAt: { gte: addDays(new Date(), -1) },
    },
    select: { id: true },
  });

  if (recentExisting) {
    return { created: false, reason: 'recent_alert_exists', staleCount } as const;
  }

  const oldest = await prisma.seTransaction.findFirst({
    where: {
      tenantId: input.tenantId,
      duplicated: false,
      reconciledAt: null,
      madeOn: { lte: staleBefore },
    },
    orderBy: { madeOn: 'asc' },
    select: { madeOn: true },
  });

  const created = await prisma.isaakAlert.create({
    data: {
      tenantId: input.tenantId,
      type: 'bank_reconciliation_unmatched',
      title: 'Movimientos bancarios pendientes de conciliacion',
      body: `Tienes ${staleCount} movimientos pendientes con mas de ${alertDays} dias. Revisa la bandeja de conciliacion para evitar desajustes.`,
      dueDate: addDays(new Date(), 1),
      channel: 'in_app',
      status: 'pending',
      metadata: {
        staleCount,
        thresholdDays: alertDays,
        oldestMovementDate: oldest?.madeOn ?? null,
      },
    },
    select: { id: true },
  });

  return { created: true, alertId: created.id, staleCount } as const;
}

export async function runGlobalReconciliationReevaluation(input?: {
  limitPerTenant?: number;
  maxTenants?: number;
  alertDays?: number;
  minUnmatchedForAlert?: number;
}): Promise<GlobalReconciliationRunResult> {
  const limitPerTenant = Math.max(1, Math.min(200, Number(input?.limitPerTenant ?? 100)));
  const maxTenants = Math.max(1, Math.min(200, Number(input?.maxTenants ?? 50)));

  const tenantRows = await prisma.seTransaction.findMany({
    where: {
      duplicated: false,
      reconciledAt: null,
    },
    select: { tenantId: true },
    distinct: ['tenantId'],
    take: maxTenants,
    orderBy: { tenantId: 'asc' },
  });

  const tenantResults: GlobalReconciliationRunResult['tenantResults'] = [];
  const errors: GlobalReconciliationRunResult['errors'] = [];

  let scanned = 0;
  let autoMatched = 0;
  let suggestedOnly = 0;
  let alertsCreated = 0;

  for (const tenant of tenantRows) {
    try {
      const run = await runTenantReconciliationAutoMatch({
        tenantId: tenant.tenantId,
        limit: limitPerTenant,
        dryRun: false,
        persistSuggestions: true,
      });

      const alert = await createUnreconciledAlertIfNeeded({
        tenantId: tenant.tenantId,
        alertDays: input?.alertDays,
        minUnmatchedForAlert: input?.minUnmatchedForAlert,
      });

      if (alert.created) {
        alertsCreated += 1;
      }

      scanned += run.summary.scanned;
      autoMatched += run.summary.autoMatched;
      suggestedOnly += run.summary.suggestedOnly;

      tenantResults.push({
        tenantId: tenant.tenantId,
        scanned: run.summary.scanned,
        autoMatched: run.summary.autoMatched,
        suggestedOnly: run.summary.suggestedOnly,
        alertCreated: alert.created,
        alertReason: alert.created ? undefined : alert.reason,
      });
    } catch (error) {
      errors.push({
        tenantId: tenant.tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    tenantCount: tenantRows.length,
    scanned,
    autoMatched,
    suggestedOnly,
    alertsCreated,
    tenantResults,
    errors,
  };
}

export async function getReconciliationMetrics(input?: {
  tenantId?: string;
}): Promise<ReconciliationMetrics> {
  const now = new Date();
  const from30d = addDays(now, -30);
  const staleBefore = toDateOnlyIso(addDays(now, -7));

  const txWhere = input?.tenantId ? { tenantId: input.tenantId } : {};
  const auditWhere = input?.tenantId ? { tenantId: input.tenantId } : {};

  const [
    totalTransactions,
    totalUnreconciled,
    staleUnreconciled7d,
    unreconciledWithoutAudit,
    autoMatched30d,
    suggested30d,
    avgScore30d,
  ] = await Promise.all([
    prisma.seTransaction.count({ where: txWhere }),
    prisma.seTransaction.count({ where: { ...txWhere, duplicated: false, reconciledAt: null } }),
    prisma.seTransaction.count({
      where: {
        ...txWhere,
        duplicated: false,
        reconciledAt: null,
        madeOn: { lte: staleBefore },
      },
    }),
    prisma.seTransaction.count({
      where: {
        ...txWhere,
        duplicated: false,
        reconciledAt: null,
        matchAudits: { none: {} },
      },
    }),
    prisma.seTransactionMatchAudit.count({
      where: { ...auditWhere, autoMatched: true, createdAt: { gte: from30d } },
    }),
    prisma.seTransactionMatchAudit.count({
      where: { ...auditWhere, autoMatched: false, createdAt: { gte: from30d } },
    }),
    prisma.seTransactionMatchAudit.aggregate({
      where: { ...auditWhere, createdAt: { gte: from30d } },
      _avg: { matchScore: true },
    }),
  ]);

  const totalAudits30d = autoMatched30d + suggested30d;
  const autoMatchRatio = totalAudits30d > 0 ? autoMatched30d / totalAudits30d : 0;
  const unresolvedRiskRatio =
    totalUnreconciled > 0 ? unreconciledWithoutAudit / totalUnreconciled : 0;

  return {
    generatedAt: now.toISOString(),
    scope: input?.tenantId ? 'tenant' : 'global',
    tenantId: input?.tenantId,
    volumes: {
      totalTransactions,
      totalUnreconciled,
      staleUnreconciled7d,
      unreconciledWithoutAudit,
    },
    matching: {
      autoMatched30d,
      suggested30d,
      totalAudits30d,
      autoMatchRatio,
      avgScore30d: Number(avgScore30d._avg.matchScore ?? 0),
    },
    health: {
      unresolvedRiskRatio,
      estimatedErrors: unreconciledWithoutAudit,
    },
  };
}
