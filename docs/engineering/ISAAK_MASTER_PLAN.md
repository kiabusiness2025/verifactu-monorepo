# Isaak — Plan Maestro de Evolución (Ingeniería)

**Última actualización**: 2026-05-24 (sesión 4 — Sidebar + Integraciones UX)
**Visión**: Isaak como agente fiscal y contable autónomo que conecta con datos reales del ERP, ejecuta acciones con confirmación, aprende de cada empresa y asesora en lenguaje llano.

> Para contexto de producto, pricing y estrategia de captación ver `docs/product/ISAAK_MASTER_PLAN.md`.

---

## Estado de implementación — apps/isaak (completo a 2026-05-19)

### Base S1–S10 ✅

| Componente                                   | Estado | Notas                                                              |
| -------------------------------------------- | ------ | ------------------------------------------------------------------ |
| Auth + workspace layout                      | ✅     | Sesión, onboarding, sidebar rediseñado por categorías (2026-05-24) |
| `/api/holded/chat` (chat con ERP)            | ✅     | Holded context, historial, memoria, herramientas, model-per-plan   |
| `/api/chat` (chat libre/público)             | ✅     | Auth opcional, fallback rules, rate-limit IP                       |
| `/resumen` dashboard KPIs                    | ✅     | Ventas, gastos, cobros, IVA, gráfico 6m                            |
| Verifactu — create + PDF + QR                | ✅     | S4 completo                                                        |
| Stripe billing (checkout/portal/cancel/cron) | ✅     | S5 completo                                                        |
| OCR + upload gastos                          | ✅     | S6: `upload-expense`, Claude Vision, confirmación                  |
| Voz STT + TTS                                | ✅     | S7: Web Speech API                                                 |
| Google Calendar + Gmail + Drive              | ✅     | S8-A/B/C/D + G-2 LLM tools (2026-05-21)                            |
| Alertas fiscales cron                        | ✅     | S8-B: D-15/7/3/1, hub `/fiscal`, panel acceso AEAT                 |
| Push notifications                           | ✅     | S10-B: VAPID, Service Worker                                       |
| PWA                                          | ✅     | S10-A: manifest, 8 iconos                                          |

### P0 / P1 / P2 ✅ (completado 2026-05-18)

| Fase | Componentes                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------- |
| P0   | Pricing 4 planes + "IA incluida" + FAQ · Free tier 10 msg/día (`isaak-quota.ts`) · docs sync          |
| P1   | Markdown (react-markdown+remark-gfm) · Feedback thumbs · K2-K5 admin copilot · loop conversión widget |
| P2   | Hub `/fiscal` · Isaak Público `/p/[slug]` · Open Banking `/banking` · Conciliación bancaria           |

### Admin copilot (Fases G, H, K) ✅

| ID  | Tarea                                                   | Estado |
| --- | ------------------------------------------------------- | ------ |
| G1  | Feedback thumbs up/down en IsaakDock → `isaak_feedback` | ✅     |
| G3  | Markdown rendering (react-markdown + remark-gfm)        | ✅     |
| H3  | Charts recharts en IsaakDock                            | ✅     |
| H4  | Export Excel SheetJS                                    | ✅     |
| K1  | `get_tenant_holded_data` (usa `external_connections`)   | ✅     |
| K2  | Análisis fiscal por tenant: IVA, retenciones            | ✅     |
| K3  | Alertas proactivas admin                                | ✅     |
| K4  | Comparativa mensual/anual tenant                        | ✅     |
| K5  | Resumen modelo 303 estimado                             | ✅     |

### Fase W — WhatsApp ✅ (WA-I a WA-VI)

| ID        | Tarea                                                       | Estado |
| --------- | ----------------------------------------------------------- | ------ |
| WA-I      | Templates HSM fiscales + W6 admin activity                  | ✅     |
| WA-II/III | Templates HSM avanzados                                     | ✅     |
| WA-IV     | WhatsApp Flows con formulario guiado                        | ✅     |
| WA-V      | Historial conversacional — contexto del hilo WA             | ✅     |
| WA-VI     | Clarificación inteligente con botones cuando hay ambigüedad | ✅     |
| WA-∗      | Asesor fiscal con fuentes oficiales y quick replies         | ✅     |

**Credenciales WhatsApp** (env vars en Vercel proyecto `isaak`):

