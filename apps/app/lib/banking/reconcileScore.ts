export type ReconcileScoreInput = {
  movementAmount: number;
  movementDate: Date;
  movementText: string;
  candidateAmount: number;
  candidateDate: Date;
  candidateText: string;
  amountToleranceEur: number;
  dateWindowDays: number;
};

export type ReconcileScoreResult = {
  score: number;
  reasons: string[];
  details: {
    amountDelta: number;
    dayDistance: number;
    textSimilarity: number;
  };
};

function toTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const aTokens = toTokens(a);
  const bTokens = toTokens(b);

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function diffDays(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / 86400000);
}

export function scoreReconciliation(input: ReconcileScoreInput): ReconcileScoreResult {
  const reasons: string[] = [];

  const amountDelta = Math.abs(input.movementAmount - input.candidateAmount);
  const amountWindow = Math.max(input.amountToleranceEur, 0.01);
  let amountScore = 0;

  if (amountDelta <= amountWindow) {
    amountScore = 0.55;
    reasons.push('Importe dentro de tolerancia');
  } else if (amountDelta <= amountWindow * 3) {
    const normalized = 1 - (amountDelta - amountWindow) / (amountWindow * 2);
    amountScore = 0.55 * Math.max(0, normalized);
  }

  const dayDistance = diffDays(input.movementDate, input.candidateDate);
  const dateWindow = Math.max(input.dateWindowDays, 0);
  let dateScore = 0;

  if (dayDistance <= dateWindow) {
    const scale = dateWindow === 0 ? 1 : 1 - dayDistance / (dateWindow + 1);
    dateScore = 0.3 * Math.max(0, scale);
    reasons.push('Fecha dentro de ventana');
  }

  const textSimilarity = jaccardSimilarity(input.movementText, input.candidateText);
  const textScore = 0.15 * textSimilarity;

  if (textSimilarity >= 0.5) {
    reasons.push('Descripcion con alta similitud');
  } else if (textSimilarity >= 0.2) {
    reasons.push('Descripcion con similitud parcial');
  }

  const totalScore = Math.max(0, Math.min(1, amountScore + dateScore + textScore));

  return {
    score: totalScore,
    reasons,
    details: {
      amountDelta,
      dayDistance,
      textSimilarity,
    },
  };
}
