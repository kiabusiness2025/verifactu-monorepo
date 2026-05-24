// Pure parser for the GPT-4o-mini judge output. Separated from the caller
// so unit tests don't pull in @verifactu/utils.

export type JudgeVerdict = 'allow' | 'block' | 'needs_confirmation';

export type JudgeResult = {
  verdict: JudgeVerdict;
  reasoning: string;
  blockers: string[];
  modelUsed: string;
  latencyMs: number;
  parseError?: string;
};

const VALID_VERDICTS: ReadonlySet<JudgeVerdict> = new Set([
  'allow',
  'block',
  'needs_confirmation',
]);

export function emptyJudgeResult(
  reason: string,
  model: string,
  latencyMs: number
): JudgeResult {
  // Default to BLOCK on parse failure — judge errors should never grant a
  // write. If something is unparseable, the human user has to retry.
  return {
    verdict: 'block',
    reasoning: `Judge unavailable (${reason}). Action blocked for safety.`,
    blockers: ['judge_unavailable'],
    modelUsed: model,
    latencyMs,
    parseError: reason,
  };
}

export function parseJudgeJson(
  rawText: string,
  model: string,
  latencyMs: number
): JudgeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch {
    return emptyJudgeResult('invalid_json', model, latencyMs);
  }
  if (!parsed || typeof parsed !== 'object') {
    return emptyJudgeResult('not_object', model, latencyMs);
  }
  const obj = parsed as Record<string, unknown>;

  const rawVerdict = typeof obj.verdict === 'string' ? obj.verdict : '';
  const verdict = VALID_VERDICTS.has(rawVerdict as JudgeVerdict)
    ? (rawVerdict as JudgeVerdict)
    : 'block';

  const reasoning =
    typeof obj.reasoning === 'string' && obj.reasoning.trim()
      ? obj.reasoning.trim()
      : '';

  let blockers: string[] = [];
  if (Array.isArray(obj.blockers)) {
    blockers = obj.blockers
      .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
      .map((b) => b.trim())
      .slice(0, 8);
  }

  return {
    verdict,
    reasoning,
    blockers,
    modelUsed: model,
    latencyMs,
  };
}
