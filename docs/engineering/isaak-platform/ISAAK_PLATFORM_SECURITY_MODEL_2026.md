# Isaak Platform — Modelo de Seguridad 2026

**Fecha:** 2026-05-01  
**Propietario:** Platform Engineering  
**Estado:** Aprobado

---

## Principios fundamentales

1. **Closed-world por defecto** — ningún endpoint o tool MCP accede a recursos externos arbitrarios
2. **Tenant isolation estricta** — cada query filtra por `tenantId` antes de devolver datos
3. **Confirmación obligatoria para irreversibles** — toda acción AEAT/VeriFactu requiere token de confirmación
4. **Audit log inmutable** — toda acción mutativa se registra antes de ejecutarse
5. **Secretos en servidor** — tokens OAuth, API keys, cert AEAT nunca salen al cliente
6. **Scope mínimo** — cada token (cookie, Bearer, OAuth MCP) porta solo los scopes necesarios
7. **Expiración agresiva** — confirmation tokens: 5 min; OAuth access tokens: 1 hora; refresh tokens: 30 días

---

## Capas de autenticación

### Capa 1: Cookie de sesión (Isaak UI)

```
Cookie: __session=<JWT>
Algoritmo: HS256
Secret: SESSION_SECRET (rotación soportada via SESSION_SECRET_PREVIOUS)
Payload: { uid, tenantId, roles, tenants, iat, exp }
```

- Generada por el servidor en login
- HttpOnly, Secure, SameSite=Lax
- No accesible desde JavaScript del cliente
- Rotación de secret sin downtime: leer con secret actual, si falla intentar con anteriores

### Capa 2: Bearer API Key (partners, Fase 4)

```
Header: Authorization: Bearer isk_live_<32-bytes-base64url>
Formato sandbox: isk_test_<32-bytes-base64url>
Almacenamiento: SHA-256(key) en columna IsaakPlatformKey.keyHash
Display: solo prefijo isk_live_xxxxxxxx... (8 chars)
```

- La clave completa solo se muestra **una vez** en el momento de creación
- El hash se compara en tiempo constante para evitar timing attacks
- Cada key tiene `rateLimit`, `scopes[]`, `expiresAt?`, `revokedAt?`
- `lastUsedAt` se actualiza de forma asíncrona (no bloquea la request)

### Capa 3: OAuth 2.0 MCP (Claude, ChatGPT)

```
Flow: Authorization Code con PKCE
Token: JWT corto (1 hora)
Refresh: 30 días, rotación en cada uso
Scopes: isaak.company.read, isaak.invoices.read, isaak.invoices.write, ...
```

Ver `ISAAK_MCP_SERVER_SPEC_2026.md` para el flujo completo.

---

## Modelo de scopes

### Scopes MCP (`isaak.*`)

| Scope                      | Descripción             | Riesgo   |
| -------------------------- | ----------------------- | -------- |
| `isaak.company.read`       | Leer datos de empresa   | Bajo     |
| `isaak.invoices.read`      | Leer facturas y estados | Bajo     |
| `isaak.invoices.write`     | Crear borradores        | Medio    |
| `isaak.fiscal.read`        | Leer resumen fiscal     | Bajo     |
| `isaak.verifactu.validate` | Validar (sin enviar)    | Bajo     |
| `isaak.verifactu.submit`   | **Enviar a AEAT**       | **Alto** |
| `isaak.actions.read`       | Ver acciones propuestas | Bajo     |
| `isaak.actions.propose`    | Proponer acciones       | Medio    |
| `isaak.actions.execute`    | **Ejecutar acciones**   | **Alto** |
| `isaak.audit.read`         | Ver audit log           | Bajo     |
| `isaak.webhooks.write`     | Gestionar webhooks      | Medio    |

### Mapping scopes API → MCP

Los scopes de la API v1 (sin prefijo `isaak.`) mapean directamente a sus equivalentes MCP:

```
company.read         → isaak.company.read
invoices.read        → isaak.invoices.read
invoices.write       → isaak.invoices.write
invoices.issue       → isaak.verifactu.submit
verifactu.validate   → isaak.verifactu.validate
verifactu.submit     → isaak.verifactu.submit
actions.read         → isaak.actions.read
actions.propose      → isaak.actions.propose
actions.execute      → isaak.actions.execute
audit.read           → isaak.audit.read
webhooks.write       → isaak.webhooks.write
```

### Principio de scope mínimo

