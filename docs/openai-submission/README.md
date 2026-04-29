# OpenAI App Submission — Holded

Esta carpeta contiene artefactos usados para la OpenAI App Submission de la app “Holded”.

- El archivo `tool-hint-justifications.json` fue validado y aceptado por el importador de OpenAI Platform.
- El archivo usa el schema oficial:
  https://developers.openai.com/apps-sdk/schemas/tool-hint-justifications.v1.json
- **No se debe cambiar la estructura del JSON sin volver a subirlo al importador de OpenAI.**
- Si cambian las tools expuestas por el preset público `openai_review_v2`, este archivo debe actualizarse.
- Si cambia alguna anotación MCP del servidor, este archivo debe actualizarse.
- **No debe contener API keys, tenant IDs, datos de clientes, secretos ni credenciales.**

## Known accepted format

```json
{
  "$schema": "https://developers.openai.com/apps-sdk/schemas/tool-hint-justifications.v1.json",
  "schema_version": 1,
  "tools": {
    "holded_list_invoices": {
      "annotations": {
        "readOnlyHint": true,
        "openWorldHint": false,
        "destructiveHint": false
      },
      "justifications": {
        "read_only_justification": "...",
        "open_world_justification": "...",
        "destructive_justification": "..."
      }
    }
  }
}
```
