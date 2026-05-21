# Isaak — Plan Maestro de Evolución (Ingeniería)

**Última actualización**: 2026-05-21
**Visión**: Isaak como agente fiscal y contable autónomo que conecta con datos reales del ERP, ejecuta acciones con confirmación, aprende de cada empresa y asesora en lenguaje llano.

> Para contexto de producto, pricing y estrategia de captación ver `docs/product/ISAAK_MASTER_PLAN.md`.

---

## Estado de implementación — apps/isaak (completo a 2026-05-19)

### Base S1–S10 ✅

| Componente                                   | Estado | Notas                                                            |
| -------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Auth + workspace layout                      | ✅     | Sesión, onboarding, sidebar, bottom nav                          |
| `/api/holded/chat` (chat con ERP)            | ✅     | Holded context, historial, memoria, herramientas, model-per-plan |
| `/api/chat` (chat libre/público)             | ✅     | Auth opcional, fallback rules, rate-limit IP                     |
| `/resumen` dashboard KPIs                    | ✅     | Ventas, gastos, cobros, IVA, gráfico 6m                          |
| Verifactu — create + PDF + QR                | ✅     | S4 completo                                                      |
| Stripe billing (checkout/portal/cancel/cron) | ✅     | S5 completo                                                      |
| OCR + upload gastos                          | ✅     | S6: `upload-expense`, Claude Vision, confirmación                |
| Voz STT + TTS                                | ✅     | S7: Web Speech API                                               |
| Google Calendar + Gmail + Drive              | ✅     | S8-A/B/C/D + integración completa (2026-05-19)                   |
| Alertas fiscales cron                        | ✅     | S8-B: D-15/7/3/1, hub `/fiscal`, panel acceso AEAT               |
| Push notifications                           | ✅     | S10-B: VAPID, Service Worker                                     |
| PWA                                          | ✅     | S10-A: manifest, 8 iconos                                        |

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

---

## Backlog — Siguientes sprints (orden de prioridad)

### G-2: Google Integrations — LLM Tools + Completar gaps (PRÓXIMO)

**Objetivo:** Convertir a Isaak en operador activo de la suite Google del empresario. Actualmente Google Calendar/Gmail/Drive son herramientas manuales — el LLM no puede usarlas. G-2 las expone como herramientas del asistente.

**Gap crítico actual:**

- El chat `/api/holded/chat` no tiene ninguna herramienta Google → el usuario debe ir manualmente a `/calendar`, `/mail`
- Calendar: falta listar eventos y editar/borrar
- Drive: falta listar archivos subidos
- Gmail: falta etiquetar/archivar mensajes procesados

**Cambios técnicos:**

```
apps/isaak/app/api/holded/chat/route.ts
  → Añadir herramientas: google_calendar_list, google_calendar_create,
    google_calendar_update, google_drive_list, google_drive_upload,
    gmail_scan, gmail_process_attachment

apps/isaak/app/lib/google-calendar.ts
  → Añadir listEvents(), updateEvent(), deleteEvent()

apps/isaak/app/lib/google-drive.ts
  → Añadir listFiles(), deleteFile()

apps/isaak/app/lib/gmail-scan-service.ts
  → Añadir archiveMessage(), addLabel() (scope upgrade: gmail.modify)
```

**Nuevo scope Gmail:** `gmail.modify` (en lugar de `gmail.readonly`) para archivar + etiquetar.  
Re-autorización necesaria para usuarios ya conectados (prompt de re-auth automático si scope insuficiente).

**Esfuerzo:** M (1 sprint)

---

### M: Microsoft Graph — OneDrive + Outlook Calendar + Outlook Mail

**Objetivo:** Mismo nivel de integración que Google pero para el ecosistema Microsoft 365, dominante en empresas medianas-grandes en España.

**Viabilidad confirmada (2026-05-21):**

- App Azure AD multi-tenant = gratis. Sin coste por tenant conectado.
- El usuario trae su licencia M365 — Verifactu solo necesita la app registration.
- Scopes delegados: `Files.ReadWrite`, `Calendars.ReadWrite`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`
- OAuth idéntico al de Google — mismo patrón de token storage.

**Cambios técnicos:**

```
packages/db/prisma/schema.prisma
  → Nuevo modelo IsaakMicrosoftToken (tenantId, userId, accessToken,
    refreshToken, expiresAt, email, scopes)
  → Migración: 20260521_isaak_microsoft_token

apps/isaak/app/lib/
  → microsoft-oauth.ts     — OAuth flow, token refresh, scopes
  → microsoft-calendar.ts  — listEvents, createEvent, updateEvent, deleteEvent
  → microsoft-drive.ts     — listFiles, uploadFile, createFolder
  → microsoft-mail.ts      — scanInbox, processAttachment, sendMail, archiveMail

apps/isaak/app/api/isaak/microsoft/
  → auth/route.ts          — redirect OAuth Azure AD
  → callback/route.ts      — exchange code, store token
  → status/route.ts        — estado conexión
  → disconnect/route.ts    — revocar token
  → sync/route.ts          — sync deadlines fiscales a Outlook Calendar

apps/isaak/app/(workspace)/
  → microsoft/page.tsx     — settings hub Microsoft (estado, scopes, sync)

apps/isaak/app/api/holded/chat/route.ts
  → Añadir herramientas microsoft_* (idénticas a google_* pero Microsoft Graph)
