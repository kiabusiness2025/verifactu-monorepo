import type { CallLLMParams, NormalizedLLMResponse } from './types';
import type { AIConfig } from './config';
import { AIError, classifyHttpError } from './errors';
import { normalizeResponse } from './normalize-response';
import { registerAdapter } from './provider-router';

// Vercel AI Gateway exposes an OpenAI-compatible Chat Completions endpoint.
// Model format: "provider/model-name" e.g. "anthropic/claude-3-5-sonnet-20241022"
const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

type GatewayChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GatewayChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function buildMessages(params: CallLLMParams): GatewayChatMessage[] {
  const out: GatewayChatMessage[] = [];

  if (params.instructions?.trim()) {
    out.push({ role: 'system', content: params.instructions.trim() });
  }

  if (params.messages?.length) {
    for (const m of params.messages) {
      out.push({ role: m.role, content: m.content });
    }
  } else if (params.inputText?.trim()) {
    out.push({ role: 'user', content: params.inputText.trim() });
  }

  return out;
}

export async function gatewayAdapter(
  params: CallLLMParams,
  config: AIConfig
): Promise<NormalizedLLMResponse> {
  const apiKey = config.gatewayApiKey;
  if (!apiKey) {
    throw new AIError('Missing CLAVE_API_AI_VERCEL / VERCEL_AI_API_KEY', 'gateway', 'auth');
  }

  const model = params.model ?? config.defaultModel;
  const messages = buildMessages(params);

  if (!messages.length) {
    throw new AIError('Gateway adapter requires instructions or messages', 'gateway', 'unknown');
  }

  const payload: Record<string, unknown> = { model, messages };
  if (typeof params.temperature === 'number') payload.temperature = params.temperature;
  if (typeof params.maxOutputTokens === 'number') payload.max_tokens = params.maxOutputTokens;
  if (params.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(`${GATEWAY_BASE_URL}/chat/completions`, {
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
      `Gateway error ${response.status}: ${body}`.trim(),
      'gateway',
      classifyHttpError(response.status),
      response.status
    );
  }

  const data = (await response.json()) as GatewayChatResponse;

  if (data.error?.message) {
    throw new AIError(data.error.message, 'gateway', 'unknown');
  }

  const text = data.choices?.[0]?.message?.content ?? null;
  return normalizeResponse(text, 'gateway', model, data);
}

registerAdapter('gateway', gatewayAdapter);
