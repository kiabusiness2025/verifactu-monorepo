// Pure parser for the Haiku classifier output. Extracted from the main
// classifier module so unit tests don't pull in @verifactu/utils (which
// breaks babel-jest's TS transform on packages/utils/session.ts).

export type AmbiguityType = 'period' | 'entity' | 'intent' | 'amount' | 'none';
export type ToolCategory = 'holded' | 'banking' | 'google' | 'microsoft';

export type ClassificationResult = {
  ambiguous: boolean;
  ambiguityType: AmbiguityType;
  suggestedClarification: string | null;
  suggestedOptions: string[] | null;
  needsTools: boolean;
  relevantCategories: ToolCategory[];
  // F4: write intent detection
  hasWriteIntent: boolean;
  modelUsed: string;
  latencyMs: number;
  parseError?: string;
};

const VALID_AMBIGUITY: ReadonlySet<AmbiguityType> = new Set([
  'period',
  'entity',
  'intent',
  'amount',
  'none',
]);
const VALID_CATEGORIES: ReadonlySet<ToolCategory> = new Set([
  'holded',
  'banking',
  'google',
  'microsoft',
]);

export function emptyClassificationResult(
  reason: string,
  model: string,
  latencyMs: number
): ClassificationResult {
  return {
    ambiguous: false,
    ambiguityType: 'none',
    suggestedClarification: null,
    suggestedOptions: null,
    needsTools: true, // safe default — better to expose tools than miss real data
    relevantCategories: ['holded', 'banking', 'google', 'microsoft'],
    hasWriteIntent: false, // safe default — writes need explicit intent
    modelUsed: model,
    latencyMs,
    parseError: reason,
  };
}

function sanitizeCategories(input: unknown): ToolCategory[] {
  if (!Array.isArray(input)) return [];
  const out: ToolCategory[] = [];
  for (const value of input) {
    if (typeof value === 'string' && VALID_CATEGORIES.has(value as ToolCategory)) {
      out.push(value as ToolCategory);
    }
  }
  return Array.from(new Set(out));
}

export function parseClassifierJson(
  rawText: string,
  model: string,
  latencyMs: number
): ClassificationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.trim());
  } catch {
    return emptyClassificationResult('invalid_json', model, latencyMs);
  }
  if (!parsed || typeof parsed !== 'object') {
    return emptyClassificationResult('not_object', model, latencyMs);
  }
  const obj = parsed as Record<string, unknown>;

  const ambiguous = obj.ambiguous === true;
  const ambiguityType = VALID_AMBIGUITY.has(obj.ambiguityType as AmbiguityType)
    ? (obj.ambiguityType as AmbiguityType)
    : 'none';
  const needsTools = obj.needsTools === true;
  const relevantCategories = sanitizeCategories(obj.relevantCategories);

  const suggestedClarification =
    typeof obj.suggestedClarification === 'string' && obj.suggestedClarification.trim()
      ? obj.suggestedClarification.trim()
      : null;

  let suggestedOptions: string[] | null = null;
  if (Array.isArray(obj.suggestedOptions)) {
    const opts = obj.suggestedOptions
      .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
      .map((o) => o.trim())
      .slice(0, 4);
    suggestedOptions = opts.length ? opts : null;
  }

  const hasWriteIntent = obj.hasWriteIntent === true;

  return {
    ambiguous,
    ambiguityType: ambiguous ? ambiguityType : 'none',
    suggestedClarification: ambiguous ? suggestedClarification : null,
    suggestedOptions: ambiguous ? suggestedOptions : null,
    needsTools: ambiguous ? false : needsTools,
    relevantCategories: needsTools && !ambiguous ? relevantCategories : [],
    hasWriteIntent: ambiguous ? false : hasWriteIntent,
    modelUsed: model,
    latencyMs,
  };
}