- `WHATSAPP_ACCESS_TOKEN` · `WHATSAPP_PHONE_NUMBER_ID=1068988046305906`
- `WHATSAPP_BUSINESS_ACCOUNT_ID=61589736486918` · `WHATSAPP_APP_ID=1487740656465960`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN=isaak-wa-hook-2026-vb` · `WHATSAPP_APP_SECRET`

### Fase L — Isaak Público ✅

| ID  | Tarea                                          | Estado |
| --- | ---------------------------------------------- | ------ |
| L1  | Feature flag `isaak_public_enabled` por tenant | ✅     |
| L2  | Consentimiento explícito en onboarding público | ✅     |
| L3  | Contexto `IsaakConversation` del tenant        | ✅     |
| L4  | SYSTEM_PROMPT personalizado: empresa, sector   | ✅     |

API: `POST /api/chat/public` — rate limit 15/h por IP, slug lookup.
Página: `apps/isaak/app/p/[slug]/page.tsx` — sin auth, 404 si inactivo.

### Sprint VF — VeriFactu + Certs + Plantillas ✅ (PRs #91 + #92)

| ID   | Tarea                                                                  | Archivos clave                                                                            |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| VF-0 | Fix `verifactu_status`: parseo real SOAP AEAT                          | `apps/api/app/api/verifactu/register/route.ts`                                            |
| VF-T | Sistema de plantillas: 5 predefinidas + custom + extracción IA colores | `app/lib/invoice-templates.ts` · `app/(workspace)/settings/` · `app/api/isaak/templates/` |
| VF-2 | Certificados digitales: P12 → PEM-JSON AES-256-GCM                     | `app/lib/p12-reader.ts` · `app/lib/certificate-crypto.ts` · `app/api/isaak/certificates/` |
| VF-1 | Landing + pricing VeriFactu en Free                                    | `app/pricing/page.tsx`                                                                    |
| VF-3 | Proxy SOAP mTLS AEAT: BuzElecWS + ConsultaInformacion                  | `app/lib/aeat-sede.ts` · `app/api/isaak/sede/` · `app/(workspace)/sede/`                  |
| VF-4 | `isAeatQuery()` + `aeatBlock` en system prompt de `/api/holded/chat`   | `app/api/holded/chat/route.ts`                                                            |
| Tmpl | PDF route: carga `InvoiceTemplate.isDefault` y merge branding          | `app/api/ventas/invoices/[id]/pdf/route.ts`                                               |

**Modelos Prisma añadidos:** `InvoiceTemplate` · `TenantCertificate`
**Migración:** `packages/db/prisma/migrations/20260519120000_invoice_templates_and_tenant_certificates/`
⚠️ **`prisma migrate deploy` pendiente en producción** — sin esto VF-T/VF-2 no funcionan.

---

## ⚠️ Pendientes de infraestructura

| Tarea                                 | Prioridad    | Detalle                                                                                                                              |
| ------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `prisma migrate deploy` en producción | 🟡 Verificar | Tablas `invoice_templates` + `tenant_certificates` + `advisor_clients`. Se aplica automáticamente en Vercel build desde commit #97   |
| VAPID push notifications              | ✅ OK        | Verificado 2026-05-19: las 4 vars VAPID están en Vercel production desde hace 14 días                                                |
| GPT-4o fallback                       | ✅ OK        | Automático en `packages/utils/ai/config.ts` (defaultFallback anthropic→openai). `ISAAK_NEW_OPENAI_API_KEY` ya en Vercel              |
| Validar WSDLs AEAT                    | 🟡 Post-cert | Probar `BuzElecWS` + `ConsultaInformacion` con cert real. Actualizar `AEAT_NOTIF_WS_URL` / `AEAT_CENSUS_WS_URL` si paths incorrectos |
| OpenAI Manual QA                      | 🟡 QA manual | 16 tests × 2 plataformas. Ver `docs/openai-submission/WEB_MOBILE_REVIEW_CHECKLIST.md`                                                |

---

## ✅ P3-1: Modo Asesoría — completado 2026-05-19 (commit 00d65830)

**Implementación real (difiere del plan original):**

- `AdvisorClient` Prisma model: `id, advisorTenantId, alias, companyName, nif, holdedApiKeyEnc, holdedKeyMasked, notes, isActive`
- API key del cliente cifrada con `encryptHoldedSecret()` (AES-256-GCM, misma clave que Holded connections)
- Sesión activa via cookie httpOnly `isaak_advisor_client` (7 días) — no requiere campo en la cuenta del asesor
- Switch endpoint: `POST /api/isaak/advisor/clients/[id]/switch` + `POST .../clear/switch`
- Chat route: detecta cookie → carga `AdvisorClient` → inyecta key del cliente en `context.holded.connection` (shim si el asesor no tiene conexión propia) → carga snapshot con key del cliente → prepend `advisorBanner` al system prompt
- UI: `AdvisorDashboardClient.tsx` con CRUD inline + `AdvisorModeBanner.tsx` en chat (banner ámbar, botón Salir)
- Migración `20260519200000_advisor_clients` — se aplica automáticamente en deploy

---

## ~~P3-1~~ / ~~P3-3~~ / P3-4-A — Completados 2026-05-19/21

| Sprint            | Descripción                                                     | Commit     | Estado |
| ----------------- | --------------------------------------------------------------- | ---------- | ------ |
| P3-1              | Modo Asesoría — multi-cliente para asesores                     | `00d65830` | ✅     |
| P3-3              | Modelos AEAT 303/130/390 — borradores con datos Holded          | `b0d3e5ad` | ✅     |
| P3-4-A foundation | ErpClient interface, HoldedErpClient, factory, erp-oauth-tokens | `f7d22b7f` | ✅     |
| P3-4-A Hotelgest  | Stub pendiente docs API del cliente                             | —          | ⏳     |
| P3-4-A Sage 200c  | Stub — requiere credenciales `developer.sage.com`               | —          | ⏳     |
| P3-4-B a3innuva   | Stub — requiere credenciales `a3developers.wolterskluwer.es`    | —          | ⏳     |
| G-2               | Google LLM tools (8 tools) + Microsoft Graph (9 tools)          | `session2` | ✅     |
| Fase M            | Microsoft 365 — Outlook, Calendar, OneDrive, chat tools         | `session2` | ✅     |
| P3-4-C Chift      | ChiftErpClient + 4 rutas API + workspace page + landing         | `session2` | 🔄     |
| Admin D4          | MarketingCampaign model + historial campañas en admin           | `session2` | ✅     |
| Cron 405 fix      | Connector-health cron respondía 405 → añadido GET handler       | `session2` | ✅     |

---

## ✅ Completado en sesión 2 (2026-05-21)

### G-2: Google LLM Tools ✅

8 herramientas LLM para Google: `google_check_connection`, `google_calendar_list_events`, `google_calendar_create_event`, `google_calendar_update_event`, `google_calendar_delete_event`, `google_gmail_scan_invoices`, `google_gmail_archive`, `google_drive_list_files`.  
Scope Gmail actualizado a `gmail.modify`. Wiring en `/api/holded/chat/route.ts`.

---

### M: Microsoft Graph ✅

9 herramientas LLM para Microsoft 365 + OAuth completo + workspace page.

**Implementado:**

- `packages/db/prisma/schema.prisma` → `IsaakMicrosoftToken` + migración `20260521200000`
- `microsoft-oauth.ts` / `microsoft-calendar.ts` / `microsoft-drive.ts` / `microsoft-mail.ts` / `microsoft-tools.ts`
- API routes: `/api/isaak/microsoft/{auth,callback,status,disconnect,sync}`
- `(workspace)/microsoft/page.tsx`
- Variables en Vercel: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID=common`, `MICROSOFT_REDIRECT_URI`
- ⚠️ Pendiente: registrar Redirect URI en portal Azure AD → `https://isaak.verifactu.business/api/isaak/microsoft/callback`

