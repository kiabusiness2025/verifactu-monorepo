import type { AIProvider } from './types';

export type AIConfig = {
  defaultProvider: AIProvider;
  defaultModel: string;
  defaultModelClaude: string;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  gatewayApiKey: string | null;
};

function key(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function resolveAIConfig(env: NodeJS.ProcessEnv): AIConfig {
  return {
    defaultProvider: (env.ISAAK_AI_PROVIDER_DEFAULT?.trim() as AIProvider) ?? 'openai',
    defaultModel:
      env.ISAAK_AI_MODEL_DEFAULT?.trim() ?? env.ISAAK_OPENAI_MODEL?.trim() ?? 'gpt-4.1-mini',
    defaultModelClaude:
      env.ISAAK_AI_MODEL_CLAUDE_DEFAULT?.trim() ??
      env.ANTHROPIC_MODEL?.trim() ??
      'claude-sonnet-4-5',
    openaiApiKey: key(env.ISAAK_NEW_OPENAI_API_KEY),
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
