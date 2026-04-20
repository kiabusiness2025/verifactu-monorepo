# Isaak AI Integrator

## OpenAI + Claude via AI Gateway y adapters por proveedor

## Objetivo

Este integrador unifica el acceso de Isaak a modelos de IA de distintos proveedores, con foco inicial en:

- OpenAI
- Anthropic Claude

El objetivo es permitir que las rutas y herramientas de Isaak usen una interfaz común, evitando acoplar el producto a un proveedor concreto y facilitando:

- cambio de modelo por configuración
- A/B testing entre proveedores
- control de costes y latencia
- fallback entre proveedores
- evolución futura hacia más modelos

---

## Estado actual del repo

Actualmente conviven dos patrones:

### 1. Capa multi-provider mediante AI Gateway

Archivo principal:

- `apps/app/lib/ai-gateway.ts`

Esta capa ya permite trabajar con modelos identificados por proveedor/modelo, por ejemplo:

- `openai/gpt-4-turbo`
- `xai/grok-2`
- `google/gemini-pro`

La documentación del proyecto ya contempla Anthropic/Claude en esta estrategia.

### 2. Capa específica de OpenAI Responses

Archivo principal:

- `packages/utils/openai-responses.ts`

Esta utilidad llama directamente a la API de OpenAI Responses y está acoplada a:

- endpoint
- autenticación
- formato de request
- formato de response

Por tanto, no sirve como base neutral para Claude sin adaptación.

---

## Principios de diseño

1. **Provider-agnostic en la capa de aplicación**
   Las rutas y features no deben conocer detalles internos de OpenAI o Anthropic.

2. **Adapters por proveedor**
   Cada proveedor implementa su propia traducción de:
   - mensajes
   - instrucciones
   - JSON estructurado
   - tools
   - parsing de respuesta
   - errores

3. **AI Gateway como opción preferente**
   Para los flujos compatibles, se prioriza el uso de AI Gateway por:
   - observabilidad
   - switching de modelos
   - centralización
   - menor dependencia de un proveedor

4. **OpenAI directo solo donde sea necesario**
   Los flujos específicos de OpenAI Responses deben quedar encapsulados y claramente marcados.

5. **Configuración por modelo y proveedor**
   La elección de proveedor/modelo no debe ir hardcoded en múltiples sitios.

---

## Arquitectura objetivo

### Capa 1. API / Feature layer

Ejemplos:

- `/api/chat`
- herramientas contables
- asistentes operativos
- análisis y clasificación

Esta capa llama a una interfaz común como:

```ts
callLLM({
  provider: 'openai' | 'anthropic',
  model: '...',
  instructions: '...',
  messages: [...],
  responseFormat: 'text' | 'json_object',
  tools: [...],
})
```

### Capa 2. Integrador común

Responsable de:

- validar parámetros
- seleccionar adapter
- resolver credenciales
- aplicar defaults
- normalizar errores
- devolver una respuesta estándar

### Capa 3. Adapters por proveedor

Ejemplos:

- `openai-adapter.ts`
- `anthropic-adapter.ts`
- `gateway-adapter.ts`

Cada adapter implementa la traducción técnica a su proveedor.

### Capa 4. Configuración

Responsable de:

- modelo por entorno
- proveedor por feature
- flags de rollout
- fallback
- límites de coste

---

## Estructura sugerida

```
packages/
  utils/
    ai/
      index.ts
      types.ts
      config.ts
      errors.ts
      gateway-adapter.ts
      openai-adapter.ts
      anthropic-adapter.ts
      provider-router.ts
      call-llm.ts
      normalize-response.ts
```

---

## Tipos sugeridos

```ts
export type AIProvider = 'openai' | 'anthropic' | 'gateway';

export type AIResponseFormat = 'text' | 'json_object';

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type CallLLMParams = {
  provider?: AIProvider;
  model?: string;
  instructions?: string;
  messages?: AIMessage[];
  inputText?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: AIResponseFormat;
};

export type NormalizedLLMResponse = {
  text: string;
  provider: AIProvider;
  model: string;
  raw?: unknown;
};
```

