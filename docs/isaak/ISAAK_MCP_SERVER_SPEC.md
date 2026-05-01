# Isaak MCP Server — Especificación Canónica

**Versión:** 1.0.0  
**Protocolo:** Model Context Protocol (MCP) 2024-11-05 · JSON-RPC 2.0  
**Endpoint:** `POST /api/mcp/isaak` (en `apps/app`)  
**Descriptor:** `GET /api/mcp/isaak`  
**Última revisión:** 2026-05-01

---

## 1. Propósito y separación de responsabilidades

| MCP                              | Propósito                                                                       | Quién lo usa                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Isaak MCP** (`/api/mcp/isaak`) | Datos fiscales, facturas, VeriFactu, empresa y auditoría del tenant autenticado | Claude Desktop, GPT, cualquier cliente MCP con OAuth o shared secret |
| Holded MCP (`apps/holded-mcp`)   | Consultas de contabilidad al ERP Holded via API Holded                          | Exclusivamente el conector Holded-ChatGPT                            |

Estos dos servidores son independientes y no comparten protocolo de autenticación ni scope.

---

## 2. URL canónica

```
https://app.verifactu.business/api/mcp/isaak
```

El servidor devuelve su propia URL en el campo `_meta.resourceUrl` de la respuesta `initialize`.

---

## 3. Autenticación

### 3.1 OAuth 2.0 (recomendado para integraciones externas)

El servidor implementa OAuth 2.0 con PKCE. Los metadatos del servidor de autorización se publican en:

```
GET https://app.verifactu.business/.well-known/oauth-authorization-server
```

Los metadatos del recurso protegido:

```
GET https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/isaak
```

Flujo:

1. El cliente descubre los endpoints OAuth en `/.well-known/oauth-authorization-server`.
2. El cliente inicia PKCE y obtiene un `access_token` con los scopes necesarios.
3. Todas las llamadas incluyen `Authorization: Bearer <access_token>`.

### 3.2 Shared Secret (uso interno / automatización)

```
Authorization: Bearer <ISAAK_MCP_SHARED_SECRET>
```

Concede acceso completo a todos los scopes. Solo debe usarse en entornos server-side de confianza.

### 3.3 Sin autenticación (acceso público limitado)

Los métodos `initialize` y `tools/list` son accesibles sin token. Todos los demás requieren autenticación.

---

## 4. Scopes

| Scope                      | Descripción                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `isaak.company.read`       | Leer contexto de la empresa: nombre, NIF, plan, conexiones, KPIs |
| `isaak.invoices.read`      | Listar y obtener facturas                                        |
| `isaak.invoices.write`     | Crear borradores de factura                                      |
| `isaak.verifactu.validate` | Validar factura antes de enviar a AEAT                           |
| `isaak.verifactu.submit`   | Emitir factura ante AEAT (operación irreversible)                |
| `isaak.fiscal.read`        | Resumen fiscal y vencimientos                                    |
| `isaak.audit.read`         | Leer log de auditoría                                            |
| `isaak.actions.propose`    | Proponer acciones para revisión del usuario                      |

---

## 5. Métodos JSON-RPC

### 5.1 `initialize`

Inicializa la sesión MCP. No requiere autenticación.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": { "name": "MiCliente", "version": "1.0" },
    "capabilities": {}
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": { "name": "Isaak MCP Server", "version": "1.0.0" },
    "capabilities": { "tools": {} },
    "_meta": {
      "resourceUrl": "https://app.verifactu.business/api/mcp/isaak",
      "description": "Servidor MCP del producto Isaak para facturación VeriFactu..."
    }
  }
}
```

### 5.2 `tools/list`

Lista las herramientas disponibles. No requiere autenticación. Devuelve el catálogo completo con sus `inputSchema` y `annotations`.

### 5.3 `tools/call`

Ejecuta una herramienta. Requiere autenticación.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "isaak_list_invoices",
    "arguments": { "status": "issued", "limit": 10 }
  }
}
```

