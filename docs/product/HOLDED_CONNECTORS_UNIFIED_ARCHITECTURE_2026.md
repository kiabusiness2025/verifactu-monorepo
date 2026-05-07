# Holded Connectors — Arquitectura Unificada 2026

**Fecha:** 2026-05-04
**Estado:** Plan maestro · implementación en sesiones sucesivas
**Prioridad:** Hacer bien, sin prisas. Ambos conectores al 100% en mobile y desktop. Paridad ChatGPT ↔ Claude. Admin panel completo.

---

## 🎯 Visión

Unificar la arquitectura de los conectores Holded para que **ChatGPT y Claude sean equivalentes en capacidades, governance y visibilidad administrativa**, con un único origen de verdad (BD principal) y soporte mobile robusto.

## 🔴 Problemas actuales

### 1. Mobile bloqueado en ChatGPT

- Firebase Auth en `/auth/holded` rompe en iOS in-app browser por aislamiento de IndexedDB/localStorage
- ChatGPT mobile solo soporta OAuth, no Bearer custom → PAT no resuelve mobile
- **Bloquea**: resubmit a OpenAI Apps SDK directory

### 2. Claude usuarios fantasma

- `apps/holded-mcp` usa `userId = sha256(holdedApiKey)` sin User en BD principal
- Tablas `holded_mcp_oauth_*` aisladas — NO se cruzan con `User`, `Tenant`, `ExternalConnection`
- **Consecuencias**:
  - Sin email contacto del usuario
  - Sin company info en BD
  - Sin emails admin governance (`buildHoldedConnectedAdminEmail` no se dispara)
  - Sin visibilidad en admin panel
  - Sin pipeline de conversión a Isaak Pro
  - DPA dice que registramos al usuario pero realmente no lo hacemos

### 3. Páginas públicas asimétricas

- ChatGPT y Claude tienen páginas legales (terms, privacy, dpa, soporte, docs, demo) duplicadas con divergencias
- Los textos están en sync pero los URLs y assets se han ido acumulando inconsistencias
- Cambios de copy se hacen en uno pero a veces no en el otro

### 4. Panel admin no incluye conectores

- El admin de tenants/connections no muestra conexiones MCP (ni ChatGPT ni Claude)
- Sin métricas de uso por canal
- Sin capacidad de revocar conexiones desde admin

---

## 🏛️ Arquitectura objetivo

```
                     ┌──────────────────────────────────┐
                     │  Single source of truth (BD)      │
                     │  • User                           │
                     │  • Tenant + TenantProfile         │
                     │  • Membership                     │
                     │  • ExternalConnection             │
                     │  • HoldedMcpAuditLog              │
                     │  • HoldedMcpPersonalAccessToken   │
                     └─────────────────┬────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
   ┌──────────▼──────────┐  ┌─────────▼──────────┐  ┌─────────▼──────────┐
   │  ChatGPT mobile     │  │  Claude desktop    │  │  Dashboard usuario │
   │  /auth/holded-direct│  │  apps/holded-mcp/  │  │  Firebase login    │
   │  (form simple)      │  │  consent screen    │  │  (existente)       │
   │                     │  │  (modificado)      │  │                    │
   └──────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘
              │                       │                        │
              └───────────────────────┼────────────────────────┘
                                      │
                       ┌──────────────▼───────────────┐
                       │ POST /api/integrations/      │
                       │  holded/upsert-from-key      │
                       │ (endpoint común)             │
                       │  • Valida API key            │
                       │  • Upsert User+Tenant        │
                       │  • Upsert Connection         │
                       │  • Mint session O auth code  │
                       │  • Triggers admin emails     │
                       └──────────────────────────────┘
```

### Principios

1. **Una sola tabla de verdad**: cualquier conexión Holded (desktop/mobile/Claude/ChatGPT) crea o actualiza el mismo `ExternalConnection`
2. **Email obligatorio**: nunca crear conexión sin capturar email personal del usuario + email admin de empresa
3. **T&C explícito**: cada conexión registra `legalTermsAcceptedAt` con versión
4. **Audit log unificado**: todas las acciones (`created`, `used`, `revoked`, `revoked_by_admin`) en una sola tabla
5. **Paridad de páginas públicas**: ChatGPT y Claude comparten estructura, solo cambian colores y textos del proveedor
6. **Admin panel completo**: ver todas las conexiones por canal, métricas, revocar, contactar

---

## 📋 Backlog completo por fases

### FASE 1 — Endpoint unificado de upsert (CRÍTICO)

> El corazón de la arquitectura

