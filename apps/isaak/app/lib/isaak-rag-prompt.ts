// F6b: pure helpers to format retrieved facts into a system-prompt block.
// Extracted so unit tests can verify the rendering without pulling
// @verifactu/utils through babel-jest.

export type RagFact = {
  fact: string;
  factType: string;
  similarity: number;
  createdAt: Date | string;
};

const MAX_FACTS_IN_PROMPT = 6;
const MAX_FACT_CHARS = 500;

function formatDate(value: Date | string): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function formatFactsBlock(facts: RagFact[]): string {
  if (!facts.length) return '';
  const trimmed = facts.slice(0, MAX_FACTS_IN_PROMPT);
  const lines = trimmed.map((f) => {
    const text = f.fact.length > MAX_FACT_CHARS ? `${f.fact.slice(0, MAX_FACT_CHARS - 1)}…` : f.fact;
    const date = formatDate(f.createdAt);
    const meta = [f.factType, date].filter(Boolean).join(' · ');
    return `- ${text} _(${meta})_`;
  });
  return [
    'Memoria larga del negocio (hechos previos recuperados por similitud, NO inventar):',
    ...lines,
  ].join('\n');
}

// Public test surface — used by the unit test to assert the helper
// doesn't accidentally fabricate content or skip facts.
export function getRagPromptLimits() {
  return { maxFactsInPrompt: MAX_FACTS_IN_PROMPT, maxFactChars: MAX_FACT_CHARS };
}
