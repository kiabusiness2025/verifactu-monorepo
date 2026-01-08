# Configuración Genkit AI + Firebase Telemetry

Este documento explica cómo está configurado Genkit AI con Firebase Telemetry para el chat de Isaak.

## ¿Qué es Genkit?

[Genkit](https://firebase.google.com/docs/genkit) es un framework de Firebase para crear aplicaciones con IA generativa. Proporciona:

- Flujos (flows) para orquestar llamadas a modelos de IA
- Telemetría integrada con Firebase
- Soporte para múltiples proveedores de IA (Google AI, OpenAI, etc.)
- Tracing y debugging de prompts

## Arquitectura actual

```
Usuario → IsaakChat → /api/chat → isaakChatFlow (Genkit) → Google AI (Gemini) → Respuesta
                                         ↓
                                  Firebase Telemetry
```

## Archivos de configuración

### `lib/genkit.ts`

Configuración principal de Genkit:

```typescript
import { genkit } from '@genkit-ai/core';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/googleai';

// Habilitar telemetría de Firebase
enableFirebaseTelemetry();

// Configurar Genkit con Google AI
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_AI_API_KEY })],
  model: 'googleai/gemini-1.5-flash',
});
```

### `app/api/chat/route.ts`

Endpoint que usa el flow de Genkit:

```typescript
import { isaakChatFlow } from "@/lib/genkit";

const text = await isaakChatFlow(userMessage);
```

## Variables de entorno requeridas

### `GOOGLE_AI_API_KEY` (Requerida)

API Key de Google AI para usar Gemini.

**Obtener API Key:**
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la clave y configúrala en Vercel

**En Vercel:**
- Settings → Environment Variables
- Name: `GOOGLE_AI_API_KEY`
- Value: `tu-api-key-aquí`
- Environments: Production, Preview, Development

**En desarrollo local:**

Añade a `apps/landing/.env.local`:

```bash
GOOGLE_AI_API_KEY=tu-api-key-aquí
```

## Telemetría con Firebase

La telemetría de Firebase captura:

- **Latencia**: tiempo de respuesta de cada llamada a IA
- **Tokens**: tokens de input/output consumidos
- **Errores**: fallos en llamadas a modelos
- **Tracing**: flujo completo de ejecución

### Ver telemetría

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Extensiones → Genkit (si instalaste la extensión)
4. O bien Analytics → Events para ver eventos personalizados

## Modelo usado: Gemini 1.5 Flash

- **Modelo**: `googleai/gemini-1.5-flash`
- **Tokens máximos**: 500 (ajustable)
- **Temperatura**: 0.7 (creatividad moderada)
- **Ventajas**:
  - Rápido (< 1s latencia)
  - Gratuito hasta 15 req/min
  - Multimodal (texto, imágenes)
  - Contexto largo (1M tokens)

## Personalización del prompt

El prompt de Isaak está en `lib/genkit.ts`:

```typescript
const prompt = `Eres Isaak, un asistente experto en contabilidad, fiscalidad y VeriFactu en España.
Tu objetivo es ayudar a autónomos y pequeñas empresas...`;
```

**Para modificar el comportamiento:**
1. Edita el prompt en `lib/genkit.ts`
2. Ajusta `temperature` (0.0 = determinista, 1.0 = creativo)
3. Ajusta `maxOutputTokens` (longitud máxima de respuesta)

## Migración desde OpenAI

Antes usábamos OpenAI directamente:

```typescript
// ANTES
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: `Bearer ${ISAAK_API_KEY}` },
  body: JSON.stringify({ model: "gpt-4-turbo", messages: [...] }),
});
```

**Ahora con Genkit:**
- ✅ Telemetría automática
- ✅ Caching de prompts
- ✅ Tracing de flujos
- ✅ Más económico (Gemini Flash es gratis)
- ✅ Misma calidad de respuestas

## Troubleshooting

### Error: "GOOGLE_AI_API_KEY no configurado"

Verifica que la variable esté en Vercel o en tu `.env.local`.

### Error: "403 Forbidden" al llamar a Google AI

- Verifica que la API key sea válida
- Confirma que la API de Google AI esté habilitada
- Revisa que no hayas superado el límite de llamadas (15/min gratis)

### Respuestas lentas

Gemini Flash es muy rápido (<1s). Si notas lentitud:
- Verifica la conexión a internet
- Revisa Firebase Telemetry para ver latencias
- Considera usar `gemini-1.5-pro` si necesitas respuestas más completas

### Logs y debugging

En desarrollo, Genkit imprime logs detallados:

```bash
pnpm dev
# Verás logs como:
# [Genkit] Flow started: isaakChat
# [Genkit] Model called: googleai/gemini-1.5-flash
# [Genkit] Tokens: 50 in, 200 out
```

## Próximos pasos

- [ ] Implementar caché de respuestas frecuentes
- [ ] Añadir contexto del usuario (empresa, CIF, subscription)
- [ ] Integrar con base de datos para respuestas personalizadas
- [ ] Añadir RAG con documentación de VeriFactu
- [ ] Implementar rate limiting por usuario

## Recursos

- [Genkit Docs](https://firebase.google.com/docs/genkit)
- [Google AI Studio](https://makersuite.google.com/)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Firebase Telemetry](https://firebase.google.com/docs/genkit/firebase)
