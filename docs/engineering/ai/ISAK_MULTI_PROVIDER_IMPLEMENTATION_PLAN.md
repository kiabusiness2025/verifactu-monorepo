# Plan de implementación

## Isaak AI multi-provider: OpenAI + Claude

## Meta

Permitir que Isaak use OpenAI y Claude con una arquitectura común, empezando por los flujos que ya son compatibles con AI Gateway y reduciendo progresivamente el acoplamiento a OpenAI.

---

## Fase 0. Preparación

### Paso 0.1 — Confirmar alcance inicial

Definir qué entra en la primera versión:

- `/api/chat`
- rutas de admin/chat
- herramientas tool-heavy
- utilidades compartidas en `packages/utils`

**Resultado esperado**
Una lista cerrada de rutas y módulos a migrar primero.

### Paso 0.2 — Identificar dependencias actuales

Revisar y documentar:

- dónde se usa `apps/app/lib/ai-gateway.ts`
- dónde se usa `packages/utils/openai-responses.ts`
- qué variables de entorno intervienen
- qué modelos están hardcodeados

**Resultado esperado**
Mapa de call sites y dependencias por archivo.

**Resultado obtenido (2026-04-20)**

7 call sites activos, todos via `callOpenAIResponses`:

| Archivo                                             | Patrón                                        |
| --------------------------------------------------- | --------------------------------------------- |
| `apps/app/app/api/chat/route.ts`                    | Híbrido: OpenAI directo + fallback AI Gateway |
| `apps/isaak/app/api/chat/route.ts`                  | OpenAI Responses directo                      |
| `apps/isaak/app/api/holded/chat/route.ts`           | OpenAI Responses directo                      |
| `apps/landing/app/api/chat/route.ts`                | OpenAI Responses directo (mock en dev)        |
| `apps/admin/app/api/admin/chat/route.ts`            | OpenAI Responses + fallback rule-based        |
| `apps/app/app/api/webhooks/resend/inbound/route.ts` | OpenAI Responses directo                      |
| `apps/landing/lib/genkit-hybrid.ts`                 | OpenAI Responses directo                      |

Modelo hardcodeado: `gpt-4.1-mini` (override via `ISAAK_OPENAI_MODEL`)

---

## Fase 1. Diseñar la capa común

### Paso 1.1 — Crear carpeta de integración común ✅

```
packages/utils/ai/
  index.ts
  types.ts
  config.ts
  errors.ts
  call-llm.ts
  normalize-response.ts
  provider-router.ts
  gateway-adapter.ts      (pendiente)
  openai-adapter.ts       (pendiente)
  anthropic-adapter.ts    (pendiente, solo si hace falta)
```

### Paso 1.2 — Definir tipos normalizados ✅

Tipos comunes para:

- `AIProvider` — provider
- `AIMessage` — mensajes
- `AIResponseFormat` — formato de respuesta
- `CallLLMParams` — parámetros de entrada normalizados
- `NormalizedLLMResponse` — respuesta normalizada
- `AIError` / `AIErrorKind` — errores normalizados

**Resultado esperado**
Todos los proveedores comparten el mismo contrato.

### Paso 1.3 — Definir política de configuración ✅

Establecer defaults:

- proveedor por defecto: `ISAAK_AI_PROVIDER_DEFAULT` (default `openai`)
- modelo por defecto: `ISAAK_AI_MODEL_DEFAULT` → `ISAAK_OPENAI_MODEL` → `gpt-4.1-mini`
- modelo Claude recomendado: `ISAAK_AI_MODEL_CLAUDE_DEFAULT` → `claude-3-5-sonnet-20241022`
- fallback: encadenado por config
- temperatura / tokens: opcionales en `CallLLMParams`

**Resultado esperado**
La configuración deja de estar dispersa.

---

## Fase 2. Encapsular OpenAI actual

### Paso 2.1 — Convertir openai-responses.ts en adapter

No romper el código actual todavía. Crear un adapter que reutilice esa lógica:

- `openai-adapter.ts`

Debe exponer una función estándar que devuelva respuesta normalizada.

**Resultado esperado**
OpenAI queda detrás de una interfaz común.

### Paso 2.2 — Mantener compatibilidad temporal

Permitir que el código antiguo siga funcionando mientras se migra.

**Resultado esperado**
Sin ruptura de producción.

### Paso 2.3 — Añadir tests del adapter OpenAI

Cubrir:

- texto libre
- JSON estructurado
- errores HTTP
- respuesta vacía
- extracción de texto

**Resultado esperado**
Base segura antes de introducir Claude.

---

## Fase 3. Incorporar Claude

### Paso 3.1 — Elegir estrategia Claude

