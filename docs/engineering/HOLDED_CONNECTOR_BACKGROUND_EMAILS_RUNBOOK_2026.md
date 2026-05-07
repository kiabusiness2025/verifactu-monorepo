# Holded Connector — Runbook de emails con triggers de background (F5.4)

**Fecha:** 2026-05-06
**Plan maestro:** `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md` · F5
**Estado:** Plan de ejecución listo · ejecución pendiente (Sesión 6 o posterior)
**Owner:** Eng + Soporte

---

## 🎯 Objetivo

Completar la matriz F5 de emails operativos con los 3 eventos cuyos triggers
viven en flujos de background (no podemos disparar inline desde el MCP cuando
ocurre una request HTTP):

1. `auth_failures_burst` — el usuario tiene una sesión MCP válida pero la API
   key de Holded ha sido revocada en Holded, así que cada llamada al backend
   de Holded devuelve 401.
2. `holded_key_revoked` — caso particular del anterior cuando confirmamos que
   la key ya no existe en Holded (no es solo rate-limit ni 5xx transitorio).
3. `dormant_30_days` — la conexión está activa pero no se ha usado en 30+
   días. Recordatorio amable al usuario.

Los eventos `first_activity` e `invoice_draft_created` ya tienen wiring síncrono
implementado en F5.3 y no entran en este runbook.

---

## 📐 Mecánica común para `auth_failures_burst` y `holded_key_revoked`

Ambos se detectan en el mismo punto: la **capa `HoldedClient`** del MCP, donde
cada request HTTP a `api.holded.com` devuelve un status. Cuando vemos 401
repetido para la misma `holdedApiKey`, sabemos que la key está revocada o el
plan de Holded ha cambiado.

### Pasos de implementación (Sesión 6)

1. **Tabla de seguimiento.** Añadir tabla `holded_mcp_auth_failures`:

   ```sql
   CREATE TABLE holded_mcp_auth_failures (
     api_key_hash text NOT NULL,
     user_id text NOT NULL,
     occurred_at timestamptz NOT NULL DEFAULT now(),
     status_code int NOT NULL,
     endpoint text,
     PRIMARY KEY (api_key_hash, occurred_at)
   );
   CREATE INDEX holded_mcp_auth_failures_user_idx
     ON holded_mcp_auth_failures (user_id, occurred_at DESC);
   ```

2. **Hook en `HoldedClient.request`.** Cuando la respuesta sea 401, insertar
   una fila. Antes de insertar, contar fallos del último `WINDOW_MIN` (60 min
   por defecto) para esa `api_key_hash`. Si el contador post-insert llega o
   supera `THRESHOLD` (3 por defecto), disparar:
   - Una sola vez por ventana: usar lock optimista vía `INSERT ... ON CONFLICT
DO NOTHING` en una tabla `holded_mcp_auth_failures_dispatched` con TTL,
     o un campo `dispatched_at` en la tabla principal con un check de "no se
     ha disparado en los últimos `WINDOW_MIN`".

3. **Distinción entre `auth_failures_burst` y `holded_key_revoked`.** Después
   de detectar el burst, hacer un sondeo final: una llamada de validación
   ligera (`/api/team/v1/employees?limit=1`) usando la misma key. Si vuelve a
   dar 401 → es `holded_key_revoked` (key murió). Si funciona → era un fallo
   transitorio (no enviamos email).

4. **Dispatch al endpoint receptor.** Reusar `dispatchConnectorEventBackground`
   (F5.3) con el evento apropiado:
   - `auth_failures_burst` para 3+ fallos sin confirmación de revocación.
   - `holded_key_revoked` para fallos confirmados (probe-back).

### Templates necesarios

Ya existen `buildHoldedAuthFailuresUserEmail` y `buildHoldedAuthFailuresAdminEmail`
(F5.2). Faltan crear:

- `buildHoldedKeyRevokedUserEmail` — explicar al usuario que la key se revocó
  en Holded y mostrar CTA "Reconectar".
- `buildHoldedKeyRevokedAdminEmail` — avisar al admin de la empresa para que
  contacte con quien gestione las API keys.

Ubicación: `apps/holded/app/lib/communications/holded-email-templates.ts`,
con la misma estética que los demás emails admin (badge `Holded Admin`,
tabla con detalles, CTA al panel).

---

## 📐 Mecánica para `dormant_30_days`

### Pasos de implementación

1. **Cron job o scheduled task.** Opciones:
   - **Vercel Cron** sobre `apps/app/app/api/cron/holded-dormant-check`.
   - **Render Cron Jobs** sobre `apps/holded-mcp` (más cerca de los datos del
     MCP).
   - **Postgres pg_cron** ejecutando una función SQL que llame al endpoint
     receptor.

   Recomendación: **Vercel Cron** por simplicidad operativa y porque vivirá
   en la app principal (`apps/app`).

