# Holded MCP — Plan de backfill de usuarios Claude (F3.3)

**Fecha:** 2026-05-06
**Plan maestro:** `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md` · F3.3
**Estado:** Plan listo · ejecución programada tras estabilizar F3.1+F3.2 (~30 días)
**Owner:** Soporte verifactu.business

---

## 🎯 Objetivo

Promover los usuarios "fantasma" de Claude (los que se conectaron antes de F3 cuando el MCP solo guardaba `userId = sha256(apiKey)`) a usuarios reales con `User + Tenant + Membership + ExternalConnection` en la BD principal de Verifactu.

Sin esto, no podemos:

- Enviar emails de bienvenida / de seguridad / de revocación a la persona real.
- Mostrarlos en el admin panel.
- Hacer follow-up comercial / soporte.
- Cumplir lo que dice la DPA del conector ("registramos al usuario").

---

## 📊 Punto de partida

A partir de F3 (post-deploy), todo nuevo authorization code creado vía `apps/holded-mcp/src/oauth-routes.ts` POST `/oauth/authorize` recibe un `User.id` real desde el endpoint común F1 (`/api/integrations/holded/upsert-from-key`). El registro queda persistido en:

- BD principal: `User`, `Tenant`, `Membership`, `ExternalConnection (channelKey='claude')`.
- BD del MCP: `holded_mcp_oauth_access_tokens.user_id = <User.id>` (mismo valor que la BD principal).

**Tokens preexistentes** (anteriores a F3 deploy) están en `holded_mcp_oauth_access_tokens` con `user_id` = `sha256(holdedApiKey)` — un hash hex de 64 caracteres. Estos son los "fantasmas" que hay que migrar.

---

## 🔍 Fase 0 — Inventario (read-only)

### Query de inventario

```sql
-- Sobre la BD del MCP (DATABASE_URL del servicio holded-mcp)
SELECT
  user_id,
  COUNT(*) AS sessions,
  MIN(created_at) AS first_seen,
  MAX(last_used_at) AS last_used,
  COUNT(DISTINCT client_id) AS distinct_clients
FROM holded_mcp_oauth_access_tokens
WHERE revoked_at IS NULL
  AND length(user_id) = 64
  AND user_id ~ '^[a-f0-9]{64}$'  -- hash sha256 hex pattern
GROUP BY user_id
ORDER BY last_used DESC NULLS LAST;
```

Esto devuelve la lista de "ghost users" con su actividad. Cada `user_id` representa una API key de Holded distinta.

### Cruce con la BD principal

Por construcción, los ghost users **no existen** en `User` de la BD principal. Para confirmarlo:

```sql
-- Sobre la BD principal (apps/app DATABASE_URL)
SELECT id FROM users WHERE id = '<user_id_hash>'; -- esperado: 0 filas
```

### Métricas a capturar

- Número total de ghosts (= filas distintas).
- Distribución por `last_used`: ¿cuántos siguen activos? Filtra a últimos 30 días.
- Cuántos son `client_id = openai-chatgpt-*` vs `holded-mcp-<uuid>` (Claude Desktop) vs scripts custom.

**Salida esperada:** un CSV `ghosts_inventory_<date>.csv` con columnas
`user_id_hash, sessions, first_seen, last_used, distinct_clients` que se sube a `s3://verifactu-soporte/backfill/`.

---

## 📨 Fase 1 — Outreach a admins de Holded

> **Restricción legal:** no tenemos email del ghost user. Sí tenemos la `holdedApiKey` cifrada (`holded_api_key_enc`). Con ella podemos llamar a `/api/team/v1/employees` de Holded y obtener nombres + emails de los empleados de la cuenta. El owner (rol `admin` en Holded) es el destinatario válido.

### Script de outreach (planificado)

Ubicación sugerida: `scripts/holded-mcp-backfill/outreach.ts`

