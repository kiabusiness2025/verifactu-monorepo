# Isaak Platform API v1 — Especificación

**Fecha:** 2026-05-01  
**Versión:** 1.0-draft  
**Estado:** Aprobado para implementación (Fase 2)

---

## Principios de diseño

1. **Versionado desde el día 1** — todos los endpoints bajo `/api/v1/`
2. **Envelope estándar** — toda respuesta envuelve `data` en `{ ok, data, meta }`
3. **requestId obligatorio** — trazabilidad en logs y soporte
4. **Auth por capas** — primero cookie (Isaak UI), luego Bearer (partners)
5. **Scope explícito** — cada endpoint declara el scope mínimo necesario
6. **Confirmación para irreversibles** — VeriFactu/AEAT requiere `confirmationToken`
7. **Audit log en escrituras** — todas las acciones mutativas se registran
8. **Sin secretos en respuesta** — nunca exponer tokens, hashes internos, contraseñas

---

## Autenticación

### Cookie (Fase 2 — Isaak UI)

```
Cookie: __session=<JWT firmado con SESSION_SECRET>
```

El JWT contiene `{ uid, tenantId, roles, tenants }`. La capa de middleware valida la firma y extrae el tenant activo.

### Bearer API Key (Fase 4 — partners)

```
Authorization: Bearer isk_live_<32-bytes-base64url>
```

La clave se hashea con SHA-256 y se compara contra `IsaakPlatformKey.keyHash`. El tenant se obtiene de la relación en base de datos.

---

## Formato de respuesta estándar

### Éxito

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_01HXYZ",
    "tenantId": "uuid-v4",
    "environment": "live",
    "timestamp": "2026-05-01T12:00:00.000Z"
  }
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "permission_denied",
    "message": "No tienes permiso para emitir facturas.",
    "stage": "authorization",
    "reason": "missing_scope"
  },
  "meta": {
    "requestId": "req_01HXYZ"
  }
}
```

### Paginación (listas)

```json
{
  "ok": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 134,
    "hasMore": true
  },
  "meta": {}
}
```

---

## Cabeceras

### Cabeceras de request

| Cabecera                 | Requerida   | Descripción                                              |
| ------------------------ | ----------- | -------------------------------------------------------- |
| `Authorization`          | Condicional | Bearer token para API keys                               |
| `X-Verifactu-Request-Id` | Opcional    | Idempotency key (si se omite, se genera automáticamente) |
| `Content-Type`           | POST/PUT    | `application/json`                                       |

### Cabeceras de response

| Cabecera                 | Descripción                        |
| ------------------------ | ---------------------------------- |
| `X-Verifactu-Request-Id` | requestId aplicado a esta petición |
| `X-RateLimit-Limit`      | Límite de requests por hora        |
| `X-RateLimit-Remaining`  | Requests restantes en la ventana   |
| `X-RateLimit-Reset`      | Unix timestamp de reset            |

---

## Endpoints

### Companies

#### `GET /api/v1/companies/current`

Devuelve el contexto de la empresa activa del tenant.

**Scope:** `company.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Response 200:**

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "Empresa SL",
    "nif": "B12345678",
    "fiscalAddress": {
      "street": "Calle Mayor 1",
      "city": "Madrid",
      "postalCode": "28001",
      "country": "ES"
    },
    "vatRegime": "general",
    "verifactuEnabled": true,
    "plan": "pro",
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "meta": {}
}
```

**Errores:**

- `401 unauthorized` — sin autenticación
- `404 not_found` — tenant no existe o sin empresa configurada

---

### Invoices

#### `GET /api/v1/invoices`

Lista facturas del tenant con filtros opcionales.

**Scope:** `invoices.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Query params:**

| Param      | Tipo     | Default | Descripción                     |
| ---------- | -------- | ------- | ------------------------------- | --------- | --------- | -------- | --------- |
| `page`     | int      | 1       | Página                          |
| `limit`    | int      | 50      | Máx 100                         |
| `status`   | string   | —       | `draft                          | validated | submitted | accepted | rejected` |
| `from`     | ISO date | —       | Fecha de factura ≥              |
| `to`       | ISO date | —       | Fecha de factura ≤              |
| `customer` | string   | —       | Búsqueda por nombre/NIF cliente |

