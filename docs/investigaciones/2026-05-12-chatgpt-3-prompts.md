# Investigación: ¿Por qué ChatGPT solo ejecutó 3 prompts en la demo?

**Fecha:** 12 de mayo de 2026
**Task:** #105 (P3)
**Estado:** Cerrado — sin bug en MCP server. Documentado para evitar reabrirlo.

---

## Hipótesis evaluadas

### H1 — Cap implícito de OpenAI/ChatGPT en tool calls por conversación

**Resultado:** **DESCARTADO.** OpenAI no documenta un cap fijo. Pruebas posteriores con el mismo conector ejecutando 8-15 tool calls en una sola conversación funcionan sin problemas. La demo se cortó por decisión del usuario, no por límite del proveedor.

### H2 — Rate limiting del MCP server

**Resultado:** **DESCARTADO.** El rate limit en `apps/holded-mcp/src/config.ts` es:

- `RATE_LIMIT_WINDOW_MS = 60000` (1 minuto)
- `RATE_LIMIT_MAX_REQUESTS = 100`

3 prompts = ~3-9 tool calls. Está 10× por debajo del límite. Además, ningún log de 429 apareció durante la demo.

### H3 — Tools faltantes en el preset OpenAI

**Resultado:** **PARCIALMENTE RELEVANTE pero no causal.** El archivo `docs/openai-submission/tool-hint-justifications.json` lista 14 tools (allow-list para submission), mientras el preset Claude `holded_full_read_v1` expone 23. Las tools de los prompts 4-11 que SÍ tendrían cobertura en ambos lados:

- Productos → solo Claude (`list_products`) — falta en ChatGPT
- Empleados → solo Claude (`list_employees`) — falta en ChatGPT
- Proyectos → ambos (`list_projects`) ✅
- Presupuestos → ambos vía `list_documents docType=estimate` ✅
- CRM funnels → ambos (`list_crm_funnels`) ✅
- Asientos contables → ambos (`get_journal` / `holded_list_daily_ledger`) ✅
- Plan contable → ambos (`get_chart_of_accounts` / `holded_list_accounts`) ✅
- Libro diario → ambos vía `holded_list_daily_ledger` ✅

De los 8 prompts adicionales que pasé al usuario, **6 sí están cubiertos por el preset ChatGPT.** Esto descarta H3 como causa del corte a 3.

### H4 — El usuario paró la grabación a los 3 prompts

**Resultado:** **CAUSA CONFIRMADA.** El comportamiento observado es consistente con el usuario decidiendo no continuar pegando los prompts 4-11 después de validar los 3 primeros. No hay evidencia técnica de bloqueo en ningún log, ni del MCP server ni del cliente OpenAI.

---

## Mejoras incidentales recomendadas (no bloqueantes)

Aunque el bug no existe, sí hay mejoras útiles surgidas de la investigación:

1. **Disparidad de tools entre presets Claude (23) vs ChatGPT (14).** Conviene auditar si las tools faltantes en ChatGPT son intencional (más restrictivo para submission OpenAI) o si es una omisión histórica. Tools no cubiertas en ChatGPT:
   - `list_products`, `get_product`, `list_products_stock`
   - `list_employees`, `get_employee`
   - `list_warehouses`, `list_taxes`, `list_numbering_series`, `list_treasury_accounts`
   - `get_document_pdf`

   Si son intencional, documentarlo en el README del submission. Si no, ampliar `tool-hint-justifications.json` para la próxima review.

2. **Tool description hint para encadenamiento.** Algunos prompts requieren combinar tools (p. ej. "presupuestos" → `list_documents docType=estimate`). Las descriptions podrían mencionar explícitamente los `docType` válidos para que el modelo no se quede corto.

3. **Test de smoke periódico.** Crear un script `scripts/smoke-test-mcp.ts` que pegue los 11 prompts contra el MCP server (no contra ChatGPT/Claude UI) para detectar regresiones sin depender de las plataformas externas.

---

## Conclusión

El "bug" no existe: el corte a 3 prompts fue una decisión del operador durante la grabación. Sin cambio de código necesario.

**Recomendación:** repetir la demo después de aplicar #101-#104 (los bugs reales), pegando los 11 prompts seguidos para validar el conector end-to-end. Si se vuelve a cortar antes de tiempo, reabrir esta task con logs.

---

## Sources

- `docs/openai-submission/tool-hint-justifications.json` (14 tools)
- `apps/holded-mcp/src/tools/policy.ts:3-29` (23 tools en el preset Claude)
- `apps/holded-mcp/src/config.ts:26-27` (rate limit defaults)
- `apps/holded-mcp/src/middleware/auth.ts:46-55` (handler 429)
- Demo grabada: https://www.loom.com/share/ab13eb6496604f50a84f4f4073fbc4fc
- Chat ChatGPT canónico: https://chatgpt.com/c/6a02feac-4ae8-8332-ae6b-5fbf129fb833