2. **Query.** Una vez al día, ejecutar:

   ```sql
   SELECT
     ec.id AS connection_id,
     ec.tenant_id,
     ec.connected_by_user_id,
     ec.channel_key,
     ec.last_validated_at,
     ec.last_sync_at,
     u.email AS user_email,
     u.name AS user_name
   FROM external_connections ec
   LEFT JOIN users u ON u.id = ec.connected_by_user_id
   WHERE ec.provider = 'holded'
     AND ec.connection_status = 'connected'
     AND COALESCE(ec.last_validated_at, ec.last_sync_at, ec.connected_at)
         < (now() - interval '30 days')
     AND (ec.dormant_email_sent_at IS NULL
          OR ec.dormant_email_sent_at < (now() - interval '90 days'));
   ```

   La columna `dormant_email_sent_at` se añade en una migración previa para
   evitar enviar el email más de una vez cada 90 días.

3. **Iterar y disparar.** Por cada fila, llamar al endpoint receptor con
   evento `dormant_user` y marcar la columna como enviada. El template
   `buildHoldedDormantUserEmail` (a crear) muestra mensaje amable + CTA al
   dashboard.

4. **Volumen esperado.** Con base instalada de 100-1000 usuarios, esperar 5-50
   emails diarios. Sin riesgo de spam si el cooldown de 90 días se respeta.

### Template necesario

- `buildHoldedDormantUserEmail`. Formato más cálido que los admin (es para
  el usuario final, no soporte). CTA "Vuelve al dashboard" en color del
  conector.

### Migración

```sql
ALTER TABLE external_connections
  ADD COLUMN dormant_email_sent_at timestamptz;
CREATE INDEX external_connections_dormant_idx
  ON external_connections (provider, connection_status, last_sync_at, dormant_email_sent_at)
  WHERE provider = 'holded';
```

---

## 🚦 Ventana de implementación

| Evento                | Sesión sugerida | Bloquea               | Bloqueado por           |
| --------------------- | --------------- | --------------------- | ----------------------- |
| `auth_failures_burst` | Sesión 6        | F8 resubmit OpenAI no | F5.3 ✅                 |
| `holded_key_revoked`  | Sesión 6        | F8 resubmit OpenAI no | F5.3 ✅ + auth_failures |
| `dormant_30_days`     | Sesión 7        | Nada                  | F1 ✅                   |

Los 3 son "nice to have" para la submission OpenAI (no bloquean) pero **sí
son necesarios para que la DPA del conector se cumpla en su totalidad** (la
DPA promete avisar al usuario de eventos relevantes de seguridad).

---

## ⚠️ Riesgos a tener en cuenta

1. **Falsos positivos por rate-limit.** Holded puede devolver 401 de forma
   transitoria. El probe-back en el paso 3 reduce el riesgo, pero hay que
   monitorizar la tasa de envíos durante las primeras 2 semanas y subir el
   threshold si hay ruido.

2. **Spam loop.** Si el usuario reconecta y la key sigue inválida (porque
   nos dio una key igual de revocada), podemos entrar en bucle de envíos.
   Mitigación: cooldown de 7 días por usuario para `holded_key_revoked`.

3. **Coste de los probe-backs.** Cada burst confirma con una llamada extra
   a Holded. Con 1000 usuarios activos y 1% con problemas/día = 10
   probe-backs/día — irrelevante.

4. **Privacidad.** El payload del evento incluye `userEmail` y `tenantId`. El
   endpoint receptor está protegido por shared secret (`VERIFACTU_APP_SHARED_SECRET`)
   pero conviene rotarlo cada 90 días.

5. **Backfill emails residuales.** Si hay usuarios "ghost" del periodo
   pre-F3 (sha256 hash en `user_id`), el resolveIdentity del receptor no
   podrá encontrar su email. Esos usuarios quedan fuera del flujo hasta
   que se ejecute el backfill F3.3.

---

## 📚 Referencias

- F5.3 wiring síncrono: `apps/holded-mcp/src/connector-events.ts`,
  `apps/holded/app/api/integrations/holded/connector-event/route.ts`.
- Templates F5.2: `apps/holded/app/lib/communications/holded-email-templates.ts`
  (build\* functions añadidas en F5.2).
- Backfill ghost users: `docs/engineering/HOLDED_MCP_USERS_BACKFILL_RUNBOOK_2026.md`
  (F3.3).
- Plan maestro: `docs/product/HOLDED_CONNECTORS_UNIFIED_ARCHITECTURE_2026.md`.
