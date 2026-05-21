# Auditoría de conectores Holded + monitorización en vivo de tools

**Fecha:** 21 de mayo de 2026
**Alcance:** conector Claude (`apps/holded-mcp`) y conector ChatGPT (`apps/holded` + runtime MCP en `apps/app`)
**Objetivo:** auditar ambos conectores y cerrar la brecha de monitorización — verificar en vivo el
funcionamiento de cada tool y mostrar el estado en las páginas públicas.

---

## 1. Inventario de los dos conectores

| Conector | Landing pública | Servidor MCP | Auth | Preset de tools |
| -------- | --------------- | ------------ | ---- | --------------- |
| **Claude** | `holded.verifactu.business/conectores/claude` (+ landing propia en `claude.verifactu.business/`) | `apps/holded-mcp` — Express + Streamable HTTP | OAuth (Bearer) | `submission_v1` — 8 tools |
| **ChatGPT** | `holded.verifactu.business/conectores/chatgpt` | `apps/holded/api/mcp/holded` → proxy a `apps/app/api/mcp/holded` | OAuth (Bearer) | `openai_review_invoicing_v1` — 10 tools |

Ambos conectores envuelven la **misma API REST de Holded** (`api.holded.com`). Las tools son
adaptadores finos sobre los mismos endpoints (`/documents`, `/contacts`, `/chartofaccounts`,
`/dailyledger`).

### Tools por conector

- **Claude (`submission_v1`)**: `list_documents`, `get_document`, `get_document_pdf`,
  `list_contacts`, `get_contact`, `get_chart_of_accounts`, `get_journal`, `create_invoice_draft`.
- **ChatGPT (`openai_review_invoicing_v1`)**: `list_invoices`, `get_invoice`, `list_documents`,
  `get_document`, `get_document_pdf`, `list_contacts`, `get_contact`, `list_accounts`,
  `list_daily_ledger`, `create_invoice_draft`.

El código de las tools "extra" (CRM, proyectos, productos, almacenes, tesorería, empleados) sigue
presente pero filtrado por preset, listo para reactivarse como submission v3 tras la aprobación de
OpenAI/Anthropic.

---

## 2. Historial revisado (memoria de implementaciones)

- `docs/auditorias/2026-05-12-demo-conectores-side-by-side.md` — demo Loom comparada. Bugs
  detectados: `list_contacts` sin orden determinista, desfase de 1 día en fechas, falta de flag
  `truncated`, `get_journal endtmp=null` reinyectado.
- `docs/engineering/ADMIN_PANEL_CONNECTORS_AUDIT_AND_PLAN_2026.md` — panel admin; existen páginas
  `/connectors/smoke-tests` y `/connectors/claude-smoke-tests` que prueban tools **on-demand**.
- `docs/openai-submission/*` y `docs/anthropic-submission/*` — material de submission.

### Sistema de monitorización previo

Ya existía un health-check de **superficie pública**:

- `apps/app/lib/connectorHealth/checks.ts` — ~19 probes sin token (landings, OAuth discovery, MCP
  initialize, `tools/list`).
- `apps/app/api/cron/connector-health` — Vercel Cron cada 5 min → tabla `connector_health_checks`.
- `apps/app/api/public/status/[connector]` — endpoint público agregado.
- `apps/holded/app/components/ConnectorStatusBadge.tsx` — badge en las landings.

---

## 3. Brecha detectada

La monitorización en vivo y la verificación real de tools estaban **desconectadas**:

| Capacidad | Cron de superficie | Smoke-tests admin |
| --------- | ------------------ | ----------------- |
| Corre en vivo (cada 5 min) | ✅ | ❌ (solo al pulsar un botón) |
| Verifica funcionamiento real de las tools | ❌ (solo cuenta tools y superficie) | ✅ |
| Visible en páginas públicas | ✅ | ❌ (solo panel admin) |

Es decir: lo que probaba las tools no era ni continuo ni público; lo que era continuo y público no
probaba las tools.

---

## 4. Implementación — revisión en vivo de tools en las páginas públicas

Se extiende el sistema de health-check existente con una **segunda familia de checks** (`tool`),
reutilizando toda la tubería (cron → tabla → endpoint público → badge).

### Cambios

1. **`apps/app/lib/connectorHealth/checks.ts`**
   - Nueva familia `kind: 'tool'`: un check por cada tool de cada conector (8 Claude + 10 ChatGPT).
   - Cada check ejecuta un probe autenticado contra `api.holded.com` con `HOLDED_TEST_API_KEY` —
     la misma cuenta de pruebas que usan los smoke-tests del admin.
   - Probes: `list*` valida array JSON; `get*` lista → toma un id → pide el detalle; PDF lista →
     pide el PDF; `create_invoice_draft` valida precondiciones (sin mutar nada — nunca hace POST).
   - Detección de HTML, errores HTTP, soft-errors de Holded (`status:0`), brotli (`Accept-Encoding:
     identity`) y 1 reintento ante 429/5xx transitorio para evitar falsos rojos.
   - La familia `tool` solo se registra si `HOLDED_TEST_API_KEY` está configurada (degradación
     limpia: sin clave, las tools quedan en "estado desconocido", nunca en rojo falso).

2. **`apps/app/api/public/status/[connector]/route.ts`** — expone `kind` por check y un resumen
   `toolsTotal / toolsOk / toolsDegraded / toolsFail`.

3. **`apps/holded/app/components/ConnectorStatusBadge.tsx`** — chip "X/Y tools operativas" en el
   resumen y detalle agrupado en dos tablas: "Tools del conector" y "Superficie pública".

Sin cambios de esquema: los nuevos `checkType` con prefijo `tool_` caben en el `VarChar(64)`
existente de `connector_health_checks`, así que no hace falta migración de base de datos.

### Resultado

El cron de 5 minutos pasa de ~19 a ~37 checks. Las landings públicas
`/conectores/{claude,chatgpt}` y sus `/docs` muestran ahora, en vivo, cuántas tools del conector
están operativas y el detalle por tool.

---

## 5. Follow-ups recomendados

- **Landing propia del MCP de Claude** (`claude.verifactu.business/`, `apps/holded-mcp/src/public-pages.ts`):
  no muestra estado. Requiere un widget JS externo por la CSP estricta (`scriptSrc 'self'`).
- **Checks semánticos profundos**: los probes actuales validan disponibilidad del dato. Bugs como
  el desfase de fechas (task #104) o el orden de `list_contacts` (#102) viven en la capa de
  formato del MCP y necesitarían un probe vía `tools/call` real con token.
- **`tools/call` real**: ejecutar la tool a través del MCP (no solo su endpoint Holded) daría la
  señal más fiel, a cambio de gestionar un token OAuth de larga duración por conector.
- **Alertas**: un fallo sostenido de tool podría notificar por email/Slack además de pintar la
  landing en rojo.
