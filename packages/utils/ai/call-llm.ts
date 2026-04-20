import type { CallLLMParams, NormalizedLLMResponse } from './types';
import { resolveAIConfig, resolveProviderForFeature } from './config';
import { routeToAdapter } from './provider-router';
import { AIError } from './errors';

// Import adapters to trigger registration via registerAdapter()
import './openai-adapter';
import './gateway-adapter';
import './anthropic-adapter';

export async function callLLM(params: CallLLMParams): Promise<NormalizedLLMResponse> {
  const config = resolveAIConfig(process.env);
  const start = Date.now();

  // Apply feature-level provider override if no explicit provider in params
  const resolvedParams: CallLLMParams = params.provider
    ? params
    : {
        ...params,
        provider: resolveProviderForFeature(params.feature, config, process.env),
      };

  try {
    const result = await routeToAdapter(resolvedParams, config);
    const latencyMs = Date.now() - start;

    console.info('[callLLM]', {
      provider: result.provider,
      model: result.model,
      feature: params.feature ?? null,
      latencyMs,
    });

    return { ...result, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - start;

    if (error instanceof AIError) {
      console.error('[callLLM] error', {
        provider: error.provider,
        kind: error.kind,
        statusCode: error.statusCode ?? null,
        feature: params.feature ?? null,
        latencyMs,
        message: error.message,
      });
    } else {
      console.error('[callLLM] unexpected error', {
        feature: params.feature ?? null,
        latencyMs,
        error,
      });
    }

    throw error;
  }
}