- Los tokens de integración (Claude, ChatGPT) solo pueden solicitar `*.read` y `*.write`
- Los scopes de ejecución (`*.submit`, `*.execute`) requieren aprobación explícita del admin del tenant
- Un token sin scope para un endpoint recibe `403 missing_scope`, no `401`

---

## Aislamiento de tenants

### Regla universal

**Toda query a base de datos incluye `WHERE tenant_id = ?`** antes de cualquier filtro adicional.

```typescript
// ✅ Correcto
const invoice = await prisma.invoice.findFirst({
  where: { id: invoiceId, tenantId: ctx.tenantId },
});

// ❌ Incorrecto — puede exponer datos de otros tenants
const invoice = await prisma.invoice.findFirst({
  where: { id: invoiceId },
});
```

### Enforcement

- El `IsaakExecutionContext` transporta `tenantId` desde la capa de autenticación
- Los servicios de `lib/isaak-platform/services/` reciben `ctx` como primer argumento
- Los servicios nunca confían en `tenantId` del body o query params — solo del contexto autenticado
- Tests deben verificar explícitamente que requests de tenant A no devuelven datos de tenant B

---

## Patrón de confirmación para acciones irreversibles

Las acciones que interactúan con AEAT son **irreversibles**: una vez enviada una factura, no puede anularse unilateralmente.

### Flujo

```
1. Cliente llama al endpoint sin confirmationToken
   → Respuesta 202 con { confirmationToken, expiresAt, preview }

2. Cliente presenta el preview al usuario humano
   → Usuario confirma explícitamente

3. Cliente llama al endpoint con { confirmationToken }
   → Acción ejecutada; token invalidado inmediatamente
```

### Propiedades de los confirmation tokens

```
Formato:    ctok_<16-bytes-random-base64url>
Validez:    5 minutos desde creación
Uso único:  se invalida tras el primer uso (éxito o fallo)
Scope:      ligado a (tenantId, invoiceId/actionId, acción)
Almacén:    Redis o tabla DB con TTL
```

### Qué no debe hacerse

- Un agente de IA **nunca debe** generar o reutilizar un `confirmationToken` por su cuenta
- El token representa confirmación humana explícita — si no hay humano en el loop, la acción no debe ejecutarse
- Los tokens expirados reciben `400 confirmation_token_expired`, nunca se reintenta silenciosamente

---

## API Keys: ciclo de vida

### Creación

```
1. Admin genera key en /settings/api-keys
2. Sistema genera 32 bytes aleatorios (crypto.randomBytes)
3. Formato: isk_live_ + base64url(32 bytes)
4. SHA-256 del token completo → almacenado en keyHash
5. Prefijo (primeros 8 chars) → almacenado en keyPrefix para display
6. Token completo → mostrado UNA VEZ al admin, jamás almacenado en claro
```

### Validación en runtime

```typescript
// Comparación en tiempo constante para evitar timing attacks
import { timingSafeEqual } from 'crypto';

const submittedHash = sha256(bearerToken);
const storedHash = Buffer.from(record.keyHash, 'hex');
const isValid = timingSafeEqual(Buffer.from(submittedHash, 'hex'), storedHash);
```

### Rotación y revocación

- La revocación es inmediata: `revokedAt = now()`, key deja de funcionar en la siguiente request
- No hay "periodo de gracia" para claves revocadas
- La rotación implica crear una nueva key y revocar la antigua — no hay "re-key" in-place
- Las claves expiradas (`expiresAt < now()`) son tratadas como revocadas

---

## Audit log

### Qué se registra

Toda request que supere autenticación genera un registro en `IsaakApiAuditLog`:

| Campo                  | Descripción                                    |
| ---------------------- | ---------------------------------------------- | ------ | --------- | ------- | ------- |
| `requestId`            | ID único de la request                         |
| `tenantId`             | Tenant que realizó la acción                   |
| `userId`               | Usuario (si auth por cookie)                   |
| `keyId`                | API key usada (si auth por Bearer)             |
| `channel`              | `api                                           | mcp    | dashboard | chatgpt | claude` |
| `method`               | HTTP method                                    |
| `endpoint`             | Path (sin query params con datos sensibles)    |
| `toolOrAction`         | Tool MCP o acción nombrada                     |
| `status`               | HTTP status code                               |
| `durationMs`           | Latencia                                       |
| `riskLevel`            | `low                                           | medium | high`     |
| `confirmationRequired` | Si la acción requirió confirmación             |
| `ip`                   | IP del cliente (anonimizada si GDPR aplicable) |
| `meta`                 | JSON libre para contexto adicional             |

