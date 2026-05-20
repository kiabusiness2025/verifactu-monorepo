# MCP Inspector — Guía para Developers

El MCP Inspector es una herramienta de debug visual que permite conectarse a cualquier servidor MCP, ver los tools disponibles y ejecutar llamadas directamente desde el navegador.

Repo oficial: `@modelcontextprotocol/inspector` — no requiere instalación.

## Dos conectores, dos flujos

El monorepo expone dos conectores MCP independientes:

| Conector    | App               | URL                                     | Auth                  | Usuarios                  |
| ----------- | ----------------- | --------------------------------------- | --------------------- | ------------------------- |
| **Claude**  | `apps/holded-mcp` | `https://claude.verifactu.business/mcp` | OAuth 2.0 DCR         | Claude.ai                 |
| **ChatGPT** | `apps/app`        | `/api/mcp/holded`                       | Bearer secret / OAuth | ChatGPT, Isaak, dashboard |

---

## Requisitos comunes

```bash
node -v  # >= 18
npx @modelcontextprotocol/inspector@latest
```

El Inspector arranca en `http://localhost:6274`. Si el puerto está ocupado:

```powershell
# Windows
netstat -ano | Select-String ":6274|:6277" | ForEach-Object {
  $pid2 = ($_ -split '\s+')[-1]
  Stop-Process -Id ([int]$pid2) -Force -ErrorAction SilentlyContinue
}
```

---

## Conector Claude (`apps/holded-mcp`)

Servidor en Vercel en `https://holded-claude.verifactu.business`. Usa OAuth 2.0 con DCR.

### Pasos de conexión

1. Lanza el Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

1. Abre la URL con el token que imprime en la consola:

```text
http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token>
```

1. En el Inspector UI:

| Campo     | Valor                                   |
| --------- | --------------------------------------- |
| Transport | `Streamable HTTP`                       |
| URL       | `https://claude.verifactu.business/mcp` |

1. Pulsa **Connect** — el Inspector abre la página OAuth de autorización.

1. Introduce la API key de prueba:

```text
0ecf1267eacc89ff45acab1b8ca28396
```

Cuenta demo: **Nova Gestión SL** (`soy@kseniailicheva.com`)

1. Pulsa **Conectar Holded** — el Inspector recibe el token y conecta.

### Qué debes ver tras conectar

- **24 tools** listados con títulos y anotaciones
- `readOnlyHint: true` en los 23 tools de lectura
- `readOnlyHint: false` solo en `create_invoice_draft`

---

## Referencia de los 24 tools

### Fase 1 — Sin dependencias (ejecución directa)

Estos tools no necesitan IDs de otras llamadas previas.

#### `list_contacts`

```json
{}
```

O con filtro de tipo:

```json
{ "type": "client" }
```

Valores de `type`: `client`, `supplier`, `debtor`, `creditor`

---

#### `list_documents`

```json
{ "docType": "invoice" }
```

Con filtro de fecha (ISO 8601):

```json
{ "docType": "invoice", "starttmp": "2026-01-01", "endtmp": "2026-03-31" }
```

Valores de `docType`: `invoice`, `salesreceipt`, `creditnote`, `salesorder`, `proform`, `waybill`, `estimate`, `purchase`, `purchaseorder`, `purchaserefund`

---

#### `list_products`

```json
{}
```

---

#### `list_products_stock`

```json
{}
```

---

#### `list_warehouses`

```json
{}
```

---

#### `list_taxes`

```json
{}
```

---

#### `list_numbering_series`

```json
{}
```

---

#### `list_crm_funnels`

```json
{}
```

---

#### `list_projects`

```json
{}
```

---

#### `list_employees`

```json
{}
```

---

#### `list_treasury_accounts`

```json
{}
```

---

#### `get_chart_of_accounts`

```json
{}
```

---

#### `get_journal`

ISO 8601 recomendado. El servidor convierte internamente a Unix seconds.

```json
{ "starttmp": "2026-01-01", "endtmp": "2026-01-31" }
```

Sin parámetros devuelve todos los apuntes (puede ser lento).

---

#### `get_daily_book`

```json
{ "starttmp": "2026-01-01", "endtmp": "2026-01-31" }
```

---

### Fase 2 — Necesitan un ID de Fase 1

Ejecuta primero la llamada de lista correspondiente, copia un `id` del resultado y úsalo aquí.

#### `get_contact`

ID copiado de `list_contacts` → campo `id` del objeto:

```json
{ "contactId": "<id_de_list_contacts>" }
```

---

#### `get_document`

ID copiado de `list_documents` → campo `id` del objeto:

```json
{ "docType": "invoice", "documentId": "<id_de_list_documents>" }
```

---

#### `get_document_pdf`

Devuelve el documento como base64. Mismo par que `get_document`:

```json
{ "docType": "invoice", "documentId": "<id_de_list_documents>" }
```