---

### P3-4-C: Chift ERP Aggregator 🔄 (implementación completa — activación pendiente)

**ERPs viables para España via Chift** (investigación 2026-05-21):

| ERP                        | Dominio        | Relevancia España                            | Categoría          |
| -------------------------- | -------------- | -------------------------------------------- | ------------------ |
| **Sage 200 ES**            | sage.com       | ⭐⭐⭐ — el más usado en PYME española       | Contabilidad       |
| **A3ERP** (Wolters Kluwer) | a3software.com | ⭐⭐⭐ — #1 en gestorías y asesorías         | Contabilidad       |
| **Odoo**                   | odoo.com       | ⭐⭐⭐ — ERP open source, crecimiento rápido | Contabilidad + ERP |
| **Xero**                   | xero.com       | ⭐⭐ — empresas internacionales en España    | Contabilidad       |
| **Cegid**                  | cegid.com      | ⭐⭐ — mid-market retail y servicios         | Contabilidad       |
| **QuickBooks**             | intuit.com     | ⭐⭐ — algunas PYMEs y freelancers           | Facturación        |
| **Pennylane**              | pennylane.com  | ⭐ — despachos contables                     | Contabilidad       |
| **Holded**                 | holded.com     | ✅ Ya integrado directamente                 | Contabilidad + ERP |