**Response 200:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "inv_01HXYZ",
      "number": "2026-001",
      "status": "submitted",
      "customer": {
        "name": "Cliente SA",
        "nif": "A87654321"
      },
      "issueDate": "2026-04-30",
      "dueDate": "2026-05-30",
      "total": 1210.0,
      "currency": "EUR",
      "verifactu": {
        "status": "accepted",
        "submittedAt": "2026-04-30T15:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "hasMore": false
  },
  "meta": {}
}
```

---

#### `POST /api/v1/invoices`

Crea un borrador de factura.

**Scope:** `invoices.write`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Request body:**

```json
{
  "customer": {
    "name": "Cliente SA",
    "nif": "A87654321",
    "address": "Calle Ejemplo 5, Madrid"
  },
  "issueDate": "2026-05-01",
  "dueDate": "2026-05-31",
  "items": [
    {
      "description": "Consultoría fiscal Q1",
      "quantity": 1,
      "unitPrice": 1000.0,
      "taxRate": 21,
      "taxCategory": "S"
    }
  ],
  "notes": "Pago a 30 días"
}
```

**Response 201:**

```json
{
  "ok": true,
  "data": {
    "id": "inv_01HABC",
    "number": "2026-002",
    "status": "draft",
    "total": 1210.0,
    "tax": 210.0,
    "base": 1000.0,
    "createdAt": "2026-05-01T09:00:00Z"
  },
  "meta": {}
}
```

**Errores:**

- `400 validation_error` — campos inválidos (NIF formato, importes negativos, etc.)
- `403 missing_scope` — token sin `invoices.write`

---

#### `GET /api/v1/invoices/:id`

Detalle de una factura.

**Scope:** `invoices.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Response 200:** Mismo schema que un item de la lista, expandido con `items[]` completos y historial de estados.

**Errores:**

- `404 not_found` — factura no existe o pertenece a otro tenant

---

#### `POST /api/v1/invoices/:id/validate`

Valida la factura contra las reglas VeriFactu/AEAT sin enviarla.

**Scope:** `invoices.read` (solo lectura: simula sin persistir)  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Response 200:**

```json
{
  "ok": true,
  "data": {
    "valid": true,
    "warnings": [],
    "errors": [],
    "verifactuHash": "sha256-preview-only",
    "readyToIssue": true
  },
  "meta": {}
}
```

---

#### `POST /api/v1/invoices/:id/issue`

**Acción irreversible.** Envía la factura a AEAT vía SOAP VeriFactu.

**Scope:** `invoices.issue`  
**Auth:** Cookie | Bearer  
**Confirmación:** **Sí — `confirmationToken` obligatorio**

**Flujo de confirmación:**

1. Llamar a `POST /api/v1/invoices/:id/issue` sin `confirmationToken`
2. Respuesta `202 confirmation_required` con token de 5 min
3. Mostrar resumen al usuario y solicitar confirmación explícita
4. Llamar de nuevo con `{ "confirmationToken": "..." }`
5. Respuesta `200` con resultado AEAT

**Request body (paso 1 — sin token):**

```json
{}
```

**Response 202 (confirmation_required):**

```json
{
  "ok": false,
  "error": {
    "code": "confirmation_required",
    "message": "Esta acción enviará la factura a la AEAT y no puede deshacerse.",
    "stage": "pre_execution",
    "confirmationToken": "ctok_01HXYZ",
    "expiresAt": "2026-05-01T09:05:00Z",
    "preview": {
      "invoiceNumber": "2026-002",
      "customer": "Cliente SA (A87654321)",
      "total": "1.210,00 €",
      "issueDate": "2026-05-01"
    }
  },
  "meta": {}
}
```

**Request body (paso 2 — con token):**

```json
{
  "confirmationToken": "ctok_01HXYZ"
}
```

**Response 200 (éxito AEAT):**

```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_01HABC",
    "verifactuStatus": "accepted",
    "verifactuHash": "abc123def456...",
    "verifactuQr": "https://www2.agenciatributaria.gob.es/...",
    "aeatResponse": {
      "codigoEstado": "1200",
      "descripcionEstado": "Correcto"
    },
    "submittedAt": "2026-05-01T09:01:00Z"
  },
  "meta": {}
}
```

**Errores:**

- `400 validation_error` — factura inválida para AEAT
- `400 confirmation_token_expired` — token expirado (volver al paso 1)
- `400 confirmation_token_invalid` — token no válido
- `409 already_submitted` — factura ya enviada
- `502 aeat_error` — error en respuesta SOAP AEAT

---

#### `GET /api/v1/invoices/:id/pdf`

Genera y devuelve el PDF de la factura.

**Scope:** `invoices.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Response 200:**

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="2026-002.pdf"
```

---

#### `GET /api/v1/invoices/:id/verifactu-status`

Estado actual de la factura en AEAT.

**Scope:** `invoices.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Response 200:**

```json
{
  "ok": true,
  "data": {
    "invoiceId": "inv_01HABC",
    "status": "accepted",
    "hash": "abc123...",
    "qrUrl": "https://www2.agenciatributaria.gob.es/...",
    "submittedAt": "2026-05-01T09:01:00Z",
    "aeatEvents": [
      {
        "timestamp": "2026-05-01T09:01:05Z",
        "code": "1200",
        "description": "Correcto"
      }
    ]
  },
  "meta": {}
}
```

---

### VeriFactu

#### `GET /api/v1/verifactu/events`

Historial completo de eventos AEAT del tenant.

**Scope:** `invoices.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Query params:** `from`, `to`, `status`, `page`, `limit`

