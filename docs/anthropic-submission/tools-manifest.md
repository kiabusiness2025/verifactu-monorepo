# Tools Manifest — Holded MCP for Claude

> **Última actualización: 2026-05-19.**

**Total tools expuestas (submission v2):** 8 (7 read-only + 1 write con confirmación humana)

**Histórico:**

- Inicialmente: 24 tools (catálogo completo en `apps/holded-mcp/src/tools/`)
- **2026-05-18 (tarde):** estrechado a **8 tools** mediante el preset `submission_v1` (env var `HOLDED_MCP_TOOL_PRESET`), alineado con el set mínimo del conector ChatGPT. Las 16 tools "extra" siguen en el código pero no se registran en `tools/list`. Cuando Anthropic apruebe la submission v2 se reactivará el catálogo completo (`HOLDED_MCP_TOOL_PRESET=full`) como submission v3.

**Anthropic Connectors Directory rule:** "Every tool must include either `readOnlyHint: true` or `destructiveHint: true`" — 30% de rechazos del directorio son por falta de annotations.

**Resultado:** todas las 8 tools expuestas tienen annotations correctas (ver `apps/holded-mcp/src/tools/policy.ts`).

---

## Read-only tools (7)

Todas con `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.

| Tool                    | Descripción humana                                                                          | Scope       |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| `list_documents`        | Listar facturas de venta, facturas de compra y otros documentos comerciales (por `docType`) | holded:read |
| `get_document`          | Obtener detalle de un documento por tipo + ID                                               | holded:read |
| `get_document_pdf`      | Descargar PDF de un documento como base64                                                   | holded:read |
| `list_contacts`         | Listar contactos (clientes, proveedores, deudores) con paginación                           | holded:read |
| `get_contact`           | Obtener detalle de un contacto por ID                                                       | holded:read |
| `get_chart_of_accounts` | Plan contable (Chart of Accounts)                                                           | holded:read |
| `get_journal`           | Libro diario contable, requiere rango de fechas explícito                                   | holded:read |

**Tools del catálogo completo NO expuestas en submission v2** (reactivables vía `HOLDED_MCP_TOOL_PRESET=full` para submission v3):

`get_daily_book` (duplicado conceptual de `get_journal`), `list_crm_funnels`, `list_leads`, `list_products`, `get_product`, `list_products_stock`, `list_warehouses`, `list_taxes`, `list_numbering_series`, `list_projects`, `get_project`, `list_project_tasks`, `list_time_records`, `list_employees`, `get_employee`, `list_treasury_accounts`.

---

## Write tools (1)

### `create_invoice_draft`

**Annotations:**

```ts
{
  readOnlyHint: false,
  destructiveHint: false,   // crea DRAFT que el usuario debe aprobar después
  idempotentHint: false,
  openWorldHint: false,
}
```

**Justificación de `destructiveHint: false`:** El servidor MCP fuerza `approveDoc=false` a nivel del wire al llamar la API de Holded. Esto significa:

- ❌ La factura **nunca** se aprueba automáticamente
- ❌ **No se envía** al cliente
- ❌ **No se cobra** automáticamente
- ❌ **No se transmite a AEAT** (Verifactu)
- ❌ **No tiene efecto legal** hasta que el usuario la apruebe en la UI de Holded
- ✅ Es revisable, editable y descartable por el usuario antes de cualquier emisión

**Wording de la tool description (en inglés, para Claude):**

> "Creates a Holded invoice in draft state. The server forces approveDoc=false at the wire level, so the document is never auto-issued, sent, paid, deleted or otherwise modified destructively. The created draft must be approved manually in Holded UI before it has any legal effect. Provide either contactId (preferred, from list_contacts) OR contactName (the connector resolves the contact via search)."

**Confirmación humana:** El consent screen indica explícitamente que "Crear borradores de factura (con tu confirmación)" requiere aceptación del usuario antes de ejecutarse.

---

## Verification source

Annotations definidas centralmente en:

- `apps/holded-mcp/src/tools/policy.ts` — `READ_ONLY_TOOL_ANNOTATIONS`, `CREATE_INVOICE_DRAFT_ANNOTATIONS`
- Importadas y aplicadas en `apps/holded-mcp/src/tools/{contacts,invoicing,other}.ts`

**Verificable end-to-end:**

```bash
curl https://claude.verifactu.business/mcp \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Devuelve las 8 tools del preset `submission_v1` con sus annotations completas. Para verificar el catálogo completo (24 tools) seteando temporalmente la env var: `HOLDED_MCP_TOOL_PRESET=full pnpm dev` en local.