> Chift también soporta: Exact, DATEV, Tripletex, MyUnisoft, Axonaut, Sellsy, Horus — menos relevantes para España.

**Implementación completada (2026-05-21):**

```
apps/isaak/app/lib/chift-client.ts          — Token cache, chiftGet/Post/Delete
apps/isaak/app/lib/chift-erp-client.ts      — ChiftErpClient implements ErpClient
apps/isaak/app/lib/erp-client.ts            — ErpProvider += 'chift'
apps/isaak/app/lib/erp-client-factory.ts    — case 'chift' en factory
apps/isaak/app/api/isaak/chift/connect/     — POST: crea consumer + URL conexión
apps/isaak/app/api/isaak/chift/callback/    — GET: Chift redirect handler
apps/isaak/app/api/isaak/chift/status/      — GET: estado conexión
apps/isaak/app/api/isaak/chift/disconnect/  — DELETE: desconectar
apps/isaak/app/(workspace)/chift/page.tsx   — Workspace page
apps/isaak/app/components/IsaakHomeLanding.tsx — Sección logos ERPs
```

**Variables de entorno pendientes** (añadir en Vercel proyecto `isaak` cuando lleguen):

```
CHIFT_CLIENT_ID
CHIFT_CLIENT_SECRET
CHIFT_ACCOUNT_ID
```

**Bloqueador:** Error de claim validator en portal Chift (st-perm, `actualValue: []`). Email enviado a support@chift.eu. Cuenta requiere activación manual por Chift.

---

### Admin D4: MarketingCampaign ✅ (2026-05-21)

- Modelo Prisma `MarketingCampaign` + migración `20260521210000`
- Send route persiste cada campaña tras envío (segment, subject, sentBy, counts)
- Historial de últimas 20 campañas en tabla en `/admin-marketing`

---

## ✅ Completado en sesión 4 (2026-05-24) — Sidebar + Integraciones UX

### Sidebar reorganizado ✅

- `NAV_GROUPS`: categorías "Contabilidad" + "Empresa" + ítems raíz Chat/Resumen
- Popover perfil (esquina inf. derecha) con 2 secciones: Configuración + Integraciones y herramientas
- Holded movido a /integrations (no como entrada independiente en sidebar)
- CSS variable `--brand-color` en `<aside>` para tenant theming sin warnings IDE
- Sidebar `w-56`, historial hasta 30 conversaciones

### Página `/integrations` rediseñada ✅

- 2 tabs: Conectores + API & MCP
- Catálogo `INTEGRATIONS: IntegrationMeta[]` con 10 integraciones categorizadas
- Filtros por categoría (ERP / Google / Microsoft / Banca / Comunicación / Pagos)
- Buscador por nombre y descripción
- `SoonCard` para Factusol y Stripe (`available: false`)

---

## ✅ Completado en sesión 3 (2026-05-23) — Open Banking via Enable Banking

**Contexto**: GoCardless Bank Account Data cerró nuevos registros → migración a **Enable Banking** (PSD2 AIS) como proveedor open banking principal. Mantiene Salt Edge como alternativa.

### EB-1: Cliente Enable Banking ✅

`packages/integrations/enable-banking.ts` — cliente completo con Node.js `crypto` nativo (sin librerías externas):

- JWT RS256 con `kid = application_id`, caché 1h
- Soporta clave privada PEM base64 o raw vía `ENABLE_BANKING_PRIVATE_KEY`
- Funciones: `listAspsps`, `startEbAuth`, `createEbSession`, `getEbSession`, `deleteEbSession`, `getEbAccountDetails`, `getEbAccountBalances`, `getEbAccountTransactions`, `getAllEbTransactions` (auto-paginación vía `continuation_key`)
- Helpers: `resolveEbBalance` (CLBD > ITAV > XPCD), `normalizeEbTransaction` (usa `entry_reference` como ID estable para deduplicación)
- Exporta `EbError` con `code` y `status`