- [ ] **F1.1** `POST /api/integrations/holded/upsert-from-key`
  - Body: `{personalEmail, holdedApiKey, channel: 'chatgpt'|'claude'|'mobile', acceptedTerms, acceptedPrivacy, source}`
  - Valida API key vía `probeAccountingApiConnection`
  - Llama a Holded `/api/general/me` (o equivalente) para extraer `companyName`, `companyEmail`, `cif`
  - Upsert User (`authProvider: 'HOLDED_DIRECT'`)
  - Upsert Tenant + TenantProfile (con company info de Holded)
  - Upsert Membership (role: owner)
  - Upsert ExternalConnection (provider: 'holded', channelKey: el del param)
  - Dispara emails:
    - Personal: "Conector Holded conectado correctamente" al usuario
    - Admin empresa: `buildHoldedConnectedAdminEmail` al companyEmail
  - Audit log entry
  - Return `{ok, userId, tenantId, connectionId, sessionToken? | authCode?}`

- [ ] **F1.2** Helper compartido `lib/integrations/holdedConnectionUpsert.ts`
  - Función pura reutilizable desde:
    - El endpoint HTTP (ChatGPT mobile)
    - Server-side de la consent screen de Claude
    - Server-side del dashboard manual

- [ ] **F1.3** Schema Prisma:
  - Añadir `HOLDED_DIRECT` al enum `AuthProvider`
  - Añadir `'mobile'` y `'claude'` como valores válidos en `ExternalConnection.channelKey` (ya es string)

### FASE 2 — ChatGPT mobile (form self-contained)

> Resuelve el bloqueo iOS in-app browser

- [ ] **F2.1** Página `/auth/holded-direct/page.tsx`
  - Form simple: email + apiKey + T&C
  - Sin Firebase, sin IndexedDB, sin localStorage
  - POST a `/api/auth/holded-direct` (wrapper que llama F1.1 + minta cookie de sesión)
  - Redirect a `?next=` después
  - Tema neutro (sirve para ambos conectores con `?provider=`)

- [ ] **F2.2** `/api/auth/holded-direct` wrapper
  - Llama F1.1 con `channel: 'mobile'`
  - Mintea cookie `.verifactu.business` con SameSite=None, Secure
  - Returns `{ok, redirectUrl}`

- [ ] **F2.3** Modificar `/oauth/authorize` para redirigir a `/auth/holded-direct` cuando no hay sesión (en lugar de `/auth/holded` Firebase)

- [ ] **F2.4** Test mobile real iOS + Android: confirmar que flow completo conecta ChatGPT mobile al MCP

### FASE 3 — Claude consent screen unificada

> Cierra el gap de usuarios fantasma

- [ ] **F3.1** Modificar `apps/holded-mcp/src/oauth-routes.ts` consent screen
  - Form actual: solo apiKey
  - Form nuevo: email personal + apiKey + T&C
  - Compartir BD via DATABASE_URL común con apps/app

- [ ] **F3.2** En `apps/holded-mcp/src/auth.ts`:
  - Cambiar `userId = sha256(apiKey)` → `userId = User.id` real de Verifactu
  - Llamar al helper F1.2 para upsert antes de crear authorization code
  - Mantener compatibilidad: si email no se proporciona, fallback a sha256 (tokens antiguos siguen funcionando)

- [ ] **F3.3** Migración backfill de usuarios Claude existentes
  - Inventario de filas en `holded_mcp_oauth_access_tokens` sin User asociado
  - Email a admins de Holded con link para "completar perfil" (capturar email)
  - Script que crea User+Tenant+Connection retroactivamente cuando responden

- [ ] **F3.4** Test Claude: la primera conexión debe crear User+Tenant en BD principal y disparar emails admin

### FASE 4 — Paridad de páginas públicas ChatGPT ↔ Claude

> Estructura idéntica, solo cambian provider/colores

- [ ] **F4.1** Refactor: extraer `<ConnectorLegalPage>` shared component
  - `/conectores/{provider}/terms` ← single component, props: `provider, theme`
  - `/conectores/{provider}/privacy` ← idem
  - `/conectores/{provider}/dpa` ← idem
  - `/conectores/{provider}/soporte` ← idem
  - `/conectores/{provider}/docs` ← idem
  - `/conectores/{provider}/demo` ← idem
  - Beneficio: cambios de copy futuros solo en un sitio

- [ ] **F4.2** Auditar diferencias actuales y migrar a la versión consolidada

- [ ] **F4.3** Banner mobile-friendly en ambas landings
  - "¿En móvil? Usa nuestro flujo simplificado → /auth/holded-direct"

