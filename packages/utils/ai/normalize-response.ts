import type { AIProvider, AIToolUse, AIUsage, NormalizedLLMResponse } from './types';
import { AIError } from './errors';

export function normalizeResponse(
  text: string | null | undefined,
  provider: AIProvider,
  model: string,
  raw?: unknown,
  usage?: AIUsage,
  extras?: { toolUses?: AIToolUse[]; stopReason?: string }
): NormalizedLLMResponse {
  const hasToolUses = (extras?.toolUses?.length ?? 0) > 0;
  if (!text?.trim() && !hasToolUses) {
    throw new AIError('Provider returned empty response', provider, 'empty_response');
  }
  return {
    text: text?.trim() ?? '',
    provider,
    model,
    raw,
    usage,
    toolUses: extras?.toolUses,
    stopReason: extras?.stopReason,
  };
}