### EB-2: Rutas API en Isaak ✅

```
apps/isaak/app/api/isaak/banking/eb/aspsps/route.ts    — GET lista bancos por país
apps/isaak/app/api/isaak/banking/eb/connect/route.ts   — POST crea state (UUID) + connect_url
apps/isaak/app/api/isaak/banking/eb/callback/route.ts  — GET intercambia code → session, upsert cuentas + 90d txs
apps/isaak/app/api/isaak/banking/eb/sync/route.ts      — POST sync incremental manual
```

**Patrón CSRF state**: `state = randomUUID()` se guarda como SeConnection pendiente; al callback, transacción Prisma reemplaza ID pendiente por `session_id` real.

### EB-3: Schema Prisma ✅

- `SeConnection.expiresAt DateTime?` añadido (fecha caducidad sesión PSD2)
- `SeConnection.provider` ahora discrimina entre `'saltedge' | 'gcbd' | 'enablebanking'`
- Migración `20260523110000_se_connection_expires_at`

### EB-4: Monitorización en cron `connector-health` ✅ (PR #116)

- `checkEnableBankingConnections()`: marca como `'expired'` las sesiones con `expiresAt < now` + email "Reconectar banco"; aviso 7 días antes con email "Renovar conexión"
- Ambas alertas deduplicadas (1 por ventana de 7 días por conexión)
- `checkSaltEdgeConnections()` filtrado a `provider != 'enablebanking'` (EB tiene ciclo de vida por expiración, no por staleness)
- Handler ejecuta los 3 checks en paralelo, devuelve `{ holded, saltEdge, enableBanking }`

### EB-5: Sandbox verificado end-to-end ✅

- App sandbox: `8dde10e3-f801-4f59-93f4-d41f6eac5604` (vars en Vercel)
- Test confirmado con BBVA sandbox (user1/1234/OTP:012345) → connect_url → callback → SeConnection creada
- Route temporal `test-connect` eliminada tras verificación

### EB-6: App de producción registrada ✅ (2026-05-23)

- App producción: `73fbe5d2-b322-4d71-ba5d-223be78df437` — estado **activa**
- Keypair RSA 4096 generado (`/tmp/eb-prod-keys/`), certificado válido hasta mayo 2028
- Redirect URLs registradas: `isaak.app`, `isaak.verifactu.business`, `localhost:3000`
- Variables Vercel actualizadas con credenciales de producción

**Variables de entorno (Vercel proyecto `isaak`):**

```
ENABLE_BANKING_APP_ID           — UUID de la app (sandbox o prod)
ENABLE_BANKING_PRIVATE_KEY      — clave RSA 4096 PKCS8 PEM, base64-encoded
```

### Estado EB — 2026-05-24

| Tarea                                              | Estado | Detalle                                                                                   |
| -------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| UI en `/banking` para conectar banco               | ✅     | Picker ASPSP + botón Conectar + banners expiración ≤7d — ya implementado                  |
| Feedback post-OAuth (`?eb_callback` / `?eb_error`) | ✅     | Banner verde/rojo + limpieza de URL. 2026-05-24                                           |
| Redirect callback seguro                           | ✅     | Deriva origin de `request.url`, no de `NEXT_PUBLIC_APP_URL`. 2026-05-24                   |
| Cron de sincronización periódica                   | ✅     | `/api/cron/eb-sync` · `0 */6 * * *` · multi-tenant + reconcile. Registrado en vercel.json |
| Test end-to-end con banco real                     | 🟡     | Pendiente conectar un banco real en producción para validar flujo completo                |

---

## Stack técnico — librerías por fase

