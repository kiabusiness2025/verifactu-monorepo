# OpenAI App Submission — Holded

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

## Histórico

Antes del 2026-05-18 el portal aceptaba solo `tool-hint-justifications.json` (subset de tools+justifications). Ese formato se sustituyó por `chatgpt-app-submission.v1.json` (superset que cubre app_info + tools + test_cases + negative_test_cases en un único archivo). El archivo antiguo y su validador se eliminaron del repo.

## Otros documentos en esta carpeta

- `OPENAI_FORM_COPY_PASTE.md` — texto plano de los campos del form (description, reviewer notes, test cases) por si hay que rellenar campos individuales en el portal.
- `HOLDED_REVIEW_TEST_MATRIX.md` — matriz de tests POS/NEG con estado de validación, suggested prompts, y notas de cada submission wave.
- `OPENAI_RESUBMISSION_CHECKLIST.md` — checklist de pre-submit.
- `WEB_MOBILE_REVIEW_CHECKLIST.md` — checklist específico de QA manual en ChatGPT web + mobile.
- `FINAL_REVIEW_READINESS_REPORT.md`, `HOLDED_REVIEW_TEST_AUDIT.md`, `HOLDED_PUBLIC_LANDINGS_E2E_AUDIT.md`, `OPENAI_SUBMISSION_COPY_PASTE_PACK.md` — reports históricos de readiness.
