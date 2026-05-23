# Sesión 3 — Open Banking via Enable Banking (2026-05-23)

> **Rama**: `claude/audit-connectors-monitoring-IMiC1`
> **PRs**: #113 (integración EB + monitoring) · #114 (test-connect debug temporal) · #115 (limpieza) · #116 (cron expiry + remove test-connect)

## Objetivo

Migrar la capa Open Banking de Isaak desde **GoCardless Bank Account Data** (cerró nuevos registros) a **Enable Banking** (PSD2 AIS, antes Tilisy). Verificar end-to-end en sandbox y dejar producción registrada para conectar bancos reales.

## Contexto previo

- `apps/isaak` ya tenía `/api/isaak/banking/saltedge/*` y `/api/isaak/banking/gcbd/*` operativos
- `SeConnection` modelaba conexiones bancarias con discriminador `provider` (`'saltedge' | 'gcbd'`)
- Cron `connector-health` re-probaba Holded y detectaba sync stale en Salt Edge
- Existían chat tools de banca (saldo, movimientos) sobre `SeAccount` / `SeTransaction`

## Trabajo realizado

### 1. Cliente Enable Banking (`packages/integrations/enable-banking.ts`)

Cliente completo de Enable Banking API v2 sin dependencias externas:

- **Auth JWT RS256** con `kid = application_id`, caché 1h, firmado con `crypto.createSign`
- Soporta `ENABLE_BANKING_PRIVATE_KEY` en formato base64 o PEM crudo
- **Flujo AIS**: `listAspsps(country)` → `startEbAuth(...)` (devuelve URL de redirección + `authorization_id`) → `createEbSession(code)` (devuelve `session_id` + cuentas)
- **Operaciones por cuenta**: `getEbAccountDetails`, `getEbAccountBalances`, `getEbAccountTransactions` (paginación), `getAllEbTransactions` (auto-paginación vía `continuation_key`)
- **Normalización**: `resolveEbBalance` (CLBD > ITAV > XPCD > primer balance), `normalizeEbTransaction` (usa `entry_reference` como ID estable, NO `transaction_id` que es scoped a la sesión)
- Clase `EbError` con `code` y `status`

### 2. Rutas API en Isaak

```
apps/isaak/app/api/isaak/banking/eb/aspsps/route.ts
apps/isaak/app/api/isaak/banking/eb/connect/route.ts
apps/isaak/app/api/isaak/banking/eb/callback/route.ts
apps/isaak/app/api/isaak/banking/eb/sync/route.ts
```

**Patrón CSRF state**: `state = randomUUID()` se guarda como `SeConnection` pendiente con `id = state`. En el callback se busca por ese ID, se canjea el `code` por una sesión, y en una transacción Prisma se crea la conexión real (`id = session_id`) + se elimina la pendiente.

### 3. Schema Prisma

- `SeConnection.expiresAt DateTime?` añadido (caducidad sesión PSD2)
- Comentario actualizado en `provider` para reflejar `'enablebanking'` como tercer valor válido
- Migración `packages/db/prisma/migrations/20260523110000_se_connection_expires_at/`

### 4. Cron `connector-health` extendido (PR #116)

`checkEnableBankingConnections()`:

- Detecta sesiones donde `expiresAt < now` → flip status a `'expired'` + email "Reconectar banco"
- Detecta sesiones que expiran en ≤7 días → email "Renovar conexión" con días restantes
- Deduplicación: 1 alerta por ventana de 7 días por conexión (vía `isaakAlert.type` + `tenantId`)

`checkSaltEdgeConnections()`:

- Filtrado a `provider != 'enablebanking'` (las EB tienen su propio ciclo de vida por expiración, no por staleness de sync)

Handler ejecuta los 3 checks en paralelo (`Promise.allSettled`) y devuelve `{ holded, saltEdge, enableBanking }`.

### 5. Sandbox: registro + verificación end-to-end

- App sandbox creada: `8dde10e3-f801-4f59-93f4-d41f6eac5604`
- Keypair RSA 4096 generado (válido hasta 2028)
- Variables Vercel: `ENABLE_BANKING_APP_ID` + `ENABLE_BANKING_PRIVATE_KEY` (base64)
- Ruta temporal `test-connect` creada con diagnóstico JSON paso a paso
- Test con BBVA sandbox (credenciales `user1`/`1234`/OTP `012345`) → connect_url generada, callback funcional
- Ruta `test-connect` eliminada en PR #116 tras verificación

### 6. Producción registrada

- App producción: `73fbe5d2-b322-4d71-ba5d-223be78df437` — **activa**
- Nuevo keypair RSA 4096 generado para producción (válido hasta mayo 2028)
- Variables Vercel actualizadas con credenciales de producción
- Redirect URLs registradas en EB: `isaak.app`, `isaak.verifactu.business`, `localhost:3000`

## Problemas resueltos durante la sesión

| Problema | Causa | Solución |
|---|---|---|
| `test-connect` devolvía 500 sin info | Sin try/catch | Añadido try/catch con `{ ok, connect_url, steps, error?, stack? }` |
| `"Redirect URI not allowed"` en EB | Producción usa `NEXT_PUBLIC_APP_URL = isaak.app` (no `isaak.verifactu.business`) | Usuario añadió `isaak.app/api/...callback` en panel EB |
| PR #113 `mergeable_state: "dirty"` | Divergencia con main | Merge de main → resolución conflicto en `apps/isaak/app/api/holded/chat/route.ts` (mantener línea banking) |
| `gh` CLI ausente en entorno remoto | Entorno Claude Code on the web | Uso de `curl` + PAT contra REST API GitHub para PR/merge directos |
| Stop hook se quejaba de commits unpushed | Tracking ref local stale tras push directo a main | `git branch --set-upstream-to` para reset |

## Pendientes inmediatos

1. **UI en `/banking`** — selector ASPSP + botón "Conectar banco" + banner "Renovar" cuando `expiresAt < 7d`
2. **Test end-to-end con banco real** — una vez UI lista, conectar BBVA/Santander/CaixaBank real
3. **Mergear PR #116** a main
4. **Verificar `prisma migrate deploy`** aplicó `expires_at` en producción

## Decisiones de arquitectura tomadas

- **EB > GCBD** como proveedor PSD2 principal (GCBD cerró nuevos registros)
- **Salt Edge se mantiene** como fallback (cuentas non-PSD2 / países sin EB)
- **JWT con crypto nativo** en vez de `jsonwebtoken` o `jose` (cero deps extra, suficiente para RS256)
- **`entry_reference` como ID estable** de transacción (NO `transaction_id`, que es session-scoped y rota entre sesiones)
- **CSRF state via UUID** almacenado como SeConnection pendiente (sin tabla extra de "pending states")
- **`expiresAt` por conexión**, no por cuenta (PSD2 autoriza sesión completa, no cuenta individual)
- **No webhooks** — EB no soporta push events para AIS; se sincroniza vía endpoint manual o cron
