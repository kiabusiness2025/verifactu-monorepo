// LLM-as-judge helper. Uses GPT-4o-mini to score Isaak responses against
// expected behavior. Used by golden tests in opt-in mode (ISAAK_GOLDEN_LIVE=1).
//
// Like run-isaak.ts, this calls the provider directly (no @verifactu/utils
// import) to keep Jest's module graph small.

export type JudgeInput = {
  query: string;
  response: string;
  expectedBehavior: string;
};

export type JudgeOutput = {
  score: number;
  reasoning: string;
};

const JUDGE_INSTRUCTIONS = `Eres un evaluador imparcial. Recibes una pregunta, una respuesta del asistente Isaak, y el comportamiento esperado. Devuelves un JSON con score (0-10) y reasoning.

Considera para puntuar:
- Precisión (no inventa datos)
- Adecuación al comportamiento esperado
- Claridad y accionabilidad
- Si el comportamiento esperado era clarificar (preguntar antes de asumir), responder con JSON {clarify: true, ...} vale 10. Responder con prosa adivinando vale 2.

Devuelve EXCLUSIVAMENTE JSON válido sin markdown ni backticks:
{"score": <0-10>, "reasoning": "<2-3 frases>"}`;

function getOpenaiKey(): string {
  const key =
    process.env.OPENAI_API_KEY ||
    process.env.ISAAK_NEW_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY_DEV;
  if (!key) {
    throw new Error('Missing OPENAI_API_KEY for golden judge.');
  }
  return key;
}

export async function judgeResponse(input: JudgeInput): Promise<JudgeOutput> {
  const prompt = `PREGUNTA DEL USUARIO:
${input.query}

RESPUESTA DE ISAAK:
${input.response}

COMPORTAMIENTO ESPERADO:
${input.expectedBehavior}

Devuelve el JSON con score y reasoning.`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getOpenaiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      instructions: JUDGE_INSTRUCTIONS,
      input: prompt,
      temperature: 0,
      max_output_tokens: 200,
      text: {
        format: {
          type: 'json_schema',
          name: 'judge_output',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['score', 'reasoning'],
            properties: {
              score: { type: 'number' },
              reasoning: { type: 'string' },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Judge ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text =
    data.output_text ||
    data.output?.[0]?.content?.find((c) => c.type === 'output_text')?.text ||
    '';

  try {
    const parsed = JSON.parse(text) as JudgeOutput;
    if (typeof parsed.score !== 'number') throw new Error('missing score');
    return { score: parsed.score, reasoning: parsed.reasoning ?? '' };
  } catch (err) {
    throw new Error(`Judge returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export function isGoldenLiveMode(): boolean {
  return process.env.ISAAK_GOLDEN_LIVE === '1';
}
