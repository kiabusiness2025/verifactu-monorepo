/**
 * Motor de conciliación bancaria: empareja SeTransaction (movimientos Salt Edge)
 * con ExpenseRecord (gastos de Holded/OCR).
 *
 * Solo procesa transacciones NEGATIVAS (débitos/gastos).
 * El importe del banco es `|tx.amount|`; el del gasto puede ser neto (`expense.amount`)
 * o bruto (`expense.amount × (1 + expense.taxRate)`). Se prueba ambos y se toma el mejor.
 *
 * Score final = amountScore×0.40 + dateScore×0.35 + textScore×0.25
 *
 * Tiers:
 *   - score ≥ AUTO_APPLY_THRESHOLD (0.95): auto-aplicado silenciosamente, marcado reconciliado
 *   - SUGGEST_THRESHOLD (0.50) ≤ score < AUTO_APPLY_THRESHOLD: audit creado, requiere confirmación humana
 *   - score < SUGGEST_THRESHOLD: descartado
 */

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export const AUTO_APPLY_THRESHOLD = 0.95;
export const SUGGEST_THRESHOLD = 0.5;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ScoreComponents = {
  amountScore: number;
  dateScore: number;
  textScore: number;
  amountMatch: 'gross' | 'net' | 'none';
  dateMatch: number; // días de diferencia
  textSimilarity: number; // Jaccard 0-1
};

export type MatchCandidate = {
  expenseId: string;
  score: number;
  scoreComponents: ScoreComponents;
  evidenceReasons: string[];
};

type TxRow = {
  id: string;
  tenantId: string;
  amount: Prisma.Decimal;
  madeOn: string;
  description: string;
  payee: string | null;
  payer: string | null;
  category: string;
  reconciledAt: Date | null;
};

type ExpenseRow = {
  id: string;
  amount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  date: Date;
  description: string;
  supplier: { name: string } | null;
  reference: string | null;
};