### FASE 5 — Flujos de email completos

> Avisos a personal + admin empresa para cada evento

Eventos a notificar (por canal):

| Evento                      | Email personal                      | Email empresa admin                               |
| --------------------------- | ----------------------------------- | ------------------------------------------------- |
| Conexión creada             | "Tu conector está activo"           | `buildHoldedConnectedAdminEmail` (existe)         |
| Conexión revocada           | "Tu conector se desconectó"         | `buildHoldedDisconnectedAdminEmail` (existe)      |
| Token usado por primera vez | (silencioso)                        | "Primera actividad detectada" (NUEVO)             |
| Tool de write ejecutado     | (silencioso)                        | "Borrador de factura creado vía conector" (NUEVO) |
| Error de auth (3+ intentos) | "Algo va mal con tu conector"       | "Intentos fallidos detectados" (NUEVO)            |
| Sin actividad 30 días       | "¿Sigues usando el conector?"       | (silencioso)                                      |
| API key revocada en Holded  | "Tu API key fue revocada en Holded" | "Conexión inválida — reconectar"                  |

- [ ] **F5.1** Auditar emails actuales en `apps/holded/app/lib/communications/holded-email-templates.ts`
- [ ] **F5.2** Crear los templates faltantes (5 nuevos)
- [ ] **F5.3** Wire en endpoint F1.1 + en MCP route + en revocaciones admin

### FASE 6 — Admin panel completo

> Visibilidad y control desde el dashboard de admin

- [ ] **F6.1** Página `/admin/tenants/[id]/connectors`
  - Lista de conexiones (ChatGPT, Claude, Dashboard) por tenant
  - Estado, fecha conexión, última actividad
  - Botón "Revocar conexión"
  - Botón "Reenviar email a personal/admin"

- [ ] **F6.2** Métricas globales
  - Conexiones activas por canal (ChatGPT vs Claude vs Dashboard)
  - Tokens activos
  - Tools más usados
  - Errores 401/403 últimas 24h

- [ ] **F6.3** Búsqueda
  - Por email personal
  - Por company name
  - Por CIF
  - Por API key prefix

- [ ] **F6.4** Audit log viewer
  - Stream de eventos `holded_mcp_audit_log` por tenant
  - Filtros: created, used, revoked, error

### FASE 7 — Onboarding post-conexión

> Capturar más datos progresivamente para que el conector "asesore" mejor

- [ ] **F7.1** Tras primera conexión, email "Completa tu perfil"
  - Sector, tamaño empresa, modelo de negocio
  - Trimestre fiscal preferido
  - Asesoría externa sí/no

- [ ] **F7.2** Página `/onboarding/profile` que guarda en `TenantProfile`

- [ ] **F7.3** Sistema usa estos datos:
  - El conector entiende "cierre trimestre" según el preferido
  - Sugiere modelos AEAT relevantes según sector
  - Alerta de fechas fiscales personalizadas

### FASE 8 — Test e2e + resubmit OpenAI

> Validación completa antes de relanzar al directory

- [ ] **F8.1** Test e2e en ChatGPT desktop con OAuth normal (deberá seguir funcionando)
- [ ] **F8.2** Test e2e en ChatGPT mobile con form (NUEVO)
- [ ] **F8.3** Test e2e en Claude desktop (con paridad de DB)
- [ ] **F8.4** Resubmit a OpenAI Apps SDK directory con appeal explicando los fixes

---

## ✅ Lo que ya está hecho (no se tira)

De sesiones anteriores ya tenemos estos cimientos en producción:

| Componente                                                              | Estado | Comentario                                                       |
| ----------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Schema PAT                                                              | ✅     | Útil para clientes Bearer-aware (scripts, integraciones)         |
| Token store + verify                                                    | ✅     | API completa: createPat, verifyPat, revokePat, listPatsForTenant |
| MCP route acepta `Bearer hldmcp_*`                                      | ✅     | Sigue válido para no-ChatGPT-mobile                              |
| 3 tools nuevos (crm_funnels, leads, time_records)                       | ✅     | Benefician todos los canales                                     |
| Preset `claude_parity` (14 scopes → 29 tools)                           | ✅     | Default para PATs                                                |
| Script CLI `create-holded-pat.ts`                                       | ✅     | Útil para soporte interno                                        |
| F1-F7 fixes OpenAI rejection (ISO dates, flat payload, smart formatter) | ✅     | Aplicados al MCP route                                           |
| Páginas legales actuales (sin paridad refactor)                         | ✅     | Funcionan, solo necesitan refactor en F4                         |
| Cross-link Holded ↔ Isaak en landings                                   | ✅     | Aplicado                                                         |
| 10 capabilities en /conectores/claude                                   | ✅     | Aplicado                                                         |
| Demo page Claude con 24 GIFs placeholders                               | ✅     | Aplicado                                                         |
| /pricing + /signup en Isaak                                             | ✅     | Frontend listo, backend pendiente (otro plan)                    |

