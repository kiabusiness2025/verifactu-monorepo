import type {
  AIToolUse,
  CallLLMParams,
  NormalizedLLMResponse,
} from './types';
import type { AIConfig } from './config';
import { AIError, classifyHttpError } from './errors';
import { normalizeResponse } from './normalize-response';
import { registerAdapter } from './provider-router';

// Anthropic Messages API — direct fetch, no SDK dependency
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

function buildMessages(params: CallLLMParams): AnthropicMessage[] {
  if (params.richMessages?.length) {
    return params.richMessages.map((m) => ({
      role: m.role,
      content: m.content as AnthropicMessage['content'],
    }));
  }
  if (params.messages?.length) {
    return params.messages.map((m) => ({ role: m.role, content: m.content }));
  }
  if (params.inputText?.trim()) {
    return [{ role: 'user', content: params.inputText.trim() }];
  }
  return [];
}

export async function anthropicAdapter(
  params: CallLLMParams,
  config: AIConfig
): Promise<NormalizedLLMResponse> {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) {
    throw new AIError('Missing ANTHROPIC_API_KEY / ISAAK_ANTHROPIC_API_KEY', 'anthropic', 'auth');
  }

  const model = params.model ?? config.defaultModelClaude;
  const messages = buildMessages(params);

  if (!messages.length) {
    throw new AIError('Anthropic adapter requires messages or inputText', 'anthropic', 'unknown');
  }

  const payload: Record<string, unknown> = {
    model,
    max_tokens: params.maxOutputTokens ?? 1024,
    messages,
  };

  if (params.instructions?.trim()) {
    payload.system = params.instructions.trim();
  }

  if (typeof params.temperature === 'number') {
    payload.temperature = params.temperature;
  }

  if (params.tools?.length) {
    payload.tools = params.tools;
    payload.tool_choice = params.toolChoice ?? { type: 'auto' };
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).trim();
    throw new AIError(
      `Anthropic error ${response.status}: ${body}`.trim(),
      'anthropic',
      classifyHttpError(response.status),
      response.status
    );
  }

  const data = (await response.json()) as AnthropicResponse;

  if (data.error?.message) {
    throw new AIError(data.error.message, 'anthropic', 'unknown');
  }

  const text = data.content?.find((b) => b.type === 'text')?.text ?? null;
  const toolUses: AIToolUse[] =
    data.content
      ?.filter((b) => b.type === 'tool_use' && b.id && b.name)
      .map((b) => ({
        id: b.id as string,
        name: b.name as string,
        input: (b.input as Record<string, unknown>) ?? {},
      })) ?? [];
  const usage = data.usage
    ? {
        inputTokens: data.usage.input_tokens ?? 0,
        outputTokens: data.usage.output_tokens ?? 0,
      }
    : undefined;
  return normalizeResponse(text, 'anthropic', model, data, usage, {
    toolUses: toolUses.length ? toolUses : undefined,
    stopReason: data.stop_reason,
  });
}

registerAdapter('anthropic', anthropicAdapter);
