# AI Gateway - Configuración y Uso

## ¿Qué es AI Gateway?

AI Gateway de Vercel te permite:

- ✅ Cambiar entre **100+ modelos** sin código adicional
- ✅ Un único punto de autenticación (una sola clave API)
- ✅ Logging y monitoreo centralizado
- ✅ Rate limiting y failover automático
- ✅ Soporte para OpenAI, Anthropic, xAI, Google y más

## Estado Actual en Verifactu

| Componente        | Estado         | Detalles                              |
| ----------------- | -------------- | ------------------------------------- |
| Clave API         | ✅ Configurada | `CLAVE_API_AI_VERCEL` en `.env.local` |
| Endpoint de chat  | ✅ Configurado | `/api/chat` usa AI Gateway            |
| Logs en Vercel    | 📊 Disponibles | Dashboard de AI Gateway en Vercel     |
| Modelos múltiples | 📖 Documentado | `lib/ai-gateway.ts` con configuración |

## Clave API

Tu clave de AI Gateway:

```
vck_5EGDA4EFpVotU1VYVM9OZ2P3zFYpr01oJG2fKCKd0dWYN2kwqn1HR4qa
```

Guardada en: `.env.local` como `CLAVE_API_AI_VERCEL`

## Modelos Disponibles

### OpenAI (Recomendado para Isaak)

```typescript
'openai/gpt-4-turbo'; // Mejor para análisis contable
'openai/gpt-4'; // Más potente, más caro
'openai/gpt-3.5-turbo'; // Más rápido, más barato
```

### Anthropic (Claude)

```typescript
'anthropic/claude-3-opus'; // Mejor reasoning
'anthropic/claude-3-sonnet'; // Balance velocidad-calidad
'anthropic/claude-3-haiku'; // Más rápido
```

### xAI (Grok)

```typescript
'xai/grok-2'; // Reasoning y análisis general
```

### Google (Gemini)

```typescript
'google/gemini-pro'; // Rápido y económico
```

## Configuración Actual del Chat

El endpoint `/api/chat` está configurado para:

1. Usar AI Gateway como base URL: `https://ai-gateway.vercel.sh/v1`
2. Autenticar con `CLAVE_API_AI_VERCEL`
3. Usar `gpt-4-turbo` por defecto
4. Fallback a OpenAI directo si no hay clave

```typescript
// apps/app/app/api/chat/route.ts
const aiGatewayClient = createOpenAI({
  apiKey: process.env.CLAVE_API_AI_VERCEL,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const result = await streamText({
  model: aiGatewayClient('openai/gpt-4-turbo'),
  system: buildIsaakSystem(contextType),
  messages,
});
```

## Cambiar de Modelo

Para usar un modelo diferente en el chat:

```typescript
// En /api/chat/route.ts
// Opción 1: Cambiar globalmente
model: aiGatewayClient('anthropic/claude-3-sonnet'),

// Opción 2: Basado en contexto
const modelMap = {
  'dashboard': 'openai/gpt-4-turbo',
  'landing': 'openai/gpt-3.5-turbo',
  'admin': 'anthropic/claude-3-opus',
};
model: aiGatewayClient(modelMap[contextType]),
```

## Ver Logs en Vercel

1. Ir a: https://vercel.com/dashboard
2. Proyecto: `verifactu-monorepo`
3. Menú izquierdo: **AI Gateway**
4. Ver:
   - Solicitudes procesadas
   - Costos por modelo
   - Latencia y errores
   - Uso por aplicación

## Ejemplo de Uso Completo

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const apiKey = process.env.CLAVE_API_AI_VERCEL;

  if (!apiKey) {
    throw new Error('AI Gateway key not found');
  }

  const aiClient = createOpenAI({
    apiKey,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const { messages } = await req.json();

  const result = await streamText({
    model: aiClient('openai/gpt-4-turbo'),
    system: 'Eres Isaak, asistente experto en contabilidad...',
    messages,
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
```

## Comparar Modelos

| Modelo          | Coste | Velocidad  | Contexto | Mejor para               |
| --------------- | ----- | ---------- | -------- | ------------------------ |
| GPT-4 Turbo     | $     | Normal     | 128k     | **Análisis contable** ✅ |
| GPT-4           | $$    | Lento      | 8k       | Tareas muy complejas     |
| GPT-3.5 Turbo   | $     | Rápido     | 4k       | Respuestas rápidas       |
| Claude 3 Opus   | $$    | Normal     | 200k     | Reasoning profundo       |
| Claude 3 Sonnet | $     | Rápido     | 200k     | Balance general          |
| Claude 3 Haiku  | $     | Muy rápido | 200k     | Respuestas inmediatas    |
| Grok 2          | $     | Normal     | 128k     | Reasoning y análisis     |
| Gemini Pro      | $     | Rápido     | 32k      | Económico y rápido       |

## Próximos Pasos

- [ ] **Monitorear costos** en Vercel AI Gateway
- [ ] **A/B Testing**: Comparar GPT-4 vs Claude para análisis contable
- [ ] **Optimizar prompts**: Diferentes sistemas para cada modelo
- [ ] **Rate limiting**: Configurar límites en Vercel si es necesario
- [ ] **Caché**: Implementar caché de respuestas comunes

## Referencias

- [Documentación Oficial](https://vercel.com/docs/ai-gateway)
- [Modelos Soportados](https://vercel.com/docs/ai-gateway#models)
- [Precios](https://vercel.com/docs/ai-gateway#pricing)
- [Dashboard](https://vercel.com/dashboard)
