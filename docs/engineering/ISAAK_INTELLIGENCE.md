# Isaak Intelligence — Manifiesto técnico

> Documento maestro de la inteligencia de Isaak. Define visión, arquitectura, roadmap
> e instrumentación para evolucionar el chat actual hacia un orquestador real con
> herramientas, memoria, criterio y aprendizaje continuo.
>
> Última actualización: 2026-05-24 · Estado: F1 pendiente · Owner: ingeniería Isaak

---

## Índice

**Parte 1 — Ejecutivo**
1. [Visión y principios](#1-visión-y-principios)
2. [Estrategia multi-provider](#2-estrategia-multi-provider)
3. [Pilares de inteligencia](#3-pilares-de-inteligencia)
4. [Roadmap por fases](#4-roadmap-por-fases)
5. [Métricas de éxito](#5-métricas-de-éxito)
6. [Riesgos y mitigaciones](#6-riesgos-y-mitigaciones)
7. [Modelo de costes](#7-modelo-de-costes)
8. [Preguntas abiertas](#8-preguntas-abiertas)

**Parte 2 — Apéndice técnico**
- [A1. Arquitectura del loop](#a1-arquitectura-del-loop)
- [A2. Esquemas de BD nuevos](#a2-esquemas-de-bd-nuevos)
- [A3. Snippets de prompts clave](#a3-snippets-de-prompts-clave)
- [A4. Pseudocódigo del orquestador](#a4-pseudocódigo-del-orquestador)
- [A5. Metodología de testing](#a5-metodología-de-testing)
- [A6. Golden set semilla](#a6-golden-set-semilla)
- [A7. Métricas baseline — cómo medir](#a7-métricas-baseline--cómo-medir)

---

# Parte 1 — Ejecutivo

## 1. Visión y principios

### Qué entendemos por "Isaak inteligente"

Isaak no es un chatbot de Q&A. Es un **orquestador con herramientas, memoria y criterio**
que actúa como copiloto fiscal/operativo. La diferencia respecto a un GPT genérico:

- Habla con **datos reales del tenant** (Holded, banca, Verifactu) — nada inventado.
- **Recuerda** la conversación y los hechos del negocio entre sesiones.
- **Pregunta** cuando la solicitud es ambigua, en lugar de adivinar.
- Puede **ejecutar acciones** (emitir factura, registrar pago, crear contacto) bajo confirmación.
- **Aprende** de los pulgares arriba/abajo de cada tenant.

### Los 5 principios rectores

1. **Datos reales, no alucinaciones.** Todo dato fiscal, contable o financiero proviene
   de una tool call verificable. Si no hay tool → Isaak dice "no tengo acceso a ese dato"
   en lugar de inventar.

2. **Pregunta antes de asumir.** Ante ambigüedad de período, cliente, importe o intención,
   Isaak responde primero con una aclaración estructurada (botones/opciones).

3. **Recuerda lo que pasó.** Memoria conversacional (últimos N turnos) + memoria larga
   (perfil, decisiones, preferencias por tenant) accesible vía RAG.

4. **Multi-modelo por tarea.** Cada modelo hace lo que mejor sabe — Claude orquesta y razona,
   GPT-4o ve imágenes y garantiza JSON, Haiku clasifica rápido.

5. **Aprende de feedback.** Cada 👍 se convierte en few-shot dinámico; cada 👎 dispara
   review humana para ajustar prompt o tool.

---

## 2. Estrategia multi-provider

Especialización por tarea — cada modelo donde brilla, sin doblar coste salvo en operaciones críticas.

### Matriz de routing

| Tarea | Modelo | Razón |
|-------|--------|-------|
| Orquestador principal + tool-calling | **Claude Sonnet 4.6** | Mejor tool-use estructurado, contexto largo, español nativo, razonamiento multi-paso |
| Clasificador de intent / ambigüedad | **Claude Haiku 4.5** | Latencia <500ms, coste 1/12 del Sonnet, suficiente para clasificación binaria |
| OCR de facturas (PDF/imagen → JSON estructurado) | **GPT-4o** | Visión más madura en tablas, sellos, manuscritos |
| Validación crítica (segundo opinion) antes de escribir en Holded | **GPT-4o-mini** | Cross-check independiente, distinto sesgo que Claude |
| JSON estricto con schema fijo (clarify responses, action confirmations) | **GPT-4o-mini** con `response_format: json_schema` | Garantía a nivel API, evita parsing frágil |
| Embeddings semánticos (búsqueda en histórico, RAG) | **text-embedding-3-small** | Coste imbatible, calidad >90% del large |
| Fallback automático cuando provider primario falla | Espejo (Claude↔GPT) | Resiliencia ante outages |

### Reglas de routing

```
1. Toda petición arranca por el clasificador (Haiku) → decide ruta
2. Si la ruta requiere tools → Claude Sonnet con tools
3. Si requiere visión → GPT-4o
4. Si requiere acción crítica (POST a Holded, envío email) → Claude ejecuta + GPT-4o-mini valida
5. Si Claude falla 2 veces → fallback automático a GPT-4o
6. Si GPT falla 2 veces (modo fallback) → respuesta degradada + alerta interna
```

### Decisión consciente: NO cross-validation por defecto

Validar cada respuesta en dos modelos dobla el coste sin justificación clara para queries
informativas. La validación cruzada se reserva a **acciones que escriben datos**
(crear factura, registrar pago, enviar email a cliente).

---

## 3. Pilares de inteligencia

Las seis capacidades que construimos por fases. Cada pilar es independiente pero se
refuerza con los demás.

### Pilar 1 — Memoria

- **Corto plazo**: últimos 8 mensajes (4 turnos) inyectados en cada llamada.
- **Largo plazo**: hechos persistentes del negocio (CIF, plan fiscal, cuentas bancarias
  vinculadas, preferencias del usuario) en tabla `IsaakLongTermMemory`.
- **Episódica**: resumen de conversaciones cerradas (>24h sin actividad) en formato compacto,
  para futuras referencias ("¿qué hablamos del IVA hace 3 semanas?").

### Pilar 2 — Herramientas reales (tool-calling)

Refactor de los **17 tools de Holded + 7 banca + 8 Google + 9 Microsoft + 5 Verifactu**
de "conocimiento implícito en el prompt" a **tools de Anthropic registrados**. El LLM
recibe el schema, decide cuándo invocar, y el código ejecuta+devuelve el resultado.

### Pilar 3 — Clarificación

Patrón "clarify-first":
1. Clasificador (Haiku) detecta ambigüedad → marca con tipo (`period`, `entity`, `intent`, `confirmation`).
2. Si ambiguo, Isaak responde con JSON estructurado: `{clarify: true, question, options}`.
3. Frontend renderiza opciones como chips/botones → 1 clic resuelve la ambigüedad.
4. Si la persona ignora las opciones y reescribe, el clasificador re-evalúa.

### Pilar 4 — Personalización dinámica

Hoy el prompt inyecta `communicationStyle: 'spanish_clear_non_technical'` igual para todos.
Evolución:
- **Estilo aprendido**: el `IsaakOnboardingProfile` se actualiza con cada interacción
  (si la persona usa lenguaje técnico, Isaak sube de `starter` a `intermediate`).
- **Tono por rol**: financiero recibe respuestas con KPIs y ratios; autónomo recibe
  acciones simples ("haz esto: …").
- **Contexto sector**: hostelería recibe ejemplos de su sector, no de logística.

### Pilar 5 — Criterio (judge model)

Antes de ejecutar acciones críticas, un segundo modelo valida:
- "¿La factura que va a crear coincide con lo que pidió el usuario?"
- "¿El importe es coherente con el histórico?"
- "¿El cliente existe?"

Si el judge discrepa → Isaak no ejecuta y pide confirmación explícita.

### Pilar 6 — Aprendizaje continuo

- **Feedback explícito** (👍/👎) ya capturado en tabla `IsaakFeedback`. Vamos a usarla.
- **Few-shot dinámico**: los 5 mejores 👍 del tenant se inyectan como ejemplos en
  el system prompt para preguntas similares (matching por embedding).
- **Eval semanal**: el equipo revisa los 👎 → ajusta prompts/tools.
- **Drift detection**: si la tasa de 👍 cae >10% semana a semana, alerta automática.

---

## 4. Roadmap por fases

Cada fase tiene **criterios de salida** medibles y **tests obligatorios** antes de mergear.

| Fase | Nombre | Foco | Duración estimada | Modelos involucrados |
|------|--------|------|---------------------|----------------------|
| **F1** | Foundation | Memoria + clarify + baseline + golden set | 1 sesión | Claude Sonnet |
| **F2** | Tool-calling read | Tools Holded read + banca read registrados | 1-2 sesiones | Claude Sonnet |
| **F3** | Multi-provider router | Haiku classifier + Sonnet main + fallback GPT | 1 sesión | Claude Haiku/Sonnet + GPT-4o |
| **F4** | Vision + judge | OCR GPT-4o + validación GPT-mini en writes | 2 sesiones | GPT-4o + GPT-4o-mini |
| **F5** | Streaming UX | SSE token-by-token + tool indicators en UI | 1 sesión | Claude Sonnet stream |
| **F6** | Long-term memory | Embeddings + RAG por tenant | 2 sesiones | text-embedding-3-small + Claude |
| **F7** | Feedback loop | Few-shot dinámico desde 👍 | 1 sesión | Embeddings + Claude |
| **F8** | Sub-agentes | Agentes especializados (fiscal, banca, gestión) | 3 sesiones | Claude (orquestador) + agentes |

### Criterios de salida por fase (resumen)

| Fase | Criterio principal | Test que debe pasar |
|------|--------------------|----------------------|
| F1 | Isaak no se repite ni se contradice en 4 turnos | `golden/multi-turn.test.ts` ≥85% |
| F2 | 0 alucinaciones de números/datos en 50 queries | `golden/no-hallucination.test.ts` 100% |
| F3 | Latencia P50 baja a <2s; coste/msg baja 30% | métricas `isaak_metrics` panel |
| F4 | OCR procesa 20 facturas reales con >95% accuracy | `golden/ocr.test.ts` ≥95% |
| F5 | Tiempo hasta primer token <800ms | métricas streaming |
| F6 | Isaak recupera contexto de hace >30 días con relevancia >0.8 | `golden/memory-long.test.ts` |
| F7 | Tasa 👍 sube ≥10% en tenants con >50 mensajes | métricas semanales |
| F8 | Sub-agente fiscal supera Sonnet plano en queries fiscales complejas | `golden/fiscal-deep.test.ts` |

---

## 5. Métricas de éxito

KPIs continuos. Panel en `/admin/isaak-intelligence` (a construir en F1).

| Métrica | Cómo se mide | Hoy (baseline a establecer) | Meta F2 | Meta F8 |
|---------|--------------|------------------------------|---------|---------|
| **Tasa de alucinación** | % respuestas con números/nombres no presentes en tool results | ~30% (estimado) | <10% | <2% |
| **Clarify-rate apropiado** | (clarificaciones disparadas correctamente) / (queries ambiguas) — auditoría manual semanal de 50 muestras | 0% | >70% | >90% |
| **Coherencia multi-turno** | % conversaciones sin contradicciones en eval LLM-as-judge | ~50% | >85% | >95% |
| **Latencia P50 (texto)** | tiempo total response | ~3s | <2s | <1.5s |
| **Tiempo hasta primer token** | sólo con streaming activo | N/A | <800ms | <500ms |
| **Coste por mensaje (€)** | suma tokens × precio provider | ~€0.012 | ~€0.008 | ~€0.005 |
| **Ratio 👍** | thumbs-up / (thumbs-up + thumbs-down) | desconocido | >60% | >80% |
| **Tool-call success rate** | tool_use sin errores / total tool_use | N/A (no hay tools) | >95% | >98% |

---

## 6. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Loop infinito de tool-calling | Alta | Hard cap 10 iteraciones, timeout 30s, alerta a Sentry |
| Claude/GPT discrepan en validación crítica | Media | Si validator dice NO → bloqueo, pregunta explícita al usuario |
| Costes se disparan con multi-provider | Media | Cache resultados tool 5 min, cache embeddings 24h, Haiku para clasificación barata |
| Streaming complica error handling | Baja | Usar Vercel AI SDK (probado), fallback a JSON si stream falla |
| Memoria larga filtra datos entre tenants | **Crítica** | Índice vectorial particionado por `tenantId`, tests de aislamiento en CI |
| Prompts cambian y baja la calidad | Media | Versionado de prompts + regression contra golden set en cada PR |
| Tool ejecuta acción no deseada (false positive de intent) | Alta | Todo write requiere `confirmed: true` explícito, judge model valida, UI confirma |
| Provider outage prolongado | Media | Fallback automático Claude↔GPT, status page externo, alerta SLA |

---

## 7. Modelo de costes

Estimación de coste mensual por escala de uso. Asumiendo precios actuales (2026-05):
- Claude Sonnet 4.6: $3/MTok in, $15/MTok out
- Claude Haiku 4.5: $0.25/MTok in, $1.25/MTok out
- GPT-4o: $2.50/MTok in, $10/MTok out
- GPT-4o-mini: $0.15/MTok in, $0.60/MTok out
- text-embedding-3-small: $0.020/MTok

### Escenarios por mensaje

| Tipo de query | Tokens in/out típicos | Modelos invocados | Coste/msg |
|---------------|------------------------|-------------------|-----------|
| Saludo simple | 200/100 | Haiku classifier + Sonnet | €0.0008 |
| Q&A fiscal sin tools | 800/300 | Haiku + Sonnet | €0.0048 |
| Q&A con 1 tool call | 1500/400 | Haiku + Sonnet (2 turns) | €0.012 |
| Q&A con 3 tool calls | 3000/600 | Haiku + Sonnet (4 turns) | €0.028 |
| Acción crítica (write Holded) | 2000/500 + 1500/200 validator | Haiku + Sonnet + GPT-mini | €0.020 |
| OCR factura | 50/800 (vision) + 1000/300 | GPT-4o + Sonnet | €0.012 |

### Proyección mensual

| Volumen | Mix típico | Coste estimado/mes |
|---------|-----------|---------------------|
| 1k mensajes | 60% Q&A + 30% tool + 10% crítica | ~€15 |
| 10k mensajes | mismo mix | ~€150 |
| 100k mensajes | mismo mix | ~€1,500 |

### Optimizaciones planificadas

- **Cache de tool results 5 min** → ahorro estimado 30% en queries repetidas (consultas a Holded misma sesión)
- **Cache de embeddings 24h** → ahorro 80% en RAG (mismo perfil de tenant)
- **Haiku para clasificación previa** → reduce llamadas Sonnet a la mitad
- **Plan-tiered model selection** → Free/Starter siempre Haiku, Pro+ Sonnet (ya implementado parcialmente)

---

## 8. Preguntas abiertas

Decisiones que necesitan input antes de implementación:

1. **Embeddings storage**: Postgres con `pgvector` (en infraestructura existente) o
   servicio externo (Pinecone, Turbopuffer, Qdrant)?
   - Recomendación: empezar con pgvector (cero infra nueva), migrar si latencia o escala lo justifica.

2. **Retención de memoria larga**: ¿meses o tokens?
   - Propuesta: retener 90 días para Free/Starter, 365 días para Pro+, ilimitado para Business+.

3. **OCR routing**: ¿GPT-4o directo o pasar por Mistral/Gemini para bajar coste?
   - Propuesta: empezar con GPT-4o (calidad probada), evaluar alternativas en F4 si coste molesta.

4. **Sub-agentes (F8)**: ¿en proceso (latencia OK) o background jobs (mejor para tareas largas)?
   - Propuesta: in-proceso para queries sincronas; background jobs solo para tareas >30s (auditorías masivas).

5. **Versionado de prompts**: ¿en BD para hot-swap o en código (Git)?
   - Propuesta: prompts en código (Git, revisable en PR), variantes A/B vía feature flag de tenant.

6. **Exposición del clarify a tools del chat**: ¿el LLM puede pedir aclaración aún DENTRO de un tool-calling loop, o solo al inicio?
   - Propuesta: solo al inicio en F1-F3; permitir mid-loop a partir de F4 si vemos casos reales.

---

---

# Parte 2 — Apéndice técnico

## A1. Arquitectura del loop

### Diagrama de flujo (texto)

```
[Usuario] → POST /api/chat { message, conversationId? }
              │
              ▼
[1. Auth + plan check]
              │
              ▼
[2. Cargar historial corto (últimos 8 msgs)]
              │
              ▼
[3. Classifier (Haiku)] ──→ ¿ambigüedad?
              │             ├─ SÍ → respond { clarify, question, options }
              │             │          └─ devolver al frontend (sin llamar al main LLM)
              │             └─ NO ↓
              │
              ▼
[4. Cargar memoria larga relevante (RAG si F6 activo)]
              │
              ▼
[5. Construir prompt: persona + ctx tenant + ctx conversación + few-shots]
              │
              ▼
[6. Main LLM (Claude Sonnet) con tools]
              │
       ┌──────┴───────┐
       │              │
       ▼              ▼
[respuesta texto]   [tool_use blocks]
       │              │
       │              ▼
       │       [Ejecutar tools en paralelo, max 5 concurrent]
       │              │
       │              ▼
       │       [Inyectar tool_result en messages]
       │              │
       │              ▼
       │       [Volver a paso 6 — max 10 iteraciones]
       │
       ▼
[7. ¿Acción crítica? → Judge (GPT-4o-mini) valida]
              │
              ▼
[8. Stream respuesta al frontend (SSE)]
              │
              ▼
[9. Persistir mensaje + tool calls + tokens + latencia]
              │
              ▼
[10. (Async) Si feedback 👎 → registrar para review]
```

### Componentes y responsabilidades

| Componente | Archivo (a crear/modificar) | Responsabilidad |
|------------|------------------------------|------------------|
| Endpoint chat | `apps/isaak/app/api/chat/route.ts` (refactor) | Orquesta todo el flujo |
| Classifier | `apps/isaak/app/lib/isaak-intent-classifier.ts` (nuevo) | Detecta ambigüedad con Haiku |
| Tools registry | `apps/isaak/app/lib/isaak-tools-registry.ts` (nuevo) | Unifica los tools de Holded/banca/Google/etc. en formato Anthropic |
| Tool executor | `apps/isaak/app/lib/isaak-tool-executor.ts` (nuevo) | Ejecuta tool calls con timeout, cache, errores |
| Judge | `apps/isaak/app/lib/isaak-judge.ts` (nuevo) | Valida acciones críticas con GPT-mini |
| Memory short | `apps/isaak/app/lib/isaak-memory-short.ts` (nuevo) | Carga últimos N mensajes |
| Memory long (RAG) | `apps/isaak/app/lib/isaak-memory-long.ts` (F6) | Embeddings + similarity search |
| Metrics | `apps/isaak/app/lib/isaak-metrics.ts` (nuevo) | Captura tokens, latencia, costes |

---

## A2. Esquemas de BD nuevos

### Tabla `IsaakChatMetric` (F1)

Registro de cada mensaje para métricas y análisis.

```prisma
model IsaakChatMetric {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String?  @map("tenant_id") @db.Uuid
  userId          String?  @map("user_id")
  conversationId  String?  @map("conversation_id") @db.Uuid

  modelUsed       String   @map("model_used")        // "claude-sonnet-4-6", "gpt-4o-mini", etc.
  inputTokens     Int      @map("input_tokens")
  outputTokens    Int      @map("output_tokens")
  estimatedCostEur Decimal @map("estimated_cost_eur") @db.Decimal(10, 6)

  latencyMs       Int      @map("latency_ms")
  firstTokenMs    Int?     @map("first_token_ms")    // sólo con streaming

  toolCallsCount  Int      @default(0) @map("tool_calls_count")
  toolNames       String[] @default([]) @map("tool_names")

  isClarification Boolean  @default(false) @map("is_clarification")
  isFallback      Boolean  @default(false) @map("is_fallback")
  errorCode       String?  @map("error_code")

  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId, createdAt])
  @@index([conversationId])
  @@map("isaak_chat_metrics")
}
```

### Tabla `IsaakLongTermMemory` (F6)

Hechos persistentes del tenant.

```prisma
model IsaakLongTermMemory {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  fact        String                                              // texto natural
  factType    String   @map("fact_type")                          // "preference", "history", "decision", "profile"
  embedding   Unsupported("vector(1536)")?                        // pgvector
  source      String                                              // "user", "tool_result", "feedback"
  sourceMsgId String?  @map("source_msg_id")
  confidence  Float    @default(1.0)
  expiresAt   DateTime? @map("expires_at") @db.Timestamptz        // según plan del tenant
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId])
  @@index([tenantId, factType])
  @@map("isaak_long_term_memory")
}
```

### Extensión a `IsaakFeedback` (F7)

Añadir campo para indexar embeddings de queries con 👍 alto.

```prisma
model IsaakFeedback {
  // ... campos existentes ...
  queryEmbedding   Unsupported("vector(1536)")? @map("query_embedding")
  fewShotEligible  Boolean @default(false) @map("few_shot_eligible")  // true si 👍 + query no sensible
}
```

---

## A3. Snippets de prompts clave

### A3.1 — System prompt base (refactor en F1)

```typescript
// apps/isaak/app/lib/isaak-prompts.ts
export function buildSystemPrompt(ctx: IsaakContext): string {
  return `Eres Isaak, copiloto fiscal e IA de empresa (${ctx.companyName ?? 'sin empresa'}).

CONTEXTO DEL TENANT
- Persona: ${ctx.userFirstName} · Rol: ${ctx.roleLabel} · Sector: ${ctx.sectorLabel}
- Plan: ${ctx.planCode}
- Holded: ${ctx.holdedConnected ? 'conectado' : 'no conectado'}
- Banca: ${ctx.bankConnected ? `${ctx.bankCount} cuenta(s) PSD2` : 'no conectada'}
- Verifactu (AEAT): ${ctx.verifactuActive ? 'activo' : 'pendiente'}
- Fecha actual: ${ctx.today}

PRINCIPIOS DE RESPUESTA
1. **Datos reales**: NUNCA inventes números, nombres de cliente, importes o fechas.
   Si necesitas un dato concreto, invoca el tool correspondiente.
   Si no hay tool disponible para ese dato, dilo: "No tengo ese dato accesible".

2. **Pregunta antes de asumir**: si la pregunta es ambigua, responde EXCLUSIVAMENTE con
   este JSON (sin texto adicional, sin markdown):
   {"clarify": true, "question": "...", "options": ["A", "B", "C"]}

   Ejemplos que requieren clarificación:
   - "¿cómo van las ventas?" → falta período
   - "factura a Acme" → falta importe / concepto
   - "el IVA" → falta trimestre / año
   - "el cliente más importante" → falta criterio (€, recurrencia, volumen)

3. **Memoria**: usa los mensajes anteriores. Si ya preguntaste algo, no lo repitas.
   Si la persona ya te dio un dato, recuérdalo.

4. **Tono**: ${ctx.communicationStyle}. Nivel: ${ctx.knowledgeLevel}.
   ${ctx.knowledgeLevel === 'starter' ? 'Evita tecnicismos, da pasos accionables.' : 'Puedes usar términos contables/fiscales precisos.'}

5. **Acciones**: para operaciones que escriben datos (crear factura, registrar pago,
   enviar email), siempre pide confirmación explícita con resumen ANTES de ejecutar.

CONTEXTO RECIENTE DEL NEGOCIO
${ctx.businessSummary}

OBJETIVO ÚLTIMO
Ayudar a ${ctx.userFirstName} a cumplir sus obligaciones fiscales sin estrés y
optimizar su operativa diaria. Cada respuesta debe ser útil, accionable y honesta.`;
}
```

### A3.2 — Classifier prompt (Haiku, F1)

```typescript
export const CLASSIFIER_PROMPT = `Analiza el mensaje del usuario y determina si necesita aclaración
ANTES de responder. Considera el contexto del negocio.

Devuelve EXCLUSIVAMENTE JSON con este schema:
{
  "ambiguous": true|false,
  "ambiguityType": "period"|"entity"|"intent"|"amount"|"none",
  "suggestedClarification": "..."|null,
  "suggestedOptions": ["..."]|null
}

Reglas:
- "ventas de ayer" → no ambiguo (período claro)
- "ventas" → ambiguo (period: este mes/trimestre/año)
- "factura al cliente" → ambiguo (entity: ¿cuál cliente?)
- "el modelo 303" → ambiguo (period: ¿qué trimestre?)
- "hola" → no ambiguo (saludo)
- "ayúdame con esto" → ambiguo (intent: ¿qué necesitas?)

Mensaje del usuario: """${userMessage}"""`;
```

### A3.3 — Judge prompt (GPT-4o-mini, F4)

```typescript
export const JUDGE_PROMPT = `Eres el validador. Otro LLM va a ejecutar la siguiente acción.
Tu única tarea: decidir si la acción coincide con lo que el usuario pidió.

Devuelve JSON:
{ "valid": true|false, "reasoning": "...", "blockers": ["..."] }

ACCIÓN PROPUESTA:
${JSON.stringify(action, null, 2)}

CONVERSACIÓN PREVIA (últimos 4 turnos):
${formatHistory(history)}

Reglas:
- Si la acción es coherente con el último mensaje del usuario → valid: true
- Si hay discrepancia de importe, cliente, fecha → valid: false
- Si la acción crea algo en blanco (importe 0, sin destinatario) → valid: false
- Sé conservador. Mejor bloquear y preguntar que ejecutar mal.`;
```

---

## A4. Pseudocódigo del orquestador

### F1 (memoria + clarify, single provider)

```typescript
// apps/isaak/app/api/chat/route.ts (refactor)
export async function POST(req: NextRequest) {
  const session = await getHoldedSession();
  const { message, conversationId } = await req.json();

  // 1. Cargar contexto + historial
  const ctx = await loadIsaakBusinessContext(session.tenantId);
  const history = await loadShortMemory(conversationId, limit: 8);

  // 2. Classifier rápido (Haiku) — F3 onwards. En F1 puede ser regex.
  const classification = await classifyIntent(message, history, ctx);

  if (classification.ambiguous) {
    const clarifyResponse = {
      clarify: true,
      question: classification.suggestedClarification,
      options: classification.suggestedOptions,
    };
    await persistMessage(conversationId, 'assistant', JSON.stringify(clarifyResponse), {
      isClarification: true,
    });
    return NextResponse.json({ response: clarifyResponse, isClarification: true });
  }

  // 3. Main LLM call
  const startTime = Date.now();
  const result = await callClaude({
    model: 'claude-sonnet-4-6',
    system: buildSystemPrompt(ctx),
    messages: [
      ...history,
      { role: 'user', content: message }
    ],
    max_tokens: 1500,
  });
  const latency = Date.now() - startTime;

  // 4. Persistir + métricas
  await persistMessage(conversationId, 'user', message);
  await persistMessage(conversationId, 'assistant', result.text);
  await recordMetric({
    tenantId: session.tenantId,
    conversationId,
    modelUsed: 'claude-sonnet-4-6',
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    latencyMs: latency,
  });

  return NextResponse.json({ response: result.text });
}
```

### F2 (añadir tool-calling)

```typescript
// Loop de tool-use
let messages = [...history, { role: 'user', content: message }];
let response;
let iterations = 0;

while (iterations < 10) {
  response = await callClaude({
    model: 'claude-sonnet-4-6',
    system: buildSystemPrompt(ctx),
    messages,
    tools: ISAAK_TOOLS_REGISTRY,    // unificación de todos los tools
    max_tokens: 2000,
  });

  if (response.stop_reason !== 'tool_use') break;

  const toolUses = response.content.filter(c => c.type === 'tool_use');
  const toolResults = await Promise.all(
    toolUses.map(tu => executeIsaakTool(tu.name, tu.input, { tenantId, userId }))
  );

  messages.push({ role: 'assistant', content: response.content });
  messages.push({
    role: 'user',
    content: toolResults.map((r, i) => ({
      type: 'tool_result',
      tool_use_id: toolUses[i].id,
      content: JSON.stringify(r),
      is_error: r.error !== undefined,
    })),
  });

  iterations++;
}
```

---

## A5. Metodología de testing

### Capas de testing

1. **Unit tests** (Vitest):
   - Cada tool individual con mocks
   - Builders de prompt (snapshot tests)
   - Parsers de respuesta LLM

2. **Integration tests** (Vitest + real Anthropic/OpenAI APIs en CI):
   - Loop completo de chat con tenant mock
   - Tool-calling end-to-end con Holded sandbox
   - Clarify-first con queries ambiguas reales

3. **Golden set regression** (Vitest + LLM-as-judge):
   - 50-100 queries reales con `expected.behavior` y `expected.tools_used`
   - Corre en cada PR
   - Gate de mergeo si baja >5% el score promedio

4. **A/B testing por tenant** (feature flag):
   - `ISAAK_INTELLIGENCE_VERSION=v1|v2` en `Tenant.featureFlags`
   - Métricas comparadas en `/admin/isaak-intelligence`

### Estructura del repo de tests

```
apps/isaak/tests/
  intelligence/
    golden/
      multi-turn.test.ts        # F1: coherencia entre turnos
      no-hallucination.test.ts  # F2: 0 datos inventados
      clarify.test.ts           # F1: clarifications apropiadas
      ocr.test.ts               # F4: precisión OCR
      memory-long.test.ts       # F6: recall a largo plazo
      fiscal-deep.test.ts       # F8: profundidad fiscal
    fixtures/
      tenants/                  # tenants sintéticos con datos realistas
      messages/                 # corpus de queries
      expected/                 # comportamientos esperados
    helpers/
      llm-judge.ts              # función que llama GPT-4o como juez
      tenant-factory.ts         # crea tenants de prueba
```

### Eval con LLM-as-judge

```typescript
// tests/intelligence/helpers/llm-judge.ts
export async function judgeResponse(input: {
  query: string;
  response: string;
  expectedBehavior: string;
  context: IsaakContext;
}): Promise<{ score: number; reasoning: string }> {
  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Evalúa esta respuesta de Isaak en escala 0-10.

QUERY: ${input.query}
RESPUESTA: ${input.response}
COMPORTAMIENTO ESPERADO: ${input.expectedBehavior}

Considera: precisión, claridad, accionabilidad, ausencia de alucinaciones.
Responde JSON: { "score": <0-10>, "reasoning": "..." }`,
    }],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(result.choices[0].message.content);
}
```

---

## A6. Golden set semilla

Cada item es un fichero JSON en `tests/intelligence/fixtures/messages/`.
Mínimo 30 ítems para arrancar F1.

### Ejemplo 1: ambigüedad de período

```json
{
  "id": "ambig-period-sales-001",
  "category": "clarify",
  "query": "¿Cómo van las ventas?",
  "context": { "holdedConnected": true, "bankConnected": false },
  "expected": {
    "shouldClarify": true,
    "ambiguityType": "period",
    "clarificationContains": ["período", "mes", "trimestre"]
  }
}
```

### Ejemplo 2: query precisa, no debe clarificar

```json
{
  "id": "precise-iva-q1-002",
  "category": "no-clarify",
  "query": "Calcula el IVA repercutido del primer trimestre de 2026",
  "context": { "holdedConnected": true },
  "expected": {
    "shouldClarify": false,
    "toolsUsed": ["holded_list_invoices"],
    "responseContains": ["IVA", "trimestre", "€"]
  }
}
```

### Ejemplo 3: no alucinación

```json
{
  "id": "no-halluc-client-003",
  "category": "no-hallucination",
  "query": "¿Cuánto me debe el cliente 'Acme SL'?",
  "context": { "holdedConnected": true, "noClientWithName": "Acme SL" },
  "expected": {
    "shouldClarify": false,
    "toolsUsed": ["holded_search_contact"],
    "responseContains": ["no encontré", "no hay cliente"],
    "responseExcludes": ["Acme SL le debe", "tiene una deuda"]
  }
}
```

### Ejemplo 4: coherencia multi-turno

```json
{
  "id": "multi-turn-context-004",
  "category": "multi-turn",
  "turns": [
    { "user": "¿Cómo van las ventas?" },
    { "user": "Este mes" },
    { "user": "¿Y los gastos?" }
  ],
  "expected": {
    "turn3PeriodInferred": "este mes",
    "turn3ShouldNotReAsk": ["período", "trimestre"]
  }
}
```

---

## A7. Métricas baseline — cómo medir

Antes de cambiar nada en F1, instrumentar para tener "antes" comparable.

### Setup mínimo (F1.0 — primer commit)

1. **Instrumentación tokens + latencia**:
   - Wrappear `callLLM` actual con timing y captura de `usage`.
   - Persistir en nueva tabla `IsaakChatMetric` (ver A2).

2. **Eval de alucinación retroactivo**:
   - Tomar últimos 200 mensajes con respuestas de Isaak en producción.
   - Pasar por GPT-4o como juez con prompt: "¿Esta respuesta contiene datos numéricos o nombres de cliente que no aparecen en ningún contexto previo?"
   - Calcular % → ese es el baseline de alucinación.

3. **Eval de ambigüedad ignorada**:
   - Mismo set de 200 mensajes.
   - Juez: "¿La pregunta del usuario era ambigua? ¿Isaak la respondió sin pedir aclaración?"
   - Calcular % → baseline de "missed clarifications".

4. **Panel de métricas** (`/admin/isaak-intelligence`):
   - Tabla con últimos 7d / 30d / 90d
   - Gráficos: tokens, coste, latencia, ratio 👍, alucinación, clarify-rate
   - Comparativa por tenant
   - Comparativa por versión de prompt (cuando hagamos A/B)

### SQL queries clave para el panel

```sql
-- Coste mensual por tenant
SELECT tenant_id, DATE_TRUNC('month', created_at) AS month,
       SUM(estimated_cost_eur) AS cost_eur,
       COUNT(*) AS messages,
       AVG(latency_ms) AS avg_latency_ms
FROM isaak_chat_metrics
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY tenant_id, month
ORDER BY cost_eur DESC;

-- Ratio de clarificaciones disparadas
SELECT DATE_TRUNC('day', created_at) AS day,
       COUNT(*) FILTER (WHERE is_clarification) * 100.0 / COUNT(*) AS clarify_rate_pct
FROM isaak_chat_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;

-- Tools más usados
SELECT UNNEST(tool_names) AS tool_name, COUNT(*) AS calls
FROM isaak_chat_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND ARRAY_LENGTH(tool_names, 1) > 0
GROUP BY tool_name
ORDER BY calls DESC;
```

---

## Anexos finales

### Glosario

- **F1, F2, …**: fases del roadmap (Foundation, Tool-calling, etc.)
- **Golden set**: corpus de queries de prueba con comportamiento esperado.
- **LLM-as-judge**: usar un modelo como evaluador objetivo de respuestas de otro.
- **Tool-use**: feature de Claude/GPT para que el modelo invoque funciones registradas.
- **RAG**: Retrieval-Augmented Generation — inyectar contexto recuperado por similitud.
- **Few-shot**: incluir ejemplos previos en el prompt para guiar la respuesta.
- **Judge**: modelo secundario que valida decisiones del modelo principal.

### Referencias internas

- `docs/engineering/ISAAK_MASTER_PLAN.md` — roadmap de producto/ingeniería general.
- `apps/isaak/app/api/chat/route.ts` — endpoint actual a refactorizar.
- `apps/isaak/app/lib/holded-tools.ts` — definiciones de tools de Holded existentes (17).
- `apps/isaak/app/lib/banking-tools.ts` — definiciones de tools de banca (7).
- `apps/isaak/app/lib/isaak-business-context.ts` — loader de contexto del tenant.
- `packages/db/prisma/schema.prisma` — modelos `IsaakConversation`, `IsaakMessage`, `IsaakFeedback`.

### Historial de cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-05-24 | Creación inicial del documento | Ingeniería Isaak |
| 2026-05-25 | F1 Foundation entregada: memoria multi-turno + clarify-first + métricas baseline + golden harness (30 fixtures) | Ingeniería Isaak |
| 2026-05-25 | F2 Tool-calling read entregada: 27 tools de lectura via Anthropic tool-use, registry unificado, tool loop helper | Ingeniería Isaak |
| 2026-05-25 | F3 Multi-provider router entregada: classifier Haiku con tres rutas (clarify_direct/sonnet_no_tools/sonnet_with_tools), tool filtering por categoría | Ingeniería Isaak |
| 2026-05-25 | F4a Judge model entregada: GPT-4o-mini gate sobre writes (4 tools Holded), allowWrites flag, hasWriteIntent en classifier | Ingeniería Isaak |
| 2026-05-25 | F4b OCR entregada: GPT-4o vision para facturas, endpoint /api/isaak/ocr/invoice, parser defensivo | Ingeniería Isaak |
| 2026-05-25 | F5 Streaming SSE entregada (backend only): /api/chat/stream con anthropic-stream parser, tool indicators, firstTokenMs | Ingeniería Isaak |
| 2026-05-25 | F6a+b Long-term memory entregada: pgvector + tabla IsaakLongTermMemory + RAG retrieval inyectado en chat con aislamiento estricto por tenant | Ingeniería Isaak |
| 2026-05-25 | F7 Feedback loop entregada: 👍 embebido, retrieve por similarity, few-shot block en system prompt | Ingeniería Isaak |
| 2026-05-25 | F8a Sub-agents entregada: agente fiscal con system prompt especializado + tools restringidas + routing por keywords. Banking/gestion en F8b/F8c | Ingeniería Isaak |

---

*Documento vivo. Actualizar al cerrar cada fase con resultados reales (métricas, lecciones aprendidas) y revisar las "preguntas abiertas" al menos cada mes.*
