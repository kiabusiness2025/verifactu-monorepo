# Tools Manifest — Holded MCP for Claude

**Total tools:** 24 (23 read-only + 1 write con confirmación humana)

**Anthropic Connectors Directory rule:** "Every tool must include either `readOnlyHint: true` or `destructiveHint: true`" — 30% de rechazos del directorio son por falta de annotations.

**Resultado:** todas las 24 tools tienen annotations correctas (ver `apps/holded-mcp/src/tools/policy.ts`).

---

## Read-only tools (23)

Todas con `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.

| Tool                     | Descripción humana                                                | Scope       |
| ------------------------ | ----------------------------------------------------------------- | ----------- |
| `list_documents`         | Listar facturas, presupuestos y documentos de Holded              | holded:read |
| `get_document`           | Obtener detalle de un documento por ID o número                   | holded:read |
| `get_document_pdf`       | Descargar PDF de un documento como base64                         | holded:read |
| `list_contacts`          | Listar contactos (clientes, proveedores, deudores) con paginación | holded:read |
| `get_contact`            | Obtener detalle de un contacto por ID                             | holded:read |
| `list_crm_funnels`       | Listar funnels (pipelines de venta) del CRM                       | holded:read |
| `list_leads`             | Listar leads del CRM                                              | holded:read |
| `list_products`          | Listar productos del catálogo                                     | holded:read |
| `get_product`            | Obtener detalle de un producto por ID                             | holded:read |
| `list_products_stock`    | Listar productos con su stock disponible                          | holded:read |
| `list_warehouses`        | Listar almacenes                                                  | holded:read |
| `list_taxes`             | Listar tipos de impuesto configurados                             | holded:read |
| `list_numbering_series`  | Listar series de numeración                                       | holded:read |
| `list_projects`          | Listar proyectos activos                                          | holded:read |
| `get_project`            | Obtener detalle de un proyecto por ID                             | holded:read |
| `list_project_tasks`     | Listar tareas de un proyecto                                      | holded:read |
| `list_time_records`      | Listar registros de tiempo (timesheet)                            | holded:read |
| `get_chart_of_accounts`  | Plan contable (Chart of Accounts)                                 | holded:read |
| `get_journal`            | Diario contable (Journal)                                         | holded:read |
| `get_daily_book`         | Libro diario (Daily Book)                                         | holded:read |
| `list_employees`         | Listar empleados                                                  | holded:read |
| `get_employee`           | Obtener detalle de un empleado                                    | holded:read |
| `list_treasury_accounts` | Listar cuentas de tesorería (bancos, caja)                        | holded:read |

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

Devuelve los 24 tools con sus annotations completas.