---

### Actions

Sistema de acciones propuestas/aprobadas para auditoría de cambios importantes.

#### `GET /api/v1/actions`

Lista acciones del tenant.

**Scope:** `actions.read`  
**Auth:** Cookie | Bearer

**Query params:** `status` (`pending | approved | executed | cancelled | expired`), `from`, `to`, `page`, `limit`

---

#### `POST /api/v1/actions`

Propone una acción para revisión/ejecución posterior.

**Scope:** `actions.propose`  
**Auth:** Cookie | Bearer  
**Confirmación:** No (la confirmación se requiere en `/approve` o `/execute`)

**Request body:**

```json
{
  "type": "issue_invoice",
  "payload": {
    "invoiceId": "inv_01HABC"
  },
  "reason": "Solicitud por email de cliente 2026-05-01",
  "expiresInSeconds": 3600
}
```

**Response 201:**

```json
{
  "ok": true,
  "data": {
    "id": "act_01HXYZ",
    "type": "issue_invoice",
    "status": "pending",
    "payload": { "invoiceId": "inv_01HABC" },
    "riskLevel": "high",
    "expiresAt": "2026-05-01T10:00:00Z",
    "createdAt": "2026-05-01T09:00:00Z"
  },
  "meta": {}
}
```

---

#### `GET /api/v1/actions/:id`

Detalle de una acción.

**Scope:** `actions.read`

---

#### `POST /api/v1/actions/:id/approve`

Aprueba una acción pendiente. Genera `confirmationToken` para ejecución.

**Scope:** `actions.execute`  
**Confirmación:** Sí (token de aprobación)

---

#### `POST /api/v1/actions/:id/execute`

Ejecuta una acción aprobada.

**Scope:** `actions.execute`  
**Confirmación:** Sí (`confirmationToken`)

---

#### `POST /api/v1/actions/:id/cancel`

Cancela una acción pendiente.

**Scope:** `actions.propose`

---

### Audit

#### `GET /api/v1/audit/events`

Historial de audit log del tenant.

**Scope:** `audit.read`  
**Auth:** Cookie | Bearer  
**Confirmación:** No

**Query params:** `from`, `to`, `channel` (`api|mcp|dashboard`), `riskLevel`, `page`, `limit`

**Response 200:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "log_01HXYZ",
      "requestId": "req_01HABC",
      "channel": "mcp",
      "method": "POST",
      "endpoint": "/api/mcp/isaak",
      "toolOrAction": "isaak_issue_verifactu_invoice",
      "status": 200,
      "durationMs": 1523,
      "riskLevel": "high",
      "confirmationRequired": true,
      "createdAt": "2026-05-01T09:01:00Z"
    }
  ],
  "pagination": {},
  "meta": {}
}
```

---

## Códigos de error

| Código HTTP | `error.code`                 | Descripción                                 |
| ----------- | ---------------------------- | ------------------------------------------- |
| 400         | `validation_error`           | Campos inválidos en el body                 |
| 400         | `confirmation_token_expired` | Token de confirmación expirado              |
| 400         | `confirmation_token_invalid` | Token de confirmación no válido             |
| 401         | `unauthorized`               | Sin autenticación válida                    |
| 403         | `permission_denied`          | Autenticado pero sin permiso                |
| 403         | `missing_scope`              | Token sin el scope requerido                |
| 404         | `not_found`                  | Recurso no encontrado                       |
| 409         | `already_submitted`          | Acción ya realizada (idempotency)           |
| 422         | `unprocessable`              | Datos válidos pero regla de negocio rechaza |
| 429         | `rate_limit_exceeded`        | Límite de requests superado                 |
| 502         | `aeat_error`                 | Error en comunicación con AEAT SOAP         |
| 503         | `service_unavailable`        | Servicio externo no disponible              |

---

## Rate limits

| Plan              | Requests/hora                | Burst (por minuto) |
| ----------------- | ---------------------------- | ------------------ |
| Free              | 100                          | 10                 |
| Pro               | 1.000                        | 60                 |
| Business          | 5.000                        | 200                |
| Partner API (key) | configurable (default 1.000) | 100                |

Las cabeceras `X-RateLimit-*` informan del estado en cada response.

---

## Versionado y deprecación

- Versión actual: `v1`
- Versión añadida en cabecera: `X-Verifactu-API-Version: 1.0`
- Política de deprecación: mínimo 6 meses de aviso con cabecera `Deprecation`
- Breaking changes requieren versión nueva (`v2`)

---

## Referencia OpenAPI

El fichero `openapi/isaak-platform-api-v1.yaml` contiene la especificación OpenAPI 3.1 completa con schemas, ejemplos y validación de tipos.

---

## Implementación: Fase 2

Ver `ISAAK_MCP_API_IMPLEMENTATION_PLAN_2026.md` Fase 2 para estructura de rutas y orden de implementación.
