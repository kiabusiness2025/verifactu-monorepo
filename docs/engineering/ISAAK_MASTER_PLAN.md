# Isaak — Plan Maestro de Evolución (Ingeniería)

**Última actualización**: 2026-05-19
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

## Backlog P3 — siguientes sprints

### ~~P3-1: Modo Asesoría~~ — ✅ Completado 2026-05-19

### P3-2: White-label

**Objetivo:** Isaak con marca propia por tenant (logo, nombre, colores, dominio custom).

**Precondición:** `InvoiceTemplate` + branding ya implementados (VF-T ✅).

**Cambios técnicos:**

- Campo `whitelabelConfig JSON` en `Tenant` (nombre app, colores, logoUrl, dominio)
- Middleware: si request viene de dominio custom → cargar config del tenant asociado
- UI pública: usar `whitelabelConfig` en lugar de branding Isaak
- Plan Enterprise únicamente

**Esfuerzo estimado:** M (1 sprint)

### P3-3: Modelos AEAT — 303/130/390

**Objetivo:** Borradores de modelos fiscales pre-rellenados con datos Holded.

**Cambios técnicos:**

- `generateModelo303(tenantId, trimestre)`: extrae IVA repercutido + soportado de Holded
- `generateModelo130(tenantId, trimestre)`: pagos fraccionados IRPF para autónomos
- `generateModelo390(tenantId, year)`: resumen anual IVA
- UI wizard paso a paso con revisión antes de descarga/envío
- Validación con datos reales de Holded via `get_tenant_holded_data`
- Plan Business únicamente

**Esfuerzo estimado:** L (2 sprints)

### P3-4: Conector Sage / A3

**Objetivo:** Segundo ERP. Arquitectura extensible.

**Cambios técnicos:**

- Campo `erpType: 'holded' | 'sage' | 'a3'` en `ExternalConnection`
- Capa de abstracción: `apps/isaak/app/lib/erp-client.ts` — interface `ErpClient` con métodos `getInvoices()`, `getContacts()`, etc.
- Adapters: `holded-erp-client.ts` (ya existe), `sage-erp-client.ts` (nuevo), `a3-erp-client.ts` (nuevo)
- OAuth / API key flow específico por ERP
- Add-on €15/mes/ERP adicional

**Esfuerzo estimado:** XL (3+ sprints)

---

## Stack técnico — librerías por fase

| Fase/Sprint | Librerías añadidas                | Estado  |
| ----------- | --------------------------------- | ------- |
| G           | `react-markdown`, `remark-gfm`    | ✅      |
| H           | `recharts`, `xlsx` (SheetJS)      | ✅      |
| VF-2        | `node-forge`, `@types/node-forge` | ✅      |
| OG images   | `next/og` (built-in Next.js 15)   | ✅      |
| P3-3        | Sin librerías nuevas previstas    | Pending |
| P3-4        | SDK específico por ERP (Sage/A3)  | Pending |

---

## Decisiones de arquitectura vigentes

| Decisión               | Detalle                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor IA por plan      | Free/Starter → `claude-haiku-4-5`. Pro → `claude-sonnet-4-6`. Business → Sonnet + GPT-4o opcional. Abstracción en `callLLM` de `@verifactu/utils`           |
| Rate limit free        | `TenantSubscription.dailyQueryLimit/queriesUsedToday/lastQueryResetAt` — reset diario, check en `isaak-quota.ts`. Por `tenantId` si auth, por IP si público |
| Acciones con escritura | Confirmación obligatoria. El assistant propone, el usuario confirma. Sin excepciones                                                                        |
| Certificados digitales | P12 upload → PEM-JSON (node-forge) → AES-256-GCM con `CERT_MASTER_KEY`. Campo `encryptedP12` almacena PEM-JSON cifrado, nunca raw P12                       |
| mTLS AEAT              | `https.Agent` con `{cert, key}` PEM del tenant. URLs configurables via `AEAT_NOTIF_WS_URL` / `AEAT_CENSUS_WS_URL`                                           |
| AEAT chat context      | `isAeatQuery(message)` → carga cert + notificaciones → `aeatBlock` en system prompt                                                                         |
| Branding facturas PDF  | `InvoiceTemplate.isDefault` del tenant → merge sobre `adminEditHistory.branding` → fallback colores Verifactu                                               |
| Isaak Público          | Rate limit 15/h por IP vía `checkPublicChatQuota`. Auto-slug desde nombre empresa. Claude Haiku                                                             |
| `INTERNAL_API_SECRET`  | Bypass auth cookie para llamadas server-to-server entre `apps/isaak` y `apps/api`                                                                           |