---

## Estrategia recomendada

### Fase 1. Aprovechar AI Gateway para Claude

Primer objetivo:

- habilitar Claude donde ya existe compatibilidad multi-provider
- minimizar cambios funcionales
- validar calidad, coste y latencia

### Fase 2. Desacoplar OpenAI Responses

Crear una interfaz neutral para que la aplicación no llame directamente a:

- `openai-responses.ts`

### Fase 3. Añadir Claude como provider real

Implementar adapter de Anthropic o enrutar por gateway según el caso.

### Fase 4. Unificar configuración y observabilidad

Consolidar:

- selección de modelos
- logs
- errores
- métricas
- fallback

---

## Archivos actuales relevantes

### Multi-provider / Gateway

- `apps/app/lib/ai-gateway.ts`

### OpenAI específico

- `packages/utils/openai-responses.ts`

### Export común actual

- `packages/utils/index.ts`

### Documentación existente

- `docs/engineering/ai/AI_GATEWAY_SUMMARY.txt`
- `docs/engineering/ai/ISAAK_AI_INTEGRATION.md`

---

## Variables de entorno

### Existentes

```
CLAVE_API_AI_VERCEL
ISAAK_NEW_OPENAI_API_KEY
```

### Nuevas recomendadas

```
ISAAK_AI_PROVIDER_DEFAULT=gateway
ISAAK_AI_MODEL_DEFAULT=openai/gpt-4-turbo
ISAAK_AI_MODEL_CLAUDE_DEFAULT=anthropic/claude-3-sonnet
ISAAK_ANTHROPIC_API_KEY=...   # solo si no se usa gateway para Claude
```

---

## Reglas de uso

### Usar AI Gateway cuando:

- el flujo ya usa Vercel AI SDK
- el modelo se puede seleccionar como `provider/model`
- se necesita observabilidad centralizada
- se quiere cambiar de modelo sin rehacer la feature

### Usar adapter específico cuando:

- el flujo depende de una API concreta del proveedor
- se necesita un formato que gateway no cubre bien
- se requiere un comportamiento especial del proveedor

### No hacer

- no llamar OpenAI directo desde rutas de producto sin pasar por la capa común
- no hardcodear modelos en múltiples archivos
- no mezclar lógica de negocio con detalles del proveedor

---

## Contrato de respuesta normalizado

Todos los adapters deben devolver:

```json
{
  "text": "string",
  "provider": "openai | anthropic | gateway",
  "model": "string",
  "raw": "unknown (opcional)"
}
```

Así la capa de aplicación no depende del formato interno de cada proveedor.

---

## Migración desde openai-responses.ts

### Antes

```ts
const text = await callOpenAIResponses({
  apiKey,
  instructions,
  messages,
  responseFormat: 'json_object',
});
```

### Después

```ts
const result = await callLLM({
  provider: 'gateway',
  model: 'anthropic/claude-3-sonnet',
  instructions,
  messages,
  responseFormat: 'json_object',
});

const text = result.text;
```

---

## Riesgos conocidos

- Claude y OpenAI no responden exactamente igual
- el JSON estructurado puede requerir ajustes por proveedor
- el tool calling puede variar
- prompts optimizados para GPT pueden necesitar tuning en Claude
- coexistirán dos capas durante una fase de transición

---

## Criterios de éxito

Se considerará completada la integración cuando:

- `/api/chat` pueda funcionar con OpenAI o Claude por configuración
- exista una interfaz común para llamadas LLM
- no haya rutas de producto llamando OpenAI directo sin wrapper común
- los errores estén normalizados
- haya documentación operativa y de despliegue
- exista una matriz básica de testing por proveedor

---

## Próximos pasos inmediatos

1. crear la carpeta `packages/utils/ai/`
2. definir tipos comunes
3. crear `call-llm.ts`
4. encapsular `openai-responses.ts` como adapter
5. añadir adapter Claude o gateway
6. migrar `/api/chat`
7. documentar configuración y rollout