| Fase/Sprint | Librerías añadidas                                   | Estado                        |
| ----------- | ---------------------------------------------------- | ----------------------------- |
| G           | `react-markdown`, `remark-gfm`                       | ✅                            |
| H           | `recharts`, `xlsx` (SheetJS)                         | ✅                            |
| VF-2        | `node-forge`, `@types/node-forge`                    | ✅                            |
| OG images   | `next/og` (built-in Next.js 15)                      | ✅                            |
| G-2         | Sin librerías nuevas (Google APIs via fetch nativo)  | ✅                            |
| M           | Sin librerías nuevas (Microsoft Graph via fetch)     | ✅                            |
| P3-4-A/B    | Sin librerías nuevas (fetch nativo + OData params)   | ⏳                            |
| P3-4-C      | Sin librerías nuevas (fetch nativo según Chift docs) | 🔄 Bloqueado activación Chift |

---

## Decisiones de arquitectura vigentes

| Decisión                      | Detalle                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor IA por plan             | Free/Starter → `claude-haiku-4-5`. Pro → `claude-sonnet-4-6`. Business → Sonnet + GPT-4o opcional. Abstracción en `callLLM` de `@verifactu/utils`                                                             |
| Rate limit free               | `TenantSubscription.dailyQueryLimit/queriesUsedToday/lastQueryResetAt` — reset diario, check en `isaak-quota.ts`. Por `tenantId` si auth, por IP si público                                                   |
| Acciones con escritura        | Confirmación obligatoria. El assistant propone, el usuario confirma. Sin excepciones                                                                                                                          |
| Certificados digitales        | P12 upload → PEM-JSON (node-forge) → AES-256-GCM con `CERT_MASTER_KEY`. Campo `encryptedP12` almacena PEM-JSON cifrado, nunca raw P12                                                                         |
| mTLS AEAT                     | `https.Agent` con `{cert, key}` PEM del tenant. URLs configurables via `AEAT_NOTIF_WS_URL` / `AEAT_CENSUS_WS_URL`                                                                                             |
| AEAT chat context             | `isAeatQuery(message)` → carga cert + notificaciones → `aeatBlock` en system prompt                                                                                                                           |
| Branding facturas PDF         | `InvoiceTemplate.isDefault` del tenant → merge sobre `adminEditHistory.branding` → fallback colores Verifactu                                                                                                 |
| Isaak Público                 | Rate limit 15/h por IP vía `checkPublicChatQuota`. Auto-slug desde nombre empresa. Claude Haiku                                                                                                               |
| `INTERNAL_API_SECRET`         | Bypass auth cookie para llamadas server-to-server entre `apps/isaak` y `apps/api`                                                                                                                             |
| Google LLM tools (G-2)        | 8 tools en chat route: calendar CRUD, gmail scan+archive, drive list. Scope gmail.modify. ✅ 2026-05-21                                                                                                       |
| Microsoft Graph (M)           | Multi-tenant Azure AD. `IsaakMicrosoftToken` per `(tenantId, userId)`. 9 tools: Outlook Calendar+Mail+OneDrive. ✅ 2026-05-21                                                                                 |
| ERP aggregator (P3-4-C)       | ⚠️ **Suspendido** — Chift bloqueado por activación cuenta. Sustituido por integraciones sectoriales directas (ver sección abajo).                                                                             |
| Cron connector-health         | Vercel crons usan GET; route solo tenía POST → 405. Añadido GET handler. ✅ 2026-05-21. Extendido con EB session expiry en sesión 3. ✅ 2026-05-23                                                            |
| Open Banking EB               | Enable Banking AIS como proveedor PSD2 principal (reemplaza GCBD). JWT RS256 con keypair propio. CSRF via UUID state. `expiresAt` por sesión PSD2 (~90-180d). ✅ 2026-05-23                                   |
| **Integraciones sectoriales** | **Nuevo eje estratégico (2026-05-25)**: Isaak conecta con software de gestión sectorial (HotelGest, Inmovilla, Revo, Nubimed…) en lugar de ERPs genéricos. Ver `docs/engineering/SECTOR_INTEGRATIONS_PLAN.md` |

---

## ✳️ Pivote estratégico — Integraciones Sectoriales (2026-05-25)

**Decisión**: Isaak abandona la dependencia de ERPs contables genéricos (Chift/Sage/A3) como eje de integraciones y pivota hacia **software de gestión sectorial** (PMS hotelero, POS restauración, gestión clínica, inmobiliarias, etc.).

**Rationale**: El software sectorial ya ES el ERP del cliente. HotelGest para hoteles, Revo XEF para restaurantes, Nubimed para clínicas — estos sistemas contienen todos los datos operativos y fiscales. Isaak actúa como capa de inteligencia encima de ellos sin obligar al cliente a adoptar un ERP adicional.

