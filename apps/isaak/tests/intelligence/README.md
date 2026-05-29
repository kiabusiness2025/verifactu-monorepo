# Isaak Intelligence — Golden test harness

Reference set of fixtures and tests that pin Isaak's chat behaviour as it
evolves through F1 → F8 (see `docs/engineering/ISAAK_INTELLIGENCE.md`).

Tests reales contra Anthropic Claude — **no mocks**. Skipped por defecto.

## Qué cubren

| Test                | Fixtures                | Qué valida                                                                          |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `tool-use`          | `fixtures/tool-use/`    | Que Isaak elige las tools correctas según la pregunta                               |
| `clarify`           | `clarify/`, `no-clarify/` | Pide aclaración cuando es ambiguo · NO la pide cuando es claro                    |
| `no-hallucination`  | `no-hallucination/`     | NO inventa cifras cuando no tiene datos reales                                      |
| `multi-turn`        | `multi-turn/`           | Mantiene contexto coherente entre turnos                                            |
| `sub-agent`         | `sub-agent/`            | Delega correctamente a sub-agentes (inspector AEAT, ledger, etc.)                   |

Total: **~41 fixtures · 5 test files**.

## Layout

```
tests/intelligence/
  fixtures/
    clarify/             # ambiguous queries → should ask
    no-clarify/          # precise queries → should answer
    no-hallucination/    # no grounding → should NOT invent
    multi-turn/          # context across turns
    sub-agent/           # delegation to specialized sub-agents
    tool-use/            # correct tool selection
  helpers/
    types.ts             # GoldenFixture schema
    load-fixtures.ts     # loads .json files by category
    llm-judge.ts         # GPT-4o-mini judge (opt-in)
    run-isaak.ts         # invokes callLLM with the prod system prompt
  golden/
    clarify.test.ts
    multi-turn.test.ts
    no-hallucination.test.ts
    sub-agent.test.ts
    tool-use.test.ts
```

## Cómo correrlos

Por defecto están SKIPPED — los wiring tests siempre corren (verifican que
los fixtures existen y son JSON válidos).

### Setup

```bash
# 1. Setea la API key de Anthropic (primario)
export ANTHROPIC_API_KEY="sk-ant-xxx"

# 2. Activa el modo live
export ISAAK_GOLDEN_LIVE=1

# 3. (Opcional) API key OpenAI para el LLM judge
export OPENAI_API_KEY="sk-proj-xxx"
```

Aceptamos también `ISAAK_ANTHROPIC_API_KEY` o `ANTHROPIC_API_KEY_DEV`
como alias (en este orden de prioridad).

### Correr toda la suite

```bash
cd apps/isaak
npx jest --config jest.config.mjs tests/intelligence/golden/
```

### Correr una sola categoría

```bash
# Solo tool-use
npx jest --config jest.config.mjs tests/intelligence/golden/tool-use.test.ts

# Solo clarify + no-hallucination
npx jest --config jest.config.mjs --testPathPatterns="clarify|no-hallucination"
```

### Correr una sola fixture

```bash
npx jest --config jest.config.mjs --testNamePattern="ventas_top_clientes"
```

### Script helper (todo de una)

Desde la raíz del monorepo:

```bash
ANTHROPIC_API_KEY=sk-ant-xxx node scripts/run-golden-tests.mjs
```

Setea `ISAAK_GOLDEN_LIVE=1` automáticamente e imprime un resumen al final
con tasa de éxito por categoría.

## Coste estimado

- Modelo: `claude-sonnet-4-6` por defecto (override con `ISAAK_GOLDEN_MODEL`)
- `max_tokens: 600`, `temperature: 0.45`
- ~2-3 llamadas por test × ~41 tests × ~1.5k tokens cada
- **≈ $1.50 USD por run completo** a precios Anthropic actuales

Para reducir coste, corre solo la categoría que estés cambiando.

## Cuándo correrlos

- ✅ **Antes de cualquier cambio en system prompts** o sub-agent prompts
- ✅ **Antes de cualquier cambio en `holded-tools.ts`** o `isaak-tools-registry.ts`
- ✅ **Antes de un release V1.x o V2.0**
- ✅ **Nightly automático** via `.github/workflows/golden-nightly.yml`
- ❌ NO en cada commit (caro y lento)

## Qué hacer si fallan

Cada test imprime el output completo del LLM y el veredicto del judge.
Razones más comunes:

| Síntoma                                          | Probable causa                                                | Cómo investigar                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tool incorrecta seleccionada                     | Cambio en descripciones de tools                              | Diff de `holded-tools.ts` reciente. Reformular descripción si es ambigua             |
| Pide aclaración cuando no debería                | Sub-agent prompt nuevo muy estricto                           | Diff de `isaak-sub-agents.ts` o `isaak-chat-prompts.ts`                              |
| Inventa cifras sin datos                         | Prompt deja de enfatizar "no inventes"                        | Asegurar que el system prompt incluye `NO HALLUCINATION` cláusula                    |
| Pierde contexto multi-turn                       | Cambio en cómo se serializan los messages anteriores          | Diff de `isaak-chat-context.ts` o helper de mensajes                                 |
| Sub-agent no se invoca                           | Cambio en la lógica de routing                                | Diff de `isaak-sub-agents.ts` (selector + descriptions)                              |

Si una regresión es legítima (el comportamiento NUEVO es mejor que el
viejo), actualiza el fixture con la respuesta esperada nueva.

## CI nightly

Workflow `.github/workflows/golden-nightly.yml` corre la suite completa
todas las noches a las 03:00 UTC. Notifica si algo regresa.

Requiere el secret `ANTHROPIC_API_KEY_TESTS` en Settings → Secrets →
Actions del repo. Se recomienda una API key separada de la de producción
para poder rotarla independientemente y poner un budget cap más bajo.

## Adding fixtures

Drop a JSON file into the matching category directory. Schema in
`helpers/types.ts`. Naming convention: `NN-short-slug.json`.

The fixture is automatically picked up by the test runner — no test
file changes needed.