### Qué NO se registra

- Contenido de responses (puede contener datos fiscales sensibles)
- Tokens, claves, hashes internos
- Passwords o certificados
- Query params que contengan datos personales

### Retención

- Audit logs: 7 años (requisito fiscal español)
- Logs de sistema (Pino): 90 días
- Rate limit counters: ventana activa (1 hora)

---

## Seguridad de endpoints MCP

### No tocar Holded MCP

El servidor MCP de Holded (`/api/mcp/holded`) y sus tokens OAuth **no se modifican en ninguna fase**. Los servidores MCP de Isaak y Holded son entidades separadas con:

- URLs de resource distintas
- Well-known metadata distintos
- Scopes sin solapamiento (`isaak.*` vs `holded.*`)
- Tokens OAuth independientes

### Closed-world enforcement

El MCP de Isaak **no accede a URLs arbitrarias**. No tiene tool de tipo `web_search`, `fetch_url`, ni similar. Todos los datos que devuelve provienen de:

1. Base de datos del tenant (Prisma)
2. AEAT SOAP (solo para submit/validate — nunca para consultas libres)
3. Servicios internos (PDF, QR)

### Tool annotations en MCP

Cada tool declara `readOnlyHint`, `destructiveHint` y `openWorldHint: false`:

```typescript
{
  name: 'isaak_issue_verifactu_invoice',
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    openWorldHint: false,
    requiresConfirmation: true,
    riskLevel: 'high'
  }
}
```

---

## Protección contra ataques comunes

### CSRF

- Cookie `__session` tiene `SameSite=Lax` — protege contra CSRF en navegadores modernos
- Endpoints API v1 con Bearer no son vulnerables a CSRF por naturaleza
- Endpoints MCP usan OAuth — tokens en Authorization header, no en cookies

### Timing attacks en API keys

- Comparación con `crypto.timingSafeEqual` (ver sección API Keys)
- Lookup por prefijo (`keyPrefix`) para reducir el conjunto, luego comparación segura

### Rate limiting

- Global: 60 req/min por IP en `/api` (express-rate-limit en apps/api)
- Por token: configurable por key (`IsaakPlatformKey.rateLimit`)
- Headers estándar `X-RateLimit-*` en cada response
- Respuesta `429` con `Retry-After` en segundos

### Injection

- Todos los inputs pasan por validación Zod antes de llegar a los servicios
- Queries Prisma usan parámetros — sin interpolación de strings SQL
- Respuestas JSON escapadas por defecto (no se usa `res.send(string)` para JSON)

### Secretos en logs

- `pino` configurado con `redact: ['req.headers.authorization', 'req.headers.cookie', '*.keyHash', '*.token']`
- URLs de logs no incluyen query params que puedan contener tokens

---

## Checklist de seguridad por fase

### Fase 1 (servicios compartidos)

- [ ] `checkPermission` valida tenantId + scope + plan en un solo punto
- [ ] Todos los servicios reciben `IsaakExecutionContext` — nunca `tenantId` suelto
- [ ] `auditLogger` registra antes de ejecutar (pre-commit audit)

### Fase 2 (API v1)

- [ ] Cookie auth implementada y testeada
- [ ] Tenant isolation verificada con test cross-tenant
- [ ] Confirmation token implementado para `/issue`
- [ ] Rate limiting por IP activo
- [ ] Audit log en todas las rutas write

### Fase 3 (MCP Isaak)

- [ ] Well-known metadata correcto (no comparte con Holded)
- [ ] Todos los tools tienen `openWorldHint: false`
- [ ] Tool de submit requiere `confirmationToken`
- [ ] Tests de scope enforcement (tool sin scope falla con 403)

### Fase 4 (API keys)

- [ ] Key generada con `crypto.randomBytes(32)`
- [ ] Hash con SHA-256, comparación con `timingSafeEqual`
- [ ] Key completa mostrada solo una vez
- [ ] Revocación inmediata sin gracia
- [ ] Rate limit por key operativo

### Fase 5 (portal público)

- [ ] Penetration test externo
- [ ] Revisión de cabeceras HTTP (HSTS, CSP, etc.)
- [ ] Documentación de responsible disclosure
- [ ] Bug bounty policy definida
