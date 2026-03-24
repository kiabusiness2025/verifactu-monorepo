/**
 * Sistema Híbrido de IA para Isaak
 *
 * Soporta múltiples modelos según la tarea:
 * - Gemini Flash: rápido, gratuito, consultas generales
 * - GPT-4: más potente, consultas complejas
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { callOpenAIResponses, resolveOpenAIKey } from '@verifactu/utils';

// Habilitar telemetría de Firebase solo en runtime (no en build)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    void import('@genkit-ai/firebase').then(({ enableFirebaseTelemetry }) => {
      enableFirebaseTelemetry({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    });
  } catch (error) {
    // Silently fail - telemetry es opcional
  }
}

// Tipos de modelos disponibles
export type AIModel = 'gemini-flash' | 'gpt-4' | 'auto';

// Configuración de modelos
const MODELS = {
  'gemini-flash': {
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    cost: 'gratis',
    speed: 'rápido',
    bestFor: ['consultas generales', 'respuestas rápidas', 'FAQ'],
  },
  'gpt-4': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    cost: 'pago',
    speed: 'medio',
    bestFor: ['análisis contable', 'cálculos complejos', 'consultas fiscales específicas'],
  },
};

// Función para chat con Gemini
async function chatWithGemini(userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildIsaakPrompt(userMessage);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  });

  return result.response.text();
}

// Función para chat con GPT-4
async function chatWithGPT4(userMessage: string): Promise<string> {
  const OPENAI_API_KEY = resolveOpenAIKey(process.env);

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurado');
  }

  const prompt = buildIsaakPrompt(userMessage);

  return callOpenAIResponses({
    apiKey: OPENAI_API_KEY,
    model: process.env.ISAAK_OPENAI_MODEL || 'gpt-4.1-mini',
    inputText: prompt,
    temperature: 0.7,
    maxOutputTokens: 500,
  });
}

// Prompt base para Isaak (compartido entre modelos)
function buildIsaakPrompt(userMessage: string): string {
  return `Eres Isaak, un asistente experto en contabilidad, fiscalidad y VeriFactu en España.
Tu objetivo es ayudar a autónomos y pequeñas empresas a entender sus obligaciones fiscales con un tono calmado y cercano.

Contexto del usuario:
- Usa Verifactu Business para gestionar ventas, gastos y beneficios
- Necesita cumplir con la normativa VeriFactu de la AEAT
- Busca tranquilidad y claridad, no tecnicismos complejos

Usuario pregunta: ${userMessage}

Responde de forma clara, directa y tranquilizadora. Si no conoces la respuesta exacta, indícalo y sugiere consultar con un asesor.`;
}

// Detectar complejidad de la consulta para selección automática
function detectComplexity(message: string): 'simple' | 'complex' {
  const complexKeywords = [
    'cálculo',
    'calcular',
    'impuesto',
    'iva',
    'irpf',
    'retención',
    'tributación',
    'modelo',
    'declaración',
    'deducción',
    'amortización',
    'normativa',
    'legal',
    'obligación',
    'sanción',
    'plazo',
    'porcentaje',
  ];

  const lowerMessage = message.toLowerCase();
  const hasComplexKeywords = complexKeywords.some((keyword) => lowerMessage.includes(keyword));
  const isLong = message.length > 150;

  return hasComplexKeywords || isLong ? 'complex' : 'simple';
}

/**
 * Chat con Isaak usando el modelo apropiado
 *
 * @param userMessage - Mensaje del usuario
 * @param modelPreference - Modelo preferido o 'auto' para selección automática
 * @returns Respuesta de Isaak con metadata del modelo usado
 */
export async function isaakChat(
  userMessage: string,
  modelPreference: AIModel = 'auto'
): Promise<{ text: string; model: string }> {
  try {
    let selectedModel: 'gemini-flash' | 'gpt-4';

    // Selección de modelo
    if (modelPreference === 'auto') {
      const complexity = detectComplexity(userMessage);
      selectedModel = complexity === 'complex' ? 'gpt-4' : 'gemini-flash';
      console.log(`[Isaak] Auto-selección: ${selectedModel} (complejidad: ${complexity})`);
    } else {
      selectedModel = modelPreference as 'gemini-flash' | 'gpt-4';
    }

    // Ejecutar con el modelo seleccionado
    let text: string;
    if (selectedModel === 'gemini-flash') {
      text = await chatWithGemini(userMessage);
    } else {
      text = await chatWithGPT4(userMessage);
    }

    console.log(`[Isaak] Respuesta generada con ${MODELS[selectedModel].name}`);

    return { text, model: selectedModel };
  } catch (error) {
    console.error('Error en isaakChat:', error);

    // Fallback: si falla el modelo seleccionado, intentar con el otro
    if (modelPreference === 'gpt-4') {
      console.log('[Isaak] Fallback a Gemini');
      const text = await chatWithGemini(userMessage);
      return { text, model: 'gemini-flash' };
    }

    throw error;
  }
}
