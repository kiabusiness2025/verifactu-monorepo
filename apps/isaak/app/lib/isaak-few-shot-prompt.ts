// F7 pure formatter for the few-shot prompt block. Extracted so unit
// tests don't pull @verifactu/utils through babel-jest.

export type FewShotExample = {
  question: string;
  response: string;
  similarity: number;
  createdAt: Date | string;
};

const MAX_EXAMPLES_IN_PROMPT = 3;
const MAX_QUESTION_CHARS = 300;
const MAX_RESPONSE_CHARS = 800;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatFewShotBlock(examples: FewShotExample[]): string {
  if (!examples.length) return '';
  const capped = examples.slice(0, MAX_EXAMPLES_IN_PROMPT);
  const lines = capped.flatMap((ex, idx) => [
    `Ejemplo ${idx + 1}:`,
    `Usuario: ${truncate(ex.question, MAX_QUESTION_CHARS)}`,
    `Isaak: ${truncate(ex.response, MAX_RESPONSE_CHARS)}`,
    '',
  ]);
  return [
    'Ejemplos previos del mismo workspace que recibieron 👍 (úsalos como guía de estilo y precisión, NO los copies literalmente):',
    '',
    ...lines,
  ]
    .join('\n')
    .trimEnd();
}

export function getFewShotPromptLimits() {
  return {
    maxExamplesInPrompt: MAX_EXAMPLES_IN_PROMPT,
    maxQuestionChars: MAX_QUESTION_CHARS,
    maxResponseChars: MAX_RESPONSE_CHARS,
  };
}
