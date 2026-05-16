import type { AIProvider, CallLLMParams, NormalizedLLMResponse } from './types';
import type { AIConfig } from './config';
import { resolveAIConfig, resolveProviderForFeature } from './config';
import { routeToAdapter } from './provider-router';
import { AIError } from './errors';

// Import adapters to trigger registration via registerAdapter()
import './openai-adapter';
import './gateway-adapter';
import './anthropic-adapter';

const FALLBACK_ELIGIBLE_KINDS = new Set(['rate_limit', 'network', 'quota', 'empty_response']);

function isFallbackEligible(error: unknown): boolean {
  return error instanceof AIError && FALLBACK_ELIGIBLE_KINDS.has(error.kind);
}

function resolveFallbackModel(fallbackProvider: AIProvider, config: AIConfig): string {
  if (config.fallbackModel) return config.fallbackModel;
  return fallbackProvider === 'anthropic' ? config.defaultModelClaude : config.defaultModel;
}

export async function callLLM(params: CallLLMParams): Promise<NormalizedLLMResponse> {
  const config = resolveAIConfig(process.env);
  const start = Date.now();
  const enableFallback = params.enableFallback !== false; // default true

  const primaryProvider =
    params.provider ?? resolveProviderForFeature(params.feature, config, process.env);
  const resolvedParams: CallLLMParams = { ...params, provider: primaryProvider };

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
  } catch (primaryError) {
    const latencyMs = Date.now() - start;

    if (primaryError instanceof AIError) {
      console.error('[callLLM] primary error', {
        provider: primaryError.provider,
        kind: primaryError.kind,
        statusCode: primaryError.statusCode ?? null,
        feature: params.feature ?? null,
        latencyMs,
        message: primaryError.message,
      });
    } else {
      console.error('[callLLM] primary unexpected error', {
        feature: params.feature ?? null,
        latencyMs,
        error: primaryError,
      });
    }

    // Attempt fallback on transient errors when enabled and a fallback provider is configured
    if (
      enableFallback &&
      isFallbackEligible(primaryError) &&
      config.fallbackProvider &&
      config.fallbackProvider !== primaryProvider
    ) {
      const fallbackProvider = config.fallbackProvider;
      const fallbackModel = resolveFallbackModel(fallbackProvider, config);
      const fallbackParams: CallLLMParams = {
        ...params,
        provider: fallbackProvider,
        model: fallbackModel,
      };

      console.warn('[callLLM] retrying with fallback', {
        primary: primaryProvider,
        fallback: fallbackProvider,
        model: fallbackModel,
        feature: params.feature ?? null,
      });

      try {
        const result = await routeToAdapter(fallbackParams, config);
        const totalMs = Date.now() - start;
        console.info('[callLLM] fallback succeeded', {
          provider: result.provider,
          model: result.model,
          feature: params.feature ?? null,
          totalMs,
        });
        return { ...result, latencyMs: totalMs };
      } catch (fallbackError) {
        console.error('[callLLM] fallback also failed', {
          fallback: fallbackProvider,
          feature: params.feature ?? null,
          error: fallbackError,
        });
        // throw the primary error so the caller sees the original failure
      }
    }

    throw primaryError;
  }
}