**Opción A — Claude vía AI Gateway**
Ventajas: menos código específico, mejor observabilidad, rollout más rápido

**Opción B — Claude con adapter Anthropic directo**
Ventajas: control total del payload, menos dependencia del gateway

**Recomendación**
Empezar por A para las rutas compatibles.

### Paso 3.2 — Crear gateway-adapter.ts

Responsable de enrutar llamadas a modelos tipo:

- `openai/...`
- `anthropic/...`

**Resultado esperado**
Un único adapter multi-modelo para los flujos compatibles con gateway.

### Paso 3.3 — Crear anthropic-adapter.ts solo si hace falta

Añadirlo únicamente si alguna feature necesita comportamiento específico de Anthropic que el gateway no cubra bien.

**Resultado esperado**
Evitar complejidad prematura.

### Paso 3.4 — Definir modelos iniciales

- OpenAI: `openai/gpt-4-turbo` o equivalente actual (`gpt-4.1-mini`)
- Claude: `anthropic/claude-3-5-sonnet-20241022`

---

## Fase 4. Crear router unificado

### Paso 4.1 — Implementar provider-router.ts ✅

Reglas:

- si `provider=gateway` → gateway-adapter
- si `provider=openai` → openai-adapter
- si `provider=anthropic` → anthropic-adapter o gateway según política
- si model string contiene `/` → gateway
- si model empieza por `claude` → anthropic
- si no se especifica → config por defecto

### Paso 4.2 — Implementar call-llm.ts ✅

```ts
const result = await callLLM({
  provider: 'gateway',
  model: 'anthropic/claude-3-5-sonnet-20241022',
  instructions,
  messages,
  responseFormat: 'text',
});
```

---

## Fase 5. Migrar features

### Paso 5.1 — Migrar /api/chat

Actualizar la ruta para usar `callLLM`. Validar: streaming, tools, prompts, errores.

### Paso 5.2 — Migrar herramientas y utilidades compartidas

Toda feature que hoy importe OpenAI directamente debe pasar por la capa común.

### Paso 5.3 — Revisar packages/utils/index.ts

Exportar la nueva capa común y marcar `openai-responses.ts` como legacy interno.

---

## Fase 6. Configuración y despliegue

### Paso 6.1 — Variables de entorno nuevas

```
ISAAK_AI_PROVIDER_DEFAULT=openai
ISAAK_AI_MODEL_DEFAULT=gpt-4.1-mini
ISAAK_AI_MODEL_CLAUDE_DEFAULT=anthropic/claude-3-5-sonnet-20241022
ISAAK_ANTHROPIC_API_KEY=...
```

### Paso 6.2 — Flags de rollout

Flag simple para cambiar provider por entorno o tenant:

- dev con Claude
- prod con OpenAI
- A/B por porcentaje o por customer

### Paso 6.3 — Logging y observabilidad

Registrar: provider, model, latency, error type, fallback usado.

---

## Fase 7. QA y validación

### Paso 7.1 — Matriz de pruebas

| Feature              | OpenAI | Claude | Gateway |
| -------------------- | ------ | ------ | ------- |
| chat básico          |        |        |         |
| JSON estructurado    |        |        |         |
| tool calling         |        |        |         |
| instrucciones system |        |        |         |
| streaming            |        |        |         |

### Paso 7.2 — Pruebas de regresión

Comparar resultados frente a la implementación actual.

### Paso 7.3 — Ajuste de prompts

Tener una capa de prompt tuning si Claude necesita cambios respecto a GPT.

---

## Fase 8. Limpieza final

### Paso 8.1 — Marcar legacy

Documentar `openai-responses.ts` como compatibilidad temporal.

### Paso 8.2 — Eliminar acoplamientos innecesarios

Una vez migradas las rutas, retirar llamadas directas que ya no hagan falta.

### Paso 8.3 — Actualizar documentación

README del integrador, guía de despliegue, guía de troubleshooting, guía de modelos recomendados.

---

## Milestones

### Milestone 1 — Claude operativo en /api/chat

Incluye: capa común mínima, gateway adapter, config básica, cambio de modelo por flag, pruebas funcionales.

**Definición de hecho:** `/api/chat` funciona con OpenAI o Claude sin cambiar la lógica de negocio.

### Milestone 2 — Desacoplamiento de OpenAI Responses

Incluye: adapter OpenAI, router unificado, migración de utilidades compartidas, normalización de errores y respuestas.

**Definición de hecho:** La aplicación no llama OpenAI directo desde la capa de producto.

### Milestone 3 — Multi-provider estable

Incluye: rollout configurable, observabilidad, fallback, documentación cerrada, limpieza legacy.

**Definición de hecho:** El integrador soporta OpenAI y Claude de forma mantenible.
