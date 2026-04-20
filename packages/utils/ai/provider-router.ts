import type { AIProvider, CallLLMParams, NormalizedLLMResponse } from './types';
import type { AIConfig } from './config';
import { AIError } from './errors';

export type ProviderAdapter = (
  params: CallLLMParams,
  config: AIConfig
) => Promise<NormalizedLLMResponse>;

const adapterRegistry = new Map<AIProvider, ProviderAdapter>();

export function registerAdapter(provider: AIProvider, adapter: ProviderAdapter): void {
  adapterRegistry.set(provider, adapter);
}

export function resolveProvider(params: CallLLMParams, config: AIConfig): AIProvider {
  if (params.provider) return params.provider;
  if (params.model?.startsWith('anthropic/') || params.model?.startsWith('claude'))
    return 'anthropic';
  if (params.model?.includes('/')) return 'gateway';
  return config.defaultProvider;
}

export async function routeToAdapter(
  params: CallLLMParams,
  config: AIConfig
): Promise<NormalizedLLMResponse> {
  const provider = resolveProvider(params, config);
  const adapter = adapterRegistry.get(provider);

  if (!adapter) {
    throw new AIError(`No adapter registered for provider "${provider}"`, provider, 'unknown');
  }

  return adapter(params, config);
}
