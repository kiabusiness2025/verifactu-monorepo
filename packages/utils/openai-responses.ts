type ResponseMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type OpenAIResponseFormat = 'text' | 'json_object';

type CallOpenAIResponsesParams = {
  apiKey: string;
  model?: string;
  instructions?: string;
  messages?: ResponseMessage[];
  inputText?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: OpenAIResponseFormat;
};

type OpenAIResponsesApiOutput = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export function resolveOpenAIKey(env: NodeJS.ProcessEnv): string | null {
  return env.ISAAK_OPENAI_SERVICE_ACCOUNT || null;
}

export async function callOpenAIResponses({
  apiKey,
  model = 'gpt-4.1-mini',
  instructions,
  messages = [],
  inputText,
  temperature,
  maxOutputTokens,
  responseFormat = 'text',
}: CallOpenAIResponsesParams): Promise<string> {
  const trimmedInput = inputText?.trim();
  const input = messages.length
    ? messages.map((message) => ({
        role: message.role,
        content: [{ type: 'input_text', text: message.content }],
      }))
    : trimmedInput
      ? trimmedInput
      : undefined;

  if (!instructions?.trim() && !input) {
    throw new Error('OpenAI Responses requires instructions or input');
  }

  const payload: Record<string, unknown> = {
    model,
  };

  if (instructions?.trim()) {
    payload.instructions = instructions.trim();
  }

  if (input) {
    payload.input = input;
  }

  if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }

  if (typeof maxOutputTokens === 'number') {
    payload.max_output_tokens = maxOutputTokens;
  }

  if (responseFormat === 'json_object') {
    payload.text = {
      format: {
        type: 'json_schema',
        name: 'isaak_response',
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.text().catch(() => '')).trim();
    throw new Error(`OpenAI Responses error: ${response.status} ${errorBody}`.trim());
  }

  const data = (await response.json()) as OpenAIResponsesApiOutput;
  const text = extractOpenAIResponseText(data);

  if (!text) {
    throw new Error(data.error?.message || 'OpenAI Responses returned no text output');
  }

  return text;
}

function extractOpenAIResponseText(data: OpenAIResponsesApiOutput): string {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const fragments =
    data.output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => item.text?.trim() || '')
      .filter(Boolean) || [];

  return fragments.join('\n').trim();
}
