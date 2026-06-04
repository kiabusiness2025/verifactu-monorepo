# Isaak — Capability Matrix (features × superficies)

**Última actualización**: 2026-06-04

Cada capacidad de Isaak puede aparecer en varias superficies (chat web, Telegram, WhatsApp, MCP Claude, MCP ChatGPT, mobile). Esta matriz documenta dónde está disponible cada feature y en qué estado de madurez.

> Plan estratégico: `docs/engineering/ISAAK_MASTER_PLAN.md` § Plan H.

## Leyenda

| Símbolo | Significado                                    |
| ------- | ---------------------------------------------- |
| ✅ GA   | Disponible en producción                       |
| 🧪 Exp  | Disponible pero experimental / detrás flag     |
| ⏳ Plan | Planificado, no implementado                   |
| 🚫      | No aplica para esta superficie                 |
| 🔒      | Frozen / en revisión (no tocar)                |

## Surfaces

| Superficie         | Stack                                                      | Estado general                 |
| ------------------ | ---------------------------------------------------------- | ------------------------------ |
| Web chat           | `apps/isaak` `/api/holded/chat` (SSE streaming F5)         | ✅ GA — superficie principal   |
| Telegram bot       | `apps/isaak` `/api/telegram/webhook` (V1.3 paridad)        | ✅ GA — paridad con web (V1.3) |
| WhatsApp Business  | `apps/isaak` `/api/whatsapp/*` (Fase W)                    | ✅ GA — fiscal templates       |
| MCP Claude         | `apps/holded-mcp`                                          | 🔒 En revisión Anthropic       |
| MCP ChatGPT        | `apps/app/api/mcp/holded`                                  | 🔒 En revisión OpenAI          |
| MCP Isaak (futuro) | `apps/isaak-mcp` (Plan H.2)                                | ⏳ Diseño                      |
| Mobile             | PWA `apps/isaak` (S10-A)                                   | ✅ GA — sin app nativa         |

## Matriz

### Lectura ERP / sectorial

| Capacidad                    | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ---------------------------- | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| Listar facturas venta        | ✅ GA    | ✅ GA    | ✅ GA    | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Detalle factura venta        | ✅ GA    | ✅ GA    | ✅ GA    | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Listar documentos compra     | ✅ GA    | ✅ GA    | ✅ GA    | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| PDF documento (base64)       | ✅ GA    | ✅ GA    | 🚫       | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Listar contactos             | ✅ GA    | ✅ GA    | ✅ GA    | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Detalle contacto             | ✅ GA    | ✅ GA    | ✅ GA    | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Plan de cuentas (PGC)        | ✅ GA    | ✅ GA    | 🚫       | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Libro diario (ledger)        | ✅ GA    | ✅ GA    | 🚫       | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Datos sectoriales (PMS/POS)  | ✅ GA    | ✅ GA    | ✅ GA    | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Banking transactions         | ✅ GA    | ✅ GA    | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |

### Escritura (con consent humano)

| Capacidad                    | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ---------------------------- | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| Crear factura draft          | ✅ GA    | ✅ GA    | 🧪 Exp   | 🔒         | 🔒          | ⏳ Plan   | ✅ GA   |
| Crear factura final          | ✅ GA    | ✅ GA    | ⏳ Plan  | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Registrar gasto OCR          | ✅ GA    | ✅ GA    | ⏳ Plan  | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Submit modelo AEAT           | ✅ GA    | 🧪 Exp   | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |

> Nota WhatsApp OCR (2026-06-04): `apps/isaak/app/api/whatsapp/webhook/route.ts` actualmente solo confirma la recepción del adjunto (`handleIncomingMedia`). El pipeline OCR (descarga media → `extractInvoiceFromImage` → registro gasto) está pendiente — pasa a `⏳ Plan` hasta que el webhook ejecute end-to-end.

### Fiscal / AEAT

| Capacidad                            | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ------------------------------------ | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| Borrador modelo 303                  | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Borrador modelo 130                  | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Borrador modelo 111/115/180/190      | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Borrador modelo 347/349              | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Inspector AEAT (51 reglas)           | ✅ GA    | ✅ GA    | ✅ GA    | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Company Intelligence (CI 9 reglas)   | ✅ GA    | ✅ GA    | ✅ GA    | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Alertas fiscales (D-15/7/3/1)        | ✅ GA    | ✅ GA    | ✅ GA    | 🚫         | 🚫          | 🚫        | ✅ GA   |
| Buzón AEAT (DEH + censo)             | ✅ GA    | 🧪 Exp   | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |

### Artefactos / informes

| Capacidad                            | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ------------------------------------ | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| Visual report (recharts)             | ✅ GA    | ✅ GA*   | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Export Excel                         | ✅ GA    | ✅ GA    | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Export PDF                           | ✅ GA    | ✅ GA    | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Export Word                          | ✅ GA    | ✅ GA    | 🚫       | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |

*Telegram usa QuickChart.io para charts inline (V1.3).

### Voz

| Capacidad                            | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ------------------------------------ | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| STT (Web Speech)                     | ✅ GA    | 🚫       | 🚫       | 🚫         | 🚫          | 🚫        | ✅ GA   |
| TTS (Web Speech)                     | ✅ GA    | 🚫       | 🚫       | 🚫         | 🚫          | 🚫        | ✅ GA   |
| Audio nota (Telegram)                | 🚫       | 🧪 Exp   | 🚫       | 🚫         | 🚫          | 🚫        | 🚫      |

### Asesor / RAG

| Capacidad                                | Web chat | Telegram | WhatsApp | MCP Claude | MCP ChatGPT | MCP Isaak | Mobile  |
| ---------------------------------------- | -------- | -------- | -------- | ---------- | ----------- | --------- | ------- |
| Consultas fiscales con fuentes oficiales | ✅ GA    | ✅ GA    | ✅ GA    | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| `inspector_search_aeat` RAG              | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |
| Inspector LLM Capa 2 (sub-agente)        | ✅ GA    | ✅ GA    | 🧪 Exp   | 🚫         | 🚫          | ⏳ Plan   | ✅ GA   |

## Política de paridad

- **Web es la referencia**: cada capacidad debe lanzarse primero en web chat.
- **Telegram y WhatsApp**: paridad on a feature-by-feature basis cuando hay demanda. No se exige paridad total.
- **MCP Claude + MCP ChatGPT**: alcance limitado al connector aprobado (Holded V1). Cambios requieren re-review.
- **MCP Isaak**: cuando arranque, expone el mismo subset que Holded MCP pero resuelto vía abstracción multi-ERP. Ver Plan H.2.

## Sunset / deprecación

Sin sunsets activos. Plan: marcar aquí cualquier capacidad que se vaya a deprecar con fecha y ruta de migración.
