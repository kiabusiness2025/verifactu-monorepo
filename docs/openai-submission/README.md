# OpenAI App Submission — Holded

> **Última actualización: 2026-05-19.** Submission v2 lista para upload al portal — runtime expone exactamente 10 tools (`openai_review_invoicing_v1` preset), manifest alineado, landings con `ConnectorRequirementsCard` y hub público-ready. Solo falta QA manual en ChatGPT web+mobile.

Esta carpeta contiene los artefactos que se suben al **OpenAI App Review portal** para la submission de la app "Holded".

## Archivo canónico: `chatgpt-app-submission.json`

Es el único JSON que el portal acepta actualmente. Combina en un solo archivo:

- `app_info` (display_name, subtitle, description, category)
- `tools` (annotations + justifications de cada tool)
- `test_cases` (prompts positivos)
- `negative_test_cases` (prompts negativos)

Schema canónico:

```
https://developers.openai.com/apps-sdk/schemas/chatgpt-app-submission.v1.json
```

Reglas:

- **NO se debe cambiar la estructura sin volver a subirlo al portal.**
- Si cambian las tools expuestas por el preset público (`DEFAULT_PUBLIC_SCOPE_PRESET` en `apps/app/lib/oauth/mcp.ts`), este archivo debe regenerarse para mantener alineación 1:1.
- Si cambian las anotaciones MCP de cualquier tool, este archivo debe regenerarse.
- **No debe contener API keys, tenant IDs, datos de clientes, secretos ni credenciales.**

Antes de subirlo al portal, validar localmente:

```
node scripts/validate-openai-submission.mjs
```

El validador comprueba: `$schema` URL, `subtitle` ≤30 chars, `category` enum, todos los hints booleanos, todas las justifications no-vacías, `tools_triggered` en POS referencia tools existentes, `tools_triggered` en NEG es `null`.

## Cómo interpretar el mensaje del importador

Al subir `chatgpt-app-submission.json`, el portal contesta algo como:

```
Updated App Info, 10 test cases, 6 negative test cases, and N tool justifications.
Review each section before submitting.
Imported N. Skipped X. Missing Y. Mismatched 0.
```

El portal compara el JSON con el `tools/list` que devuelve el runtime live en `https://holded.verifactu.business/api/mcp/holded` **en ese momento**. La aritmética:

| Campo            | Significado                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Imported N**   | Tools presentes en AMBOS (JSON ∩ runtime live) → annotations + justifications actualizadas. |
| **Skipped X**    | Tools que están en el JSON pero NO en el runtime live (todavía no desplegadas).             |
| **Missing Y**    | Tools que el runtime live expone pero NO están en el JSON (catálogo viejo en prod).         |
| **Mismatched Z** | Tools que coinciden por nombre pero cuyas annotations difieren. **Debe ser 0.**             |

**Estado deseado para resubmit:** `Imported 10. Skipped 0. Missing 0. Mismatched 0.`

Para llegar a ese estado, **subir el JSON solo DESPUÉS de que el deploy esté live en prod**. Si subes antes del deploy, el portal muestra el JSON nuevo contra el runtime viejo — las tools nuevas aparecen como `Skipped` y las tools eliminadas aparecen como `Missing`. No es un error, pero confunde al reviewer si ve esos warnings.

Ejemplo concreto (2026-05-18): tras subir el JSON con 10 tools antes del deploy del PR #88, el importador reportó `Imported 7. Skipped 3. Missing 7. Mismatched 0.`. Cuadra perfectamente:

- Imported 7 = intersección del preset nuevo (10) y el viejo (14): `list_invoices`, `get_invoice`, `list_contacts`, `get_contact`, `list_accounts`, `list_daily_ledger`, `create_invoice_draft`.
- Skipped 3 = tools nuevas en el JSON: `list_documents`, `get_document`, `get_document_pdf`.
- Missing 7 = tools eliminadas del preset: `get_project`, `list_bookings`, `list_crm_funnels`, `list_leads`, `list_project_tasks`, `list_projects`, `list_time_records`.

Tras el deploy, re-importar el mismo JSON da `Imported 10. Skipped 0. Missing 0.`

## Histórico

Antes del 2026-05-18 el portal aceptaba solo `tool-hint-justifications.json` (subset de tools+justifications). Ese formato se sustituyó por `chatgpt-app-submission.v1.json` (superset que cubre app_info + tools + test_cases + negative_test_cases en un único archivo). El archivo antiguo y su validador se eliminaron del repo.

## Otros documentos en esta carpeta

**Vigentes (usar para esta submission):**

- `PORTAL_FORM_ANSWERS.md` — respuestas literales (copy-paste) para los 30 campos del portal (10 tools × 3 hints) + MCP URL + Authentication.
- `OPENAI_FORM_COPY_PASTE.md` — texto plano del resto de campos del form (description, reviewer notes, test cases) por si hay que rellenar campos individuales en el portal.
- `OPENAI_RESUBMISSION_CHECKLIST.md` — checklist de pre-submit + estado actual (deploy gate, PR history).
- `WEB_MOBILE_REVIEW_CHECKLIST.md` — checklist específico de QA manual en ChatGPT web + mobile (32 runs = 16 tests × 2 platforms).
- `HOLDED_REVIEW_TEST_MATRIX.md` — matriz de tests POS/NEG con estado de validación, suggested prompts, y notas de cada submission wave.

**Históricos (mantenidos para trazabilidad, NO usar como referencia operativa actual):**

- `FINAL_REVIEW_READINESS_REPORT.md` — readiness report de 2026-04-29 / 2026-05-15 (pre-narrowing a 10 tools).
- `HOLDED_REVIEW_TEST_AUDIT.md` — audit de 2026-04-29 (mencionaba preset `holded_priority1`, ya superado).
- `HOLDED_PUBLIC_LANDINGS_E2E_AUDIT.md` — audit E2E de landings de 2026-04-30 (la mayor parte de hallazgos P0/P1 ya están corregidos en producción).
- `OPENAI_SUBMISSION_COPY_PASTE_PACK.md` — copy-paste pack de 2026-04-29 (superado por `OPENAI_FORM_COPY_PASTE.md`).