El resultado incluye `contentType: "application/pdf"` y `base64: "..."`.

---

#### `get_product`

```json
{ "productId": "<id_de_list_products>" }
```

---

#### `list_leads`

Sin `funnelId` devuelve leads de todos los funnels:

```json
{}
```

Con filtro por funnel (ID de `list_crm_funnels`):

```json
{ "funnelId": "<id_de_list_crm_funnels>" }
```

---

#### `get_project`

```json
{ "projectId": "<id_de_list_projects>" }
```

---

#### `list_project_tasks`

```json
{ "projectId": "<id_de_list_projects>" }
```

---

#### `list_time_records`

```json
{ "projectId": "<id_de_list_projects>" }
```

---

#### `get_employee`

```json
{ "employeeId": "<id_de_list_employees>" }
```

---

### Fase 3 — Tool de escritura (PRECAUCIÓN)

#### `create_invoice_draft`

Crea un borrador **solo en estado draft** (`approveDoc=false` forzado server-side). Requiere un `contactId` real de la cuenta conectada.

```json
{
  "contactId": "<id_de_list_contacts>",
  "date": "2026-05-02",
  "items": [
    {
      "name": "Servicio de prueba Inspector",
      "units": 1,
      "subtotal": 100,
      "tax": 21
    }
  ],
  "notes": "Borrador de prueba — eliminar en Holded"
}
```

El resultado confirma `"approveDoc=false enforced server-side"`. El borrador aparece en Holded → Facturas → Borradores. **Eliminarlo después de la prueba.**

---

## Conector ChatGPT (`apps/app`)

Servidor Next.js en `app.verifactu.business`. Usa JSON-RPC HTTP con Bearer token.

> `tools/list` es público (sin auth). `tools/call` requiere Bearer token.

### Setup local (recomendado)

**1. Variables de entorno** en `apps/app/.env.local`:

```env
MCP_SHARED_SECRET=dev-inspector-secret
HOLDED_TEST_API_KEY=0ecf1267eacc89ff45acab1b8ca28396
```

**2. Arrancar el servidor:**

```bash
pnpm --dir apps/app dev
```

**3. Lanzar el Inspector en otra terminal:**

```bash
npx @modelcontextprotocol/inspector@latest
```

**4. Configurar en el UI:**

| Campo     | Valor                                  |
| --------- | -------------------------------------- |
| Transport | `Streamable HTTP`                      |
| URL       | `http://localhost:3000/api/mcp/holded` |

Añadir header de autorización:

| Header          | Valor                         |
| --------------- | ----------------------------- |
| `Authorization` | `Bearer dev-inspector-secret` |

1. Pulsa **Connect**.

### Qué debes ver

- Tools del preset `holded_priority1` (70+ tools en shared_secret mode)
- Las llamadas a `tools/call` usan `HOLDED_TEST_API_KEY` como fallback en local

---

## Diferencias clave entre los dos conectores

| Aspecto               | Claude (`holded-mcp`)             | ChatGPT (`apps/app`)            |
| --------------------- | --------------------------------- | ------------------------------- |
| Transport SDK         | MCP SDK Streamable HTTP           | JSON-RPC HTTP manual            |
| Protocol version      | latest                            | `2024-11-05`                    |
| Auth local            | OAuth DCR (Inspector lo gestiona) | Bearer `MCP_SHARED_SECRET`      |
| Tools en shared mode  | 24 (preset Anthropic)             | 70+ (preset `holded_priority1`) |
| Scopes                | `holded:read holded:write`        | Por familia de tools            |
| `tools/list` sin auth | No (requiere token)               | Sí (método público)             |

---

## Troubleshooting

**"Error Connecting to MCP Inspector Proxy"**
El puerto 6277 está ocupado. Matar procesos con el comando PowerShell de arriba y relanzar el Inspector.

**"OAuth Authorization Error: Failed to fetch"**
Verificar que Vercel ha desplegado la versión con `client_secret` en el DCR response (commit `d9768bac` o posterior). Comprobar en el log de Vercel.

**"Invalid enum value" en `list_documents`**
`docType` es obligatorio. Valores válidos: `invoice`, `salesreceipt`, `creditnote`, `salesorder`, `proform`, `waybill`, `estimate`, `purchase`, `purchaseorder`, `purchaserefund`.

**`tools/call` devuelve "No Holded API key configured"** (ChatGPT local)
Verificar que `HOLDED_TEST_API_KEY` está en `apps/app/.env.local` y que `NODE_ENV` no es `production`.

**El Inspector abre en pantalla en blanco**
Abrir la URL completa con el token: `http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<token_del_log>`.

**La llamada `get_journal` o `get_daily_book` tarda mucho o timeout**
La API de Holded devuelve todos los apuntes sin paginación cuando no hay filtro de fechas. Usar siempre `starttmp` y `endtmp`.