**Response (éxito):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "{\"invoices\": [...], \"total\": 42}" }],
    "isError": false
  }
}
```

**Response (error de scope):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32001,
    "message": "Missing scope: isaak.invoices.read"
  }
}
```

---

## 6. Herramientas disponibles

| Herramienta                        | Scope requerido            | Requiere confirmación | Riesgo   |
| ---------------------------------- | -------------------------- | --------------------- | -------- |
| `isaak_get_company_context`        | `isaak.company.read`       | No                    | low      |
| `isaak_list_invoices`              | `isaak.invoices.read`      | No                    | low      |
| `isaak_get_invoice`                | `isaak.invoices.read`      | No                    | low      |
| `isaak_get_verifactu_status`       | `isaak.invoices.read`      | No                    | low      |
| `isaak_get_fiscal_summary`         | `isaak.fiscal.read`        | No                    | low      |
| `isaak_create_invoice_draft`       | `isaak.invoices.write`     | No                    | low      |
| `isaak_validate_verifactu_invoice` | `isaak.verifactu.validate` | No                    | low      |
| `isaak_issue_verifactu_invoice`    | `isaak.verifactu.submit`   | **Sí (2 pasos)**      | **high** |
| `isaak_propose_action`             | `isaak.actions.propose`    | No                    | medium   |

### Herramienta `isaak_issue_verifactu_invoice` — flujo de confirmación de 2 pasos

Esta herramienta es **irreversible**: registra la factura ante AEAT. Implementa confirmación explícita:

**Paso 1 — Preview (sin `confirm`):**

```json
{
  "name": "isaak_issue_verifactu_invoice",
  "arguments": { "invoiceId": "inv_abc123" }
}
```

Respuesta: preview de los datos que se enviarán + `confirmationToken` (TTL 5 minutos).

**Paso 2 — Ejecución (con `confirm: true`):**

```json
{
  "name": "isaak_issue_verifactu_invoice",
  "arguments": {
    "invoiceId": "inv_abc123",
    "confirm": true,
    "confirmationToken": "<token-del-paso-1>"
  }
}
```

Respuesta: resultado del registro AEAT.

---

## 7. Configuración para Claude Desktop

```json
{
  "mcpServers": {
    "isaak": {
      "url": "https://app.verifactu.business/api/mcp/isaak",
      "transport": "http",
      "auth": {
        "type": "oauth2",
        "authorizationEndpoint": "https://app.verifactu.business/api/auth/oauth/authorize",
        "tokenEndpoint": "https://app.verifactu.business/api/auth/oauth/token",
        "scope": "isaak.company.read isaak.invoices.read isaak.invoices.write isaak.verifactu.submit isaak.fiscal.read"
      }
    }
  }
}
```

Para acceso con shared secret (automatización interna):

```json
{
  "mcpServers": {
    "isaak-internal": {
      "url": "https://app.verifactu.business/api/mcp/isaak",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer <ISAAK_MCP_SHARED_SECRET>"
      }
    }
  }
}
```

---

## 8. Códigos de error JSON-RPC

| Código   | Significado                               |
| -------- | ----------------------------------------- |
| `-32700` | Parse error                               |
| `-32600` | Invalid request                           |
| `-32601` | Method not found                          |
| `-32602` | Invalid params                            |
| `-32001` | Missing scope                             |
| `-32002` | Confirmation required (ver flujo 2 pasos) |
| `-32603` | Internal error                            |

---

## 9. CORS

El servidor acepta peticiones desde cualquier origen con los siguientes headers permitidos:

- `Authorization`
- `Content-Type`

Headers expuestos: `WWW-Authenticate`.

---

## 10. Fuente de código

```
apps/app/app/api/mcp/isaak/route.ts        — Handler principal
apps/app/app/.well-known/oauth-protected-resource/api/mcp/isaak/route.ts — Metadatos OAuth
apps/app/lib/isaak-platform/               — Servicios, permisos, auditoría
```