```ts
// Pseudocódigo
for (const ghost of ghostsCsv) {
  const apiKey = await decryptHoldedKeyFromMcpDb(ghost.user_id_hash);
  const employees = await holdedAdapter.listEmployees(apiKey);
  const adminCandidates = employees.filter((e) => e.role === 'admin' || e.role === 'owner');

  for (const admin of adminCandidates) {
    await sendBackfillClaimEmail({
      to: admin.email,
      ghostUserIdHash: ghost.user_id_hash,
      claimToken: await mintClaimToken(ghost.user_id_hash, admin.email),
      lastUsedAt: ghost.last_used,
    });
  }

  await markOutreachSent(ghost.user_id_hash);
}
```

### Plantilla del email de claim

**Asunto:** Activa tu perfil para el conector de Holded en Claude

**Cuerpo (resumen):**

> Hola, vimos que tu cuenta de Holded está conectada con Claude Desktop a través de nuestro conector. Para que podamos avisarte de eventos importantes (reconexiones, alertas de seguridad, revocaciones) y para cumplir el RGPD, necesitamos vincular esa conexión a tu email personal.
>
> Pulsa este botón y completarás la vinculación en 30 segundos:
>
> [✅ Activar mi perfil en Verifactu]
>
> Si no haces nada, el conector seguirá funcionando como hasta ahora — pero no podremos enviarte avisos por email ni atender tickets de soporte vinculados a tu cuenta.

El link apunta a `https://holded.verifactu.business/onboarding/holded-mcp-claim?token=<JWT>` (form descrito en Fase 2).

### Tokens de claim

`mintClaimToken` emite un JWT firmado con `OAUTH_JWT_SECRET` con payload:

```json
{
  "ghost_user_id_hash": "<64-hex>",
  "expected_admin_email": "admin@empresa.es",
  "iat": ...,
  "exp": <ahora + 14 días>
}
```

