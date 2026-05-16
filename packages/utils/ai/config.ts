import type { AIProvider } from './types';

export type AIConfig = {
  defaultProvider: AIProvider;
  defaultModel: string;
  defaultModelClaude: string;
  fallbackProvider: AIProvider | null;
  fallbackModel: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  gatewayApiKey: string | null;
};

function key(value: string | undefined): string | null {
  return value?.trim() || null;
}

function defaultFallback(primary: AIProvider): AIProvider | null {
  if (primary === 'anthropic') return 'openai';
  if (primary === 'openai') return 'anthropic';
  return null;
}

export function resolveAIConfig(env: NodeJS.ProcessEnv): AIConfig {
  const defaultProvider = (env.ISAAK_AI_PROVIDER_DEFAULT?.trim() as AIProvider) ?? 'anthropic';

  const explicitFallback = env.ISAAK_AI_FALLBACK_PROVIDER?.trim() as AIProvider | undefined;
  const fallbackProvider: AIProvider | null = explicitFallback ?? defaultFallback(defaultProvider);

  return {
    defaultProvider,
    defaultModel:
      env.ISAAK_AI_MODEL_DEFAULT?.trim() ?? env.ISAAK_OPENAI_MODEL?.trim() ?? 'gpt-4.1-mini',
    defaultModelClaude:
      env.ISAAK_AI_MODEL_CLAUDE_DEFAULT?.trim() ??
      env.ANTHROPIC_MODEL?.trim() ??
      'claude-haiku-4-5-20251001',
    fallbackProvider,
    fallbackModel: env.ISAAK_AI_FALLBACK_MODEL?.trim() ?? null,
    openaiApiKey: key(env.ISAAK_NEW_OPENAI_API_KEY) ?? key(env.OPENAI_API_KEY),
    anthropicApiKey: key(env.ISAAK_ANTHROPIC_API_KEY) ?? key(env.ANTHROPIC_API_KEY),
    gatewayApiKey: key(env.CLAVE_API_AI_VERCEL) ?? key(env.VERCEL_AI_API_KEY),
  };
}

/**
 * Resolve the provider for a specific feature.
 * Checks ISAAK_AI_PROVIDER_<FEATURE> first, falls back to defaultProvider.
 *
 * Example: ISAAK_AI_PROVIDER_HOLDED_CHAT=anthropic
 */
export function resolveProviderForFeature(
  feature: string | undefined,
  config: AIConfig,
  env: NodeJS.ProcessEnv
): AIProvider {
  if (!feature) return config.defaultProvider;
  const envKey = `ISAAK_AI_PROVIDER_${feature.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const override = env[envKey]?.trim() as AIProvider | undefined;
  return override ?? config.defaultProvider;
}