// ──────────────────────────────────────────────────────────────────────────────
// Text similarity — Jaccard sobre bigramas de palabras
// ──────────────────────────────────────────────────────────────────────────────

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): Set<string> {
  const words = normalizeText(s)
    .split(' ')
    .filter((w) => w.length > 2);
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// ──────────────────────────────────────────────────────────────────────────────
// Amount score
// ──────────────────────────────────────────────────────────────────────────────

function amountScore(
  txAbsAmount: number,
  expNet: number,
  expTaxRate: number
): { score: number; match: 'gross' | 'net' | 'none' } {
  const expGross = expNet * (1 + expTaxRate);

  const diffNet = Math.abs(txAbsAmount - expNet);
  const diffGross = Math.abs(txAbsAmount - expGross);

  function scoreFromDiff(diff: number): number {
    if (diff < 0.01) return 1.0;
    if (diff <= 1) return 0.9;
    if (diff <= 5) return 0.65;
    if (diff <= 15) return 0.35;
    if (diff <= 50) return 0.15;
    return 0;
  }

  const sNet = scoreFromDiff(diffNet);
  const sGross = scoreFromDiff(diffGross);

  if (sGross >= sNet && sGross > 0) return { score: sGross, match: 'gross' };
  if (sNet > 0) return { score: sNet, match: 'net' };
  return { score: 0, match: 'none' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Date score
// ──────────────────────────────────────────────────────────────────────────────

function dateScore(txDateStr: string, expDate: Date): { score: number; days: number } {
  const txDate = new Date(txDateStr);
  const days = Math.abs(Math.round((txDate.getTime() - expDate.getTime()) / 86_400_000));

  let score: number;
  if (days === 0) score = 1.0;
  else if (days === 1) score = 0.85;
  else if (days === 2) score = 0.7;
  else if (days === 3) score = 0.5;
  else if (days <= 7) score = 0.25;
  else if (days <= 14) score = 0.1;
  else score = 0;

  return { score, days };
}

// ──────────────────────────────────────────────────────────────────────────────
// Single match scorer
// ──────────────────────────────────────────────────────────────────────────────

function scoreMatch(tx: TxRow, expense: ExpenseRow): MatchCandidate {
  const txAbs = Math.abs(Number(tx.amount));
  const expNet = Number(expense.amount);
  const expTaxRate = Number(expense.taxRate);

  const { score: aScore, match: aMatch } = amountScore(txAbs, expNet, expTaxRate);
  const { score: dScore, days } = dateScore(tx.madeOn, expense.date);

  // Build text corpus for the transaction
  const txText = [tx.description, tx.payee, tx.payer].filter(Boolean).join(' ');
  const expText = [expense.description, expense.supplier?.name, expense.reference]
    .filter(Boolean)
    .join(' ');

  const txTokens = tokenize(txText);
  const expTokens = tokenize(expText);
  const similarity = jaccardSimilarity(txTokens, expTokens);
  const tScore = Math.min(1, similarity * 1.5); // slight boost — short strings underestimate

  const totalScore = aScore * 0.4 + dScore * 0.35 + tScore * 0.25;

  const evidenceReasons: string[] = [];
  if (aScore >= 0.9) evidenceReasons.push(`Importe coincide (${aMatch})`);
  else if (aScore >= 0.6) evidenceReasons.push(`Importe aproximado (${aMatch})`);
  if (dScore >= 0.85) evidenceReasons.push('Misma fecha');
  else if (dScore >= 0.5) evidenceReasons.push(`Fecha próxima (${days}d)`);
  if (tScore >= 0.5) evidenceReasons.push('Descripción similar');
  if (expense.supplier?.name && txText.toLowerCase().includes(normalizeText(expense.supplier.name)))
    evidenceReasons.push(`Proveedor "${expense.supplier.name}" encontrado`);

  return {
    expenseId: expense.id,
    score: totalScore,
    scoreComponents: {
      amountScore: aScore,
      dateScore: dScore,
      textScore: tScore,
      amountMatch: aMatch,
      dateMatch: days,
      textSimilarity: similarity,
    },
    evidenceReasons,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Encuentra los mejores candidatos de gasto para una transacción bancaria.
 * Solo busca gastos dentro de ±14 días del movimiento bancario.
 */
export async function findMatchCandidates(tx: TxRow, limit = 5): Promise<MatchCandidate[]> {
  if (Number(tx.amount) >= 0) return []; // solo débitos

  const txDate = new Date(tx.madeOn);
  const from = new Date(txDate);
  from.setDate(from.getDate() - 14);
  const to = new Date(txDate);
  to.setDate(to.getDate() + 14);

  const txAbs = Math.abs(Number(tx.amount));

  const expenses = await prisma.expenseRecord.findMany({
    where: {
      tenantId: tx.tenantId,
      date: { gte: from, lte: to },
      // rough amount filter: allow ±30% OR ±50€
      amount: {
        gte: Math.max(0, txAbs * 0.7 - 50),
        lte: txAbs * 1.5 + 50,
      },
      seTransactionMatchAudits: { none: { autoMatched: true } },
    },
    include: { supplier: { select: { name: true } } },
    take: 50,
  });

  const candidates = expenses
    .map((e) => scoreMatch(tx, e))
    .filter((c) => c.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return candidates;
}

/**
 * Ejecuta conciliación para todo el tenant.
 * Devuelve contadores de matched, skipped y total procesadas.
 */
export async function reconcileTenant(tenantId: string): Promise<{
  matched: number;
  skipped: number;
  total: number;
}> {
  const config = await prisma.bankReconciliationConfig.findUnique({
    where: { tenantId },
  });
  // Bumped default from 0.85 → 0.95: only auto-apply on very high confidence.
  // Lower scores still create audit records for human review.
  const threshold = config?.confidenceThreshold ?? AUTO_APPLY_THRESHOLD;

  // Transacciones negativas (gastos) aún no conciliadas
  const transactions = await prisma.seTransaction.findMany({
    where: {
      tenantId,
      status: 'posted',
      duplicated: false,
      reconciledAt: null,
      amount: { lt: 0 },
    },
    orderBy: { madeOn: 'desc' },
    take: 500,
  });

  let matched = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const candidates = await findMatchCandidates(tx);
    if (candidates.length === 0) {
      skipped++;
      continue;
    }

    const best = candidates[0]!;

    // Save audit record regardless of auto-match
    await prisma.seTransactionMatchAudit.create({
      data: {
        tenantId,
        seTransactionId: tx.id,
        matchedExpenseId: best.score >= threshold ? best.expenseId : null,
        matchScore: best.score,
        scoreComponents: best.scoreComponents as unknown as Prisma.InputJsonValue,
        evidenceReasons: best.evidenceReasons as unknown as Prisma.InputJsonValue,
        autoMatched: best.score >= threshold,
      },
    });

    if (best.score >= threshold) {
      await prisma.seTransaction.update({
        where: { id: tx.id },
        data: { reconciledAt: new Date() },
      });
      matched++;
    } else {
      skipped++;
    }
  }

  return { matched, skipped, total: transactions.length };
}

/**
 * Confirma manualmente un match: asocia la transacción con el gasto indicado.
 */
export async function confirmMatch(
  tenantId: string,
  txId: string,
  expenseId: string
): Promise<void> {
  // Reemplazar audits previos para esta transacción
  await prisma.seTransactionMatchAudit.deleteMany({
    where: { tenantId, seTransactionId: txId },
  });

  await prisma.seTransactionMatchAudit.create({
    data: {
      tenantId,
      seTransactionId: txId,
      matchedExpenseId: expenseId,
      matchScore: 1.0,
      scoreComponents: {
        amountScore: 0,
        dateScore: 0,
        textScore: 0,
        manualConfirm: true,
      } as unknown as Prisma.InputJsonValue,
      evidenceReasons: ['Confirmado manualmente'] as unknown as Prisma.InputJsonValue,
      autoMatched: false,
    },
  });

  await prisma.seTransaction.update({
    where: { id: txId },
    data: { reconciledAt: new Date() },
  });
}

/**
 * Deshace un match: borra el audit y limpia `reconciledAt`.
 * Útil para corregir falsos positivos del auto-match.
 */
export async function undoMatch(tenantId: string, txId: string): Promise<void> {
  await prisma.seTransactionMatchAudit.deleteMany({
    where: { tenantId, seTransactionId: txId },
  });
  await prisma.seTransaction.update({
    where: { id: txId },
    data: { reconciledAt: null },
  });
}

/**
 * Carga matches recientemente auto-aplicados (últimos 30 días) para revisión.
 * El usuario puede deshacerlos si detecta un falso positivo.
 */
export async function loadRecentAutoMatched(
  tenantId: string,
  limit = 20
): Promise<
  Array<{
    txId: string;
    txAmount: number;
    txMadeOn: string;
    txDescription: string;
    expenseId: string | null;
    expenseDescription: string | null;
    expenseSupplier: string | null;
    matchScore: number;
    matchedAt: Date;
  }>
> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const audits = await prisma.seTransactionMatchAudit.findMany({
    where: {
      tenantId,
      autoMatched: true,
      matchedExpenseId: { not: null },
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const txIds = audits.map((a) => a.seTransactionId);
  const expenseIds = audits
    .map((a) => a.matchedExpenseId)
    .filter((id): id is string => id !== null);

  const [transactions, expenses] = await Promise.all([
    prisma.seTransaction.findMany({
      where: { id: { in: txIds } },
      select: { id: true, amount: true, madeOn: true, description: true, payee: true },
    }),
    prisma.expenseRecord.findMany({
      where: { id: { in: expenseIds } },
      select: { id: true, description: true, supplier: { select: { name: true } } },
    }),
  ]);

  const txMap = new Map(transactions.map((t) => [t.id, t]));
  const expMap = new Map(expenses.map((e) => [e.id, e]));

  return audits.map((a) => {
    const tx = txMap.get(a.seTransactionId);
    const exp = a.matchedExpenseId ? expMap.get(a.matchedExpenseId) : null;
    return {
      txId: a.seTransactionId,
      txAmount: tx ? Number(tx.amount) : 0,
      txMadeOn: tx?.madeOn ?? '',
      txDescription: tx?.description ?? tx?.payee ?? '',
      expenseId: a.matchedExpenseId,
      expenseDescription: exp?.description ?? null,
      expenseSupplier: exp?.supplier?.name ?? null,
      matchScore: a.matchScore,
      matchedAt: a.createdAt,
    };
  });
}

/**
 * Carga sugerencias pendientes (transacciones no conciliadas con sus mejores candidatos).
 */
export async function loadPendingSuggestions(
  tenantId: string,
  limit = 20
): Promise<
  Array<{
    tx: TxRow;
    candidates: MatchCandidate[];
  }>
> {
  const transactions = await prisma.seTransaction.findMany({
    where: {
      tenantId,
      status: 'posted',
      duplicated: false,
      reconciledAt: null,
      amount: { lt: 0 },
    },
    orderBy: { madeOn: 'desc' },
    take: limit,
  });

  const results = [];
  for (const tx of transactions) {
    const candidates = await findMatchCandidates(tx, 3);
    results.push({ tx, candidates });
  }
  return results;
}
