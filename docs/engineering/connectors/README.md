# Conectores Holded · Knowledge Base

Documentación técnica de los conectores que exponen los datos de **Holded** (ERP/CRM/contabilidad español) a asistentes IA mediante el protocolo **MCP** (Model Context Protocol) y a la app **Isaak**.

> Última actualización: 2026-06-01 · Versión V3.G.1 · Auditoría OpenAI activa

## Mapa de surfaces

| Surface | Carpeta | Cliente IA | Uso |
|---|---|---|---|
| **ChatGPT MCP** | `apps/app/app/api/mcp/holded/` | ChatGPT (OpenAI) | Producción — submission v2 a OpenAI App Review |
| **Claude MCP** | `apps/holded-mcp/` | Claude (Anthropic) | Producción — Claude Connectors directory |
| **Isaak Holded adapter** | `apps/isaak/app/lib/holded-api.ts` | Isaak (copiloto Verifactu) | Producción — chat interno |
| **Adapter ChatGPT/Holded compartido** | `apps/app/lib/integrations/accounting.ts` | Capa raw → ChatGPT MCP | Adapter compartido por ChatGPT MCP y otras integraciones internas |

⚠ **Importante**: los tres surfaces tienen **clientes HTTP propios** que NO comparten código entre sí. Un fix en uno no se propaga automáticamente — cada uno requiere su propia validación. Ver [`HOLDED_API_QUIRKS.md`](./HOLDED_API_QUIRKS.md) para el patrón completo de bugs y dónde aparecen.

## Índice de documentos

1. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Arquitectura compartida, diferencias entre conectores, modelo de tenant y scopes.
2. [`OAUTH_FLOW.md`](./OAUTH_FLOW.md) — Flujo OAuth 2.1 con PKCE + consent screen + HMAC binding (V3.E).
3. [`HOLDED_API_QUIRKS.md`](./HOLDED_API_QUIRKS.md) — Comportamientos no documentados de la API Holded y cómo el conector los maneja.
4. [`CHATGPT_MCP.md`](./CHATGPT_MCP.md) — Detalles específicos del MCP de ChatGPT (apps/app).
5. [`CLAUDE_MCP.md`](./CLAUDE_MCP.md) — Detalles específicos del MCP de Claude (apps/holded-mcp).
6. [`TESTING.md`](./TESTING.md) — Cómo testear cada conector localmente y contra el demo tenant Nova Gestión.
7. [`CHANGELOG.md`](./CHANGELOG.md) — Historial de bugs cerrados V3.A → V3.G.1.

## Resumen ejecutivo

### ¿Qué hacen los conectores?

Permiten al usuario consultar y crear datos de su cuenta Holded **mediante lenguaje natural** dentro de ChatGPT o Claude. Operaciones cubiertas:

- **Lectura**: facturas (venta y compra), contactos (clientes/proveedores/leads), plan contable PGC español, libro diario, PDFs de documentos.
- **Escritura mínima**: crear borradores de factura (siempre `approveDoc: false` — nunca emitir, enviar ni someter a AEAT).

### Tools expuestas (V1 OpenAI submission)

10 tools en el preset `openai_review_invoicing_v1` (apps/app) / submission v1 (apps/holded-mcp):

- 9 read tools: `*list_invoices`, `*get_invoice`, `*list_documents`, `*get_document`, `*get_document_pdf`, `*list_contacts`, `*get_contact`, `*list_accounts`, `*list_daily_ledger` (Claude usa nombres sin prefijo `holded_`)
- 1 write tool: `*create_invoice_draft` (con `confirm: true` obligatorio)

### Garantías de seguridad

1. **OAuth 2.1 + PKCE** obligatorio para ChatGPT/Claude (no shared-secret en flujo público).
2. **HMAC binding** del consent screen (V3.E) — closes replay attack vector.
3. **Cookie `__session`** firmada HS256 + scope `Domain=.verifactu.business` + `SameSite=lax` + `HttpOnly`.
4. **API key Holded cifrada AES-256-GCM** con clave `HOLDED_KEY_SECRET` en DB. Nunca expuesta al modelo.
5. **`approveDoc: false` hardcoded a nivel de wire** en la única tool de escritura. Holded no puede recibir un `approveDoc: true` por accidente desde el conector.
6. **Scopes clampados al preset público** en `/oauth/authorize` — incluso si un cliente OAuth pide scopes extra, el conector los ignora y mintea el code solo con los del preset declarado a OpenAI.

### Datos del tenant demo

`HOLDED_TEST_API_KEY=0ecf1267eacc89ff45acab1b8ca28396` → tenant **NOVA GESTION, SL**.

Ver [`TESTING.md`](./TESTING.md) para los smoke tests, scripts y matriz de prompts POS-01..POS-10.

## Convención de versionado interno

Los fixes aplicados al conector se etiquetan **V3.X** en el changelog:

- **V3.A — V3.D**: hardening inicial de la submission v2 (preset narrowing, output formatting, fallbacks).
- **V3.E**: HMAC binding del consent screen (closes replay attack).
- **V3.F / V3.F.II**: validación de respuestas binarias + smart lookup de contactos.
- **V3.G / V3.G.1**: paginación + orden del libro diario + sort estable + portado Claude.
- **V3.H**: outputSchema JSON Schema en las 10 tools del preset OpenAI.

Ver [`CHANGELOG.md`](./CHANGELOG.md) para el detalle commit por commit.

## Documentación relacionada

- `docs/engineering/HOLDED_CONNECTOR_OPENAI_EXECUTION_PLAN.md` — plan de submission a OpenAI.
- `docs/engineering/HOLDED_CONNECTOR_OPENAI_REVIEW_CHECKLIST.md` — checklist pre-submission.
- `docs/engineering/HOLDED_CONNECTOR_OPENAI_REQUIREMENTS_HISTORY.md` — histórico de requisitos.
- `docs/engineering/AUTH_FLOWS_AUDIT_2026.md` — auditoría de flujos auth.
- `docs/openai-submission/chatgpt-app-submission.json` — manifest declarado a OpenAI.
- `docs/engineering/mcp/MCP_INSPECTOR_GUIDE.md` — debug con MCP Inspector.
