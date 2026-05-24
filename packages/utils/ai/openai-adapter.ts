import type { CallLLMParams, NormalizedLLMResponse } from './types';
import type { AIConfig } from './config';
import { AIError, classifyHttpError } from './errors';
import { normalizeResponse } from './normalize-response';
import { registerAdapter } from './provider-router';

type OpenAIResponsesApiOutput = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

function extractText(data: OpenAIResponsesApiOutput): string {
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

export async function openaiAdapter(
  params: CallLLMParams,
  config: AIConfig
): Promise<NormalizedLLMResponse> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new AIError('Missing ISAAK_NEW_OPENAI_API_KEY', 'openai', 'auth');
  }

  const model = params.model ?? config.defaultModel;
  const {
    instructions,
    messages = [],
    inputText,
    inputImages,
    temperature,
    maxOutputTokens,
    responseFormat = 'text',
  } = params;

  type OpenAIContentBlock =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string; detail?: 'auto' | 'low' | 'high' };

  const trimmedInput = inputText?.trim();
  let input: unknown;

  if (messages.length) {
    input = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'input_text', text: m.content }],
    }));
  } else if (inputImages?.length) {
    // Multimodal single-turn input: optional text + one or more images.
    const content: OpenAIContentBlock[] = [];
    if (trimmedInput) content.push({ type: 'input_text', text: trimmedInput });
    for (const img of inputImages) {
      content.push({
        type: 'input_image',
        image_url: img.url,
        ...(img.detail ? { detail: img.detail } : {}),
      });
    }
    input = [{ role: 'user', content }];
  } else if (trimmedInput) {
    input = trimmedInput;
  }

  if (!instructions?.trim() && !input) {
    throw new AIError('OpenAI adapter requires instructions or input', 'openai', 'unknown');
  }

  const payload: Record<string, unknown> = { model };
  if (instructions?.trim()) payload.instructions = instructions.trim();
  if (input) payload.input = input;
  if (typeof temperature === 'number') payload.temperature = temperature;
  if (typeof maxOutputTokens === 'number') payload.max_output_tokens = maxOutputTokens;
  if (responseFormat === 'json_object') {
    payload.text = {
      format: {
        type: 'json_schema',
        name: 'isaak_response',
        schema: { type: 'object', additionalProperties: true },
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
    const body = (await response.text().catch(() => '')).trim();
    throw new AIError(
      `OpenAI error ${response.status}: ${body}`.trim(),
      'openai',
      classifyHttpError(response.status),
      response.status
    );
  }

  const data = (await response.json()) as OpenAIResponsesApiOutput;

  if (data.error?.message) {
    throw new AIError(data.error.message, 'openai', 'unknown');
  }

  const usage = data.usage
    ? {
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
      }
    : undefined;
  return normalizeResponse(extractText(data), 'openai', model, data, usage);
}

registerAdapter('openai', openaiAdapter);