TTL: 14 días. Si el admin no responde, el ghost queda como tal (la decisión clave #2 del plan: "si los usuarios actuales no responden al email, mantenemos el fallback `userId = sha256(apiKey)` indefinidamente — accept this").

---

## 🧩 Fase 2 — Página de claim

Nueva página `apps/holded/app/onboarding/holded-mcp-claim/page.tsx`:

- Verifica el JWT de claim → muestra info: "Has venido desde el email enviado el {date}. Conexión activa desde {first_seen}".
- Form: email (prefilled del JWT con `expected_admin_email`), nombre completo, teléfono opcional, T&C.
- Submit → POST `apps/app/api/integrations/holded/upsert-from-key` con `channel='claude'` y `source='claude_backfill_claim'`. Le pasamos también el `holdedApiKey` (descifrado server-side a partir del `ghost_user_id_hash`).
- En éxito → ejecutar el "rebind script" (Fase 3) que actualiza `holded_mcp_oauth_access_tokens.user_id` del hash al `User.id` real.

### Endpoint server-side de soporte

`apps/holded/app/api/onboarding/holded-mcp-claim/route.ts` (nuevo):

1. Valida claim token.
2. Carga `holded_api_key_enc` desde el MCP DB usando `ghost_user_id_hash`.
3. Descifra y llama al endpoint común F1.
4. Si F1 devuelve `ok:true` → llama al endpoint nuevo `POST /api/admin/holded-mcp/rebind-user` (Fase 3) para mover los tokens.
5. Marca el outreach como completado (`outreach_completed_at`).
6. Redirige al dashboard.

---

## 🔄 Fase 3 — Rebind atómico de tokens MCP

Endpoint admin-only `apps/app/app/api/admin/holded-mcp/rebind-user/route.ts`:

```ts
// Pseudocódigo
POST /api/admin/holded-mcp/rebind-user
Body: { ghostUserIdHash: string; realUserId: string }

// Server-side, dentro de una transacción contra holded-mcp DB:
UPDATE holded_mcp_oauth_authorization_codes
   SET user_id = $realUserId
 WHERE user_id = $ghostUserIdHash;

UPDATE holded_mcp_oauth_access_tokens
   SET user_id = $realUserId
 WHERE user_id = $ghostUserIdHash;

UPDATE holded_mcp_oauth_refresh_tokens
   SET user_id = $realUserId
 WHERE user_id = $ghostUserIdHash;
```

Auth: bearer token compartido `BACKFILL_REBIND_SECRET` (env var, distinto de `OAUTH_JWT_SECRET`).

Trazabilidad: cada rebind se loguea en `audit_log` con `action='holded_mcp_rebind_user'`.

---

## 🛡️ Compatibilidad dual (30 días)

Durante la ventana de 30 días post-deploy:

- `createAuthorizationCode` y `createTokenPair` ya soportan ambos formatos (`User.id` real o sha256 hash) — implementado en F3.2.
- `verifyAccessToken` no necesita cambios: lee `user_id` de la BD del MCP tal cual.
- El MCP tools layer (todo `apps/holded-mcp/src/tools/`) NO depende de que `user_id` sea de un formato u otro — solo lo usa para auditoría.

Riesgo: si el rebind falla a mitad, los tokens quedan inconsistentes. Mitigación: la transacción del Fase 3 cubre todas las tablas atómicamente.

---

## 📅 Cronograma sugerido

| Día  | Acción                                                                   | Owner         |
| ---- | ------------------------------------------------------------------------ | ------------- |
| D+0  | Deploy F3.1 + F3.2 a producción                                          | Eng           |
| D+7  | Ejecutar Fase 0 (inventario)                                             | Soporte + Eng |
| D+10 | Implementar Fases 1-3 (script, página, endpoint)                         | Eng           |
| D+14 | Lanzar piloto a 5 ghosts seleccionados                                   | Soporte       |
| D+21 | Si piloto OK → enviar a 100 ghosts                                       | Soporte       |
| D+30 | Outreach masivo + cerrar reportería                                      | Soporte       |
| D+60 | Cierre formal del backfill — ghosts no respondidos quedan en sha256 mode | Eng           |

---

## ⚠️ Riesgos identificados

1. **Holded rate limit:** llamar a `/api/team/v1/employees` para cada ghost puede chocar con rate limit. Mitigación: paralelismo limitado (max 5 conc) + retry con backoff.

2. **Email deliverability:** los emails de claim son potencialmente "transaccionales no esperados". Mitigación: enviar desde dominio dedicado `claims@verifactu.business`, SPF/DKIM bien configurados, asunto sin spam triggers.

3. **Spoofing:** un atacante podría intentar reclamar la conexión de otro. Mitigación: el JWT de claim incluye `expected_admin_email` y la página de claim valida que el email del form sea el mismo (no editable libre).

4. **Privacy / RGPD:** estamos usando una API key (que es un dato del cliente Holded) para extraer otro dato (email del admin). Eso ya está cubierto por la DPA del conector (cláusula "información mínima necesaria para mantenerte informado de eventos del conector"). Mantener evidencia.

5. **Ghosts cuya API key revocaron en Holded:** la llamada `listEmployees` fallará con 401. Mitigación: marcar como "unreachable", no enviar email, y al primer intento de uso del token devolverá 401 que ya gestiona el MCP normalmente.

---

## ✅ Definición de "hecho" para F3.3

- [ ] Inventario CSV publicado.
- [ ] Script `outreach.ts` y endpoint de claim desplegados.
- [ ] Página de claim accesible en producción con QA mobile + desktop.
- [ ] Endpoint de rebind con auditoría wired.
- [ ] Email de claim aprobado por legal y soporte.
- [ ] Métrica `holded_mcp_ghosts_remaining` instrumentada en el dashboard de admin.
- [ ] Runbook oficial publicado en `docs/ops/runbooks/`.

---

## 📚 Referencias

- `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md` (plan maestro)
- `apps/holded-mcp/src/oauth-routes.ts` (consent screen post-F3)
- `apps/holded-mcp/src/auth.ts` (createAuthorizationCode, createTokenPair)
- `apps/app/lib/integrations/holdedConnectionUpsert.ts` (helper F1.2)
- `apps/app/app/api/integrations/holded/upsert-from-key/route.ts` (endpoint F1.1)