---

## 🗓️ Plan de sesiones sugerido

| Sesión       | Foco                                                    | Duración estimada |
| ------------ | ------------------------------------------------------- | ----------------- |
| **Sesión 1** | F1 (endpoint común + helper + schema) + F1.2 sub-helper | 4-5h              |
| **Sesión 2** | F2 (ChatGPT mobile flow completo + test)                | 3-4h              |
| **Sesión 3** | F3 (Claude consent unificada + backfill plan)           | 3-4h              |
| **Sesión 4** | F4 (refactor paridad páginas públicas)                  | 3-4h              |
| **Sesión 5** | F5 (emails completos) + F6 (admin panel inicial)        | 5-6h              |
| **Sesión 6** | F6 (admin panel completo) + F7 (onboarding profile)     | 4-5h              |
| **Sesión 7** | F8 (test e2e + resubmit OpenAI)                         | 3-4h              |

**Total estimado:** 25-32 horas distribuidas en 7 sesiones cómodas (~4h cada una).

---

## 🚦 Cómo arrancar la próxima sesión

**Prompt sugerido para Sesión 1:**

> "Vamos con Sesión 1 del plan en `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md`. Implementa F1: el endpoint común `POST /api/integrations/holded/upsert-from-key` y el helper compartido en `lib/integrations/holdedConnectionUpsert.ts`. Empieza por estudiar el flujo actual de `/api/integrations/accounting/connect/route.ts` para extraer la lógica común, luego diseña el helper, luego construye el endpoint."

Esto cubre:

- Lectura del plan (que ya tiene todo el contexto)
- Foco en F1 sin saltar a otras fases
- Punto de partida claro (estudiar el connect/route.ts existente)

---

## 📌 Decisiones clave registradas

1. **Endpoint común vs implementaciones separadas**: ELEGIDO endpoint común (DRY, single source of truth)
2. **PAT preserved**: lo dejamos en producción para clientes Bearer (Claude desktop, scripts), no se tira
3. **ChatGPT desktop OAuth NO se toca**: la submission OpenAI ya tiene los 7 tools certificados
4. **Backfill Claude users**: necesario, en F3.3
5. **Paridad páginas**: refactor a shared component en F4
6. **Admin panel**: completo en F6 (no se queda fuera del alcance)
7. **TenantProfile rico**: capturamos sector/tamaño/etc en F7 para que el conector asesore mejor
8. **Sin prisas**: 7 sesiones distribuidas, calidad sobre velocidad

---

## ⚠️ Riesgos identificados

1. **iOS ITP cookie partitioning**: aunque eliminemos Firebase, iOS puede aún partitionar la cookie de sesión dentro del in-app browser. Si pasa, fallback a device code flow en F2.4 (RFC 8628)
2. **Backfill Claude users**: si los usuarios actuales no responden al email, mantenemos el fallback `userId = sha256(apiKey)` indefinidamente — accept this
3. **Migration risk**: cambiar `userId` en Claude requiere migración cuidadosa de tokens activos. Plan: dual-write durante 30 días (escribir ambos sha y user.id), después cleanup
4. **OpenAI re-review**: cada cambio en el conector ChatGPT requiere re-aprobar. Mantenemos el flow OAuth desktop INTACTO en esta refactor
5. **Email deliverability**: 5 nuevos templates → asegurar que Resend no marca como spam. Test inicial a 3-5 destinatarios antes de rollout

---

## 🎯 Definición de "hecho"

El proyecto está completo cuando:

- ✅ Cualquier usuario (mobile o desktop, ChatGPT o Claude) que conecte Holded queda registrado en `User + Tenant + ExternalConnection`
- ✅ Email personal + email admin empresa reciben las notificaciones esperadas en cada evento
- ✅ Admin puede ver, filtrar, revocar conexiones desde el panel
- ✅ ChatGPT mobile conecta sin tocar Firebase
- ✅ Claude desktop crea User+Tenant en BD principal (no solo en sus tablas locales)
- ✅ Las páginas públicas de ChatGPT y Claude son simétricas (mismo refactor base)
- ✅ El resubmit a OpenAI pasa la review
- ✅ El backfill de usuarios Claude existentes está al menos planificado y comunicado
