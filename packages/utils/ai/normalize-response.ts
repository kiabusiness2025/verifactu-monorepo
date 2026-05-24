import type { AIProvider, AIUsage, NormalizedLLMResponse } from './types';
import { AIError } from './errors';

export function normalizeResponse(
  text: string | null | undefined,
  provider: AIProvider,
  model: string,
  raw?: unknown,
  usage?: AIUsage
): NormalizedLLMResponse {
  if (!text?.trim()) {
    throw new AIError('Provider returned empty response', provider, 'empty_response');
  }
  return { text: text.trim(), provider, model, raw, usage };
}
