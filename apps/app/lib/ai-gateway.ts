/**
 * AI Gateway Integration for Vercel AI SDK
 * 
 * Permite cambiar entre más de 100 modelos sin administrar límites de velocidad
 * ni cuentas de proveedores separadas.
 * 
 * Documentación: https://vercel.com/docs/ai-gateway
 * 
 * Modelos disponibles:
 * - OpenAI: gpt-4-turbo, gpt-4, gpt-3.5-turbo
 * - Anthropic: claude-3-opus, claude-3-sonnet, claude-3-haiku
 * - xAI: grok-2
 * - Google: gemini-pro
 * - Y más...
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Inicializar cliente de OpenAI via AI Gateway
 * Soporta todos los modelos de OpenAI + otros proveedores
 */
export const createAIGatewayClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error('CLAVE_API_AI_VERCEL o VERCEL_AI_API_KEY no está configurado');
  }

  return {
    // Cliente OpenAI (soporta modelos de OpenAI y otros via gateway)
    openai: createOpenAI({
      apiKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
      defaultQuery: {},
      defaultHeaders: {},
    }),

    // Cliente Anthropic (soporta Claude via gateway)
    anthropic: createAnthropic({
      apiKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    }),
  };
};

/**
 * Modelos recomendados para diferentes casos
 */
export const AI_MODELS = {
  // OpenAI - GPT series
  'openai/gpt-4-turbo': {
    provider: 'OpenAI',
    name: 'GPT-4 Turbo',
    cost: '$',
    speed: 'normal',
    context: 128000,
    recommended: true,
    bestFor: ['análisis contable', 'cálculos complejos', 'consultas fiscales'],
  },
  'openai/gpt-4': {
    provider: 'OpenAI',
    name: 'GPT-4',
    cost: '$$',
    speed: 'lento',
    context: 8000,
    recommended: false,
    bestFor: ['tareas muy complejas'],
  },
  'openai/gpt-3.5-turbo': {
    provider: 'OpenAI',
    name: 'GPT-3.5 Turbo',
    cost: '$',
    speed: 'rápido',
    context: 4096,
    recommended: false,
    bestFor: ['respuestas rápidas', 'tareas simples'],
  },

  // Anthropic - Claude series
  'anthropic/claude-3-opus': {
    provider: 'Anthropic',
    name: 'Claude 3 Opus',
    cost: '$$',
    speed: 'normal',
    context: 200000,
    recommended: false,
    bestFor: ['análisis profundo', 'reasoning complejo'],
  },
  'anthropic/claude-3-sonnet': {
    provider: 'Anthropic',
    name: 'Claude 3 Sonnet',
    cost: '$',
    speed: 'rápido',
    context: 200000,
    recommended: false,
    bestFor: ['tareas generales', 'balance velocidad-calidad'],
  },
  'anthropic/claude-3-haiku': {
    provider: 'Anthropic',
    name: 'Claude 3 Haiku',
    cost: '$',
    speed: 'muy rápido',
    context: 200000,
    recommended: false,
    bestFor: ['respuestas rápidas', 'bajo costo'],
  },

  // xAI - Grok
  'xai/grok-2': {
    provider: 'xAI',
    name: 'Grok 2',
    cost: '$',
    speed: 'normal',
    context: 128000,
    recommended: false,
    bestFor: ['reasoning', 'análisis general'],
  },

  // Google - Gemini
  'google/gemini-pro': {
    provider: 'Google',
    name: 'Gemini Pro',
    cost: '$',
    speed: 'rápido',
    context: 32000,
    recommended: false,
    bestFor: ['respuestas rápidas', 'costo bajo'],
  },
};

/**
 * Obtener modelo recomendado para un contexto
 */
export const getRecommendedModel = (context: 'dashboard' | 'landing' | 'admin') => {
  switch (context) {
    case 'dashboard':
      // Para dashboard: GPT-4 Turbo (análisis contable)
      return 'openai/gpt-4-turbo';
    case 'admin':
      // Para admin: Claude Opus (reasoning complejo)
      return 'anthropic/claude-3-opus';
    case 'landing':
      // Para landing: Grok o GPT-3.5 (respuestas rápidas)
      return 'openai/gpt-3.5-turbo';
    default:
      return 'openai/gpt-4-turbo';
  }
};

/**
 * Ejemplo de uso en una API route:
 * 
 * ```typescript
 * import { createAIGatewayClient, getRecommendedModel } from '@/lib/ai-gateway';
 * 
 * const apiKey = process.env.CLAVE_API_AI_VERCEL;
 * const { openai } = createAIGatewayClient(apiKey);
 * 
 * const model = getRecommendedModel('dashboard');
 * const result = await streamText({
 *   model: openai(model),
 *   messages,
 *   system: 'Eres Isaak...',
 * });
 * ```
 */