**Holded**: se mantiene como conector **legacy** para clientes existentes. No es la línea de crecimiento.

### Estado por integración

| Integración     | Sector          | API                      | Estado           |
| --------------- | --------------- | ------------------------ | ---------------- |
| **HotelGest**   | Hoteles         | Privada (cliente piloto) | 🔄 Sprint activo |
| **Inmovilla**   | Inmobiliarias   | Pública documentada      | ⏳ Backlog P1    |
| **Revo XEF**    | Restaurantes    | Partner + cliente        | ⏳ Backlog P1    |
| **Nubimed**     | Clínicas/Dental | Pública documentada      | ⏳ Backlog P1    |
| **TeamUp**      | Gimnasios       | Gratuita                 | ⏳ Backlog P2    |
| **Loyverse**    | Comercio/Retail | Gratuita OAuth2          | ⏳ Backlog P2    |
| **RepairShopr** | Talleres        | Swagger pública          | ⏳ Backlog P2    |
| Chift           | ERPs genéricos  | Bloqueada                | ⏸️ Suspendida    |

**Plan completo**: `docs/engineering/SECTOR_INTEGRATIONS_PLAN.md`

---

## ✅ Company Intelligence — Ficha Empresa (2026-05-25)

Módulo TypeScript completo que construye perfiles fiscales-mercantiles automáticos de empresas a partir de datos del usuario y fuentes públicas oficiales. Se integra en el flujo de onboarding, el chat y el módulo de alertas de Isaak.

**Doc completo**: `docs/isaak/COMPANY_INTELLIGENCE.md`

### Arquitectura del módulo

```
company-intelligence-types.ts       — tipos: CompanyProfile, CompanyProfileInput, CompanyMatch…
company-intelligence-normalizers.ts — normalizeLegalName, detectLegalForm, validateNifFormat (NIF/NIE/CIF con checksum)
company-intelligence-scoring.ts     — scoreCompanyMatch() Jaro-Winkler + NIF/VAT + provincia (0–100)
company-intelligence-sources.ts     — CompanyDataSourceAdapter + 5 adapters (UserProvided, BORME, VIES, GLEIF, PLACSP)
company-intelligence-service.ts     — CompanyIntelligenceService.buildProfile() + inferencia contribuyente + obligaciones
company-intelligence-rules.ts       — 9 reglas evaluables: C001-C007 + R040A/R040B
__tests__/company-intelligence.test.ts — 88 tests unitarios (todos verdes)
```

### Principios de diseño

- **Trazabilidad total**: cada dato guarda `source`, `retrievedAt`, `confidence` — nada sin provenance
- **Sin scraping**: solo fuentes oficiales (BORME, VIES, GLEIF, PLACSP) y open data
- **Adapters mockeables**: `fetchFn` inyectable → tests 100% sin red
- **Inferencia prudente**: obligaciones fiscales son "probables", nunca definitivas

### Reglas del motor

| ID    | Severidad          | Condición                                              | Notas                        |
| ----- | ------------------ | ------------------------------------------------------ | ---------------------------- |
| C001  | ERROR              | Falta NIF                                              | —                            |
| C002  | ERROR              | Formato NIF inválido (checksum)                        | Cubre NIF/NIE/CIF            |
| C003  | WARNING            | Forma jurídica no identificada                         | —                            |
| C004  | WARNING            | Régimen IVA no declarado                               | —                            |
| C005  | WARNING            | Territorio fiscal no declarado                         | Afecta qué hacienda gestiona |
| C006  | WARNING            | Match mercantil de baja confianza                      | —                            |
| C007  | WARNING            | VAT intracomunitario inválido en VIES                  | —                            |
| R040A | INFO/WARNING/ERROR | VeriFactu/SIF · Sociedades desde 2027-01-01            | Severidad progresiva         |
| R040B | INFO/WARNING/ERROR | VeriFactu/SIF · Autónomos y entidades desde 2027-07-01 | Severidad progresiva         |

### Tests

- **88 tests** en `app/lib/__tests__/company-intelligence.test.ts`
- **279 tests totales** tras la integración (base 191 + 88 nuevos), todos verdes
- Cobertura completa: normalizers, scoring, adapters (mocked), service, rules