```

**Variables de entorno nuevas:**

```
MICROSOFT_CLIENT_ID       — Azure AD app (client) ID
MICROSOFT_CLIENT_SECRET   — Azure AD client secret
MICROSOFT_TENANT_ID       — 'common' para multi-tenant
MICROSOFT_REDIRECT_URI    — https://isaak.verifactu.business/api/isaak/microsoft/callback
```

**Esfuerzo:** L (1.5 sprints)

---

### P3-4-C: Chift ERP Aggregator — Sage, A3, ContaPlus y más

**Objetivo:** Conectar con 50+ ERPs españoles a través de una sola API sin necesitar suscripción a cada uno.

**Contexto (investigación 2026-05-21):**

- Sage 200c y a3innuva requieren suscripción activa del cliente para acceder a su API.
- Chift (chift.eu) y Nubyhub son aggregators que normalizan APIs de múltiples ERPs:
  - Soportan: Sage, a3innuva, ContaPlus, Anfix, Pennylane, Holded, QuickBooks, Xero, Odoo...
  - Una sola integración desde Isaak → acceso a todos los ERPs del cliente
  - El cliente conecta su ERP en el widget de Chift → Isaak recibe los datos normalizados
  - Pricing: fee por conexión activa, no por ERP

**Encaja perfectamente con `ErpClient` existente:**

- Añadir `provider: 'chift'` en `ExternalConnection`
- `ChiftErpClient implements ErpClient` — traduce Chift responses a `ErpInvoice`, `ErpContact`, etc.
- Un solo adapter cubre todos los ERPs que Chift soporta

**Cambios técnicos:**

```
apps/isaak/app/lib/chift-erp-client.ts  — ChiftErpClient implements ErpClient
apps/isaak/app/lib/erp-client-factory.ts — añadir case 'chift'
apps/isaak/app/(workspace)/settings/    — UI conectar ERP via Chift widget
```

**Variables de entorno:**

```
CHIFT_CLIENT_ID / CHIFT_CLIENT_SECRET / CHIFT_API_BASE
```

**Prerequisito:** Registrarse en chift.eu y obtener API key de desarrollo (acceso gratuito para dev).

**Esfuerzo:** M (1 sprint una vez obtenidas las credenciales Chift)

---

### Admin D4: MarketingCampaign (pendiente menor)

- Modelo Prisma `MarketingCampaign` + migración
- Historial de campañas enviadas en panel admin `/admin-marketing`
- Esfuerzo: XS (pocas horas)

---

## Stack técnico — librerías por fase

| Fase/Sprint | Librerías añadidas                                  | Estado  |
| ----------- | --------------------------------------------------- | ------- |
| G           | `react-markdown`, `remark-gfm`                      | ✅      |
| H           | `recharts`, `xlsx` (SheetJS)                        | ✅      |
| VF-2        | `node-forge`, `@types/node-forge`                   | ✅      |
| OG images   | `next/og` (built-in Next.js 15)                     | ✅      |
| G-2         | Sin librerías nuevas (Google APIs via fetch nativo) | Pending |
| M           | Sin librerías nuevas (Microsoft Graph via fetch)    | Pending |
| P3-4-A/B    | Sin librerías nuevas (fetch nativo + OData params)  | Pending |
| P3-4-C      | `chift-sdk` o fetch nativo según Chift docs         | Pending |

---

## Decisiones de arquitectura vigentes

| Decisión                | Detalle                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor IA por plan       | Free/Starter → `claude-haiku-4-5`. Pro → `claude-sonnet-4-6`. Business → Sonnet + GPT-4o opcional. Abstracción en `callLLM` de `@verifactu/utils`           |
| Rate limit free         | `TenantSubscription.dailyQueryLimit/queriesUsedToday/lastQueryResetAt` — reset diario, check en `isaak-quota.ts`. Por `tenantId` si auth, por IP si público |
| Acciones con escritura  | Confirmación obligatoria. El assistant propone, el usuario confirma. Sin excepciones                                                                        |
| Certificados digitales  | P12 upload → PEM-JSON (node-forge) → AES-256-GCM con `CERT_MASTER_KEY`. Campo `encryptedP12` almacena PEM-JSON cifrado, nunca raw P12                       |
| mTLS AEAT               | `https.Agent` con `{cert, key}` PEM del tenant. URLs configurables via `AEAT_NOTIF_WS_URL` / `AEAT_CENSUS_WS_URL`                                           |
| AEAT chat context       | `isAeatQuery(message)` → carga cert + notificaciones → `aeatBlock` en system prompt                                                                         |
| Branding facturas PDF   | `InvoiceTemplate.isDefault` del tenant → merge sobre `adminEditHistory.branding` → fallback colores Verifactu                                               |
| Isaak Público           | Rate limit 15/h por IP vía `checkPublicChatQuota`. Auto-slug desde nombre empresa. Claude Haiku                                                             |
| `INTERNAL_API_SECRET`   | Bypass auth cookie para llamadas server-to-server entre `apps/isaak` y `apps/api`                                                                           |
| Google LLM tools (G-2)  | Chat route expone `google_*` tools que el LLM invoca directamente. Re-auth si scope insuficiente (`gmail.modify` upgrade).                                  |
| Microsoft Graph (M)     | Multi-tenant Azure AD app. `IsaakMicrosoftToken` per `(tenantId, userId)`. Mismo patrón OAuth + auto-refresh que Google.                                    |
| ERP aggregator (P3-4-C) | Chift como capa única para Sage/A3/ContaPlus/etc. `ChiftErpClient implements ErpClient` — un adapter cubre 50+ ERPs.                                        |
