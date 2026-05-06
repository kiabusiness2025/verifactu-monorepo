# Holded Direct Auth — Plan de Implementación por Fases

**Fecha inicio:** 2026-05-06  
**Estado:** En progreso  
**Objetivo:** Permitir que ChatGPT mobile complete el flujo OAuth sin depender de Firebase  
**Origen:** [docs/product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md](../../product/HOLDED_MCP_MOBILE_OAUTH_FIX_PLAN.md)

---

## Contexto

El flujo OAuth actual falla en iOS in-app browser porque `/auth/holded` usa Firebase Auth, que depende de `localStorage`/`IndexedDB` — ambos particionados en el in-app browser de iOS.

La solución es un formulario auto-contenido (`/auth/holded-direct`) que:

- No usa Firebase
- Valida el API key directamente contra Holded
- Crea sesión con JWT firmado (igual que el resto del sistema)
- Redirige de vuelta al authorize de OAuth

---

## Arquitectura del flujo nuevo

```
ChatGPT mobile
    ↓
GET /oauth/authorize  (apps/app — sin cambios funcionales)
    ↓  (no hay sesión → ChatGPT client)
buildLoginUrl → /auth/holded-direct?next=<authorize_url>  [CAMBIADO]
    ↓
GET /auth/holded-direct  (apps/holded — NUEVO)
    Form: email + API key Holded + checkbox T&C + checkbox Privacy
    ↓ POST
POST /api/auth/holded-direct  (apps/holded — NUEVO)
    1. Validar campos
    2. probeAccountingApiConnection(apiKey)
    3. upsert User (authProvider=HOLDED_DIRECT) + Tenant + Membership + ExternalConnection
    4. signSessionToken + set cookie __session
    5. return { ok: true, redirectUrl: <next_url> }
    ↓
window.location.replace(redirectUrl)
    ↓
GET /oauth/authorize  (lee cookie __session → emite code)
    ↓
ChatGPT recibe code → exchange → CONECTADO ✅
```

---

## Fases de implementación

### Fase 1 — Schema + Migración Prisma

**Objetivo:** Añadir `HOLDED_DIRECT` al enum `AuthProvider`  
**Archivos:**

- `packages/db/prisma/schema.prisma` — añadir valor al enum
- `packages/db/prisma/migrations/20260506150000_add_holded_direct_auth_provider/migration.sql` — ALTER TYPE

**Estado:** ⬜ Pendiente → ✅ Completado

---

### Fase 2 — Backend endpoint `/api/auth/holded-direct`

**Objetivo:** Validar credenciales + crear entidades + emitir cookie de sesión  
**Archivos:**

- `apps/holded/app/api/auth/holded-direct/route.ts` (NUEVO)

**Comportamiento:**

- `POST { email, apiKey, acceptedTerms, acceptedPrivacy, next }`
- Valida que email y apiKey no estén vacíos
- Valida que ambos checkboxes sean `true`
- Llama `probeAccountingApiConnection(apiKey)` — rechaza si `!probe.ok`
- Transacción Prisma: upsert User → upsert Tenant → upsert Membership → upsert ExternalConnection (channelKey='mobile')
- Firma JWT con `signSessionToken` + `readSessionSecret()`
- Setea cookie `__session` (SameSite=None, Secure, domain=.verifactu.business, 30d)
- Retorna `{ ok: true, redirectUrl }` con `redirectUrl = sanitizeHoldedReturnTarget(next, '/dashboard')`

**Estado:** ⬜ Pendiente → ✅ Completado

---

### Fase 3 — Página frontend `/auth/holded-direct`

**Objetivo:** Formulario simple sin Firebase que funciona en iOS in-app browser  
**Archivos:**

- `apps/holded/app/auth/holded-direct/page.tsx` (NUEVO)

**UI:**

- Logo Verifactu + título "Conecta tu cuenta Holded"
- Campo email (type=email)
- Campo API key Holded (type=password, con toggle)
- Link de ayuda "¿Dónde encuentro mi API key?"
- Checkbox: acepto términos de uso
- Checkbox: acepto política de privacidad
- Botón "Continuar"
- Manejo de errores: MISSING_FIELDS, TERMS_NOT_ACCEPTED, INVALID_API_KEY, errores de red

**Estado:** ⬜ Pendiente → ✅ Completado

---

### Fase 4 — Modificar OAuth authorize redirect

**Objetivo:** Que `buildLoginUrl` apunte a `/auth/holded-direct` en lugar de `/auth/holded`  
**Archivos:**

- `apps/app/lib/oauth/mcp.ts` — cambiar path en `buildLoginUrl`

**Cambio:**

```diff
- const loginUrl = new URL('/auth/holded', holdedSiteUrl);
+ const loginUrl = new URL('/auth/holded-direct', holdedSiteUrl);
```

**Estado:** ⬜ Pendiente → ✅ Completado

---

## Riesgos y mitigaciones

| Riesgo                               | Mitigación                                            |
| ------------------------------------ | ----------------------------------------------------- |
| Cookie particionada por iOS ITP      | SameSite=None; si falla, implementar device_code flow |
| Spam de cuentas con API keys válidas | Rate limit por IP (futuro)                            |
| Open redirect en param `next`        | `sanitizeHoldedReturnTarget` ya implementado          |

---

## Validación post-implementación

1. Build local pasa sin errores TS
2. Migración aplicada a producción (`prisma migrate deploy`)
3. Test manual: ChatGPT mobile → Add connector → OAuth → form → continuar → conectado
4. Verificar logs Vercel: cookie set + lector en /oauth/authorize

---

## Historial de commits por fase

| Fase          | Commit                                                                  | Hash      |
| ------------- | ----------------------------------------------------------------------- | --------- |
| F1 — Schema   | feat(holded-direct): Phase 1 - Prisma HOLDED_DIRECT auth provider       | pendiente |
| F2 — Backend  | feat(holded-direct): Phase 2 - backend endpoint /api/auth/holded-direct | pendiente |
| F3 — Frontend | feat(holded-direct): Phase 3 - login page /auth/holded-direct           | pendiente |
| F4 — OAuth    | feat(holded-direct): Phase 4 - redirect OAuth to holded-direct          | pendiente |
