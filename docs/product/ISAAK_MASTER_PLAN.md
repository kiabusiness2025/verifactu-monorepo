# Isaak — Plan Maestro de Producto

> Última actualización: **2026-05-19**
> Estado: documento vivo — actualizado tras completar P0/P1/P2 + sprint VF + sprints WA

---

## Visión

**Isaak** es el copiloto fiscal y contable de la pyme española: un agente de IA que conecta con el ERP del cliente (Holded primero), lee sus datos reales, ejecuta acciones con confirmación explícita y asesora en lenguaje llano sobre IVA, IRPF, cobros, gastos y Verifactu. No sustituye al gestor — le da contexto de calidad y automatiza el trabajo repetitivo.

---

## Ecosistema de productos — 3 canales, 1 producto de pago

| Canal                | App               | URL                          | Estado                                           | Coste para usuario                    |
| -------------------- | ----------------- | ---------------------------- | ------------------------------------------------ | ------------------------------------- |
| **Conector ChatGPT** | `apps/app`        | `chatgpt.verifactu.business` | ✅ Operativo · ⏳ pendiente aprobación OpenAI    | Gratis (requiere ChatGPT Plus/Teams)  |
| **Conector Claude**  | `apps/holded-mcp` | `claude.verifactu.business`  | ✅ Operativo · ⏳ pendiente aprobación Anthropic | Gratis (requiere Claude.ai Pro/Teams) |
| **Isaak**            | `apps/isaak`      | `isaak.verifactu.business`   | ✅ En producción                                 | Ver tarifas abajo                     |

**Regla fundamental:**

- Los conectores son el **funnel de adquisición gratuito** — la IA corre a costa del usuario.
- **Isaak** es el producto de pago — la IA corre a cuenta de Verifactu Business. El usuario no necesita ninguna suscripción adicional de IA.

---

## Tarifas definitivas (vigentes desde 2026-05-16)

| Plan         | Precio    | Límites                                                            | IA incluida                          |
| ------------ | --------- | ------------------------------------------------------------------ | ------------------------------------ |
| **Free**     | 0 €       | 10 mensajes/día · solo chat fiscal general · sin Holded            | Sí — Claude Haiku                    |
| **Starter**  | 19 €/mes  | Holded conectado · 200 consultas/mes · sin OCR ni Google           | Sí — Claude Haiku                    |
| **Pro**      | 49 €/mes  | Ilimitado · OCR · Google Calendar/Gmail/Drive · voz · push         | Sí — Claude Sonnet                   |
| **Business** | 149 €/mes | Todo Pro + multi-usuario (10) · modelos AEAT · banking · multi-ERP | Sí — Claude Sonnet + GPT-4o opcional |

**Descuento anual:** −20% en todos los planes de pago.

**Add-ons (Starter+):** Usuario adicional €9/mes · ERP adicional €15/mes · Banco adicional €10/mes.

---

## Funnel de conversión

```
Conector ChatGPT / Claude (gratis, requiere licencia propia)
  │
  ├─ Widget Isaak en holded.verifactu.business
  │    └─ Límite vitrina 50 consultas/día → CTA Isaak (P1-1 ✅)
  │
  └─ Llegada a isaak.verifactu.business
       ├─ Free (10 msg/día) → prueba valor sin fricción
       ├─ Trial 14 días Pro (sin tarjeta) → onboarding activo
       └─ Conversión a plan de pago
```

---

## Estado actual del producto — mayo 2026

### ✅ Base (S1–S10, completado antes 2026-05-16)

| Área                            | Detalle                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| Auth + workspace                | Login, sesión, onboarding Holded, sidebar, bottom nav                |
| Chat con ERP Holded             | `/api/holded/chat` — contexto real, historial, memoria, herramientas |
| Chat libre / público            | `/api/chat` — sin ERP, sistema de prompts contextual                 |
| Dashboard KPIs `/resumen`       | Ventas, gastos, cobros, IVA estimado, gráfico 6m                     |
| Verifactu nativo                | `create_verifactu_invoice`, PDF+QR, registro AEAT                    |
| Billing Stripe                  | Checkout, portal, cancel, webhooks, trial, cron expiry               |
| OCR + upload gastos             | `upload-expense`, Claude Vision, confirmación → Holded               |
| Voz STT + TTS                   | Web Speech API                                                       |
| Google Calendar + Gmail + Drive | OAuth, sync, calendario fiscal, scan facturas, backup Drive          |
| Push notifications + PWA        | VAPID, Service Worker, manifest, 8 iconos                            |
| Alertas fiscales                | `IsaakAlert`, cron D-15/7/3/1, email Resend                          |
| Admin copilot                   | IsaakDock + chat + herramientas BD (K1 `get_tenant_holded_data`)     |

### ✅ P0 / P1 / P2 (completado 2026-05-18)

| Sprint | Detalle                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0     | Pricing 4 planes + "IA incluida" + FAQ + Free tier 10 msg/día (`isaak-quota.ts`) + docs sync                                                                        |
| P1     | Markdown (react-markdown+remark-gfm) · Thumbs feedback · K2 fiscal overview admin · Loop conversión widget→Isaak                                                    |
| P2     | Hub alertas fiscales `/fiscal` · K3-K5 UX · Isaak Público feature flag + `/p/[slug]` · Open Banking Salt Edge UI · Conciliación bancaria (motor scoring + API + UI) |

### ✅ Landing WOW (2026-05-18, commit b5105e5e)

- `IsaakHomeLanding.tsx` — 8 secciones, hero oscuro, demo interactivo, JSON-LD SEO
- `IsaakLiveDemo.tsx` — tabs Financiero/Fiscal/Bancario, donut IVA SVG animado
- `IsaakStatsCounter.tsx` — contadores scroll-triggered (80%, 99%, 24/7)
- Nav actualizado: Inicio, Demo, Conectores, Asesorías, Precios

### ✅ WhatsApp (WA-I a WA-VI, en main antes 2026-05-19)

WA-I: templates HSM fiscales + W6 admin activity · WA-II/III: templates HSM avanzados · WA-IV: Flows formulario guiado · WA-V: historial conversacional · WA-VI: clarificación inteligente con botones · Asesor fiscal con fuentes oficiales y quick replies

### ✅ Google Integrations completas (2026-05-19, commit 23ffd142)

- `uploadFileToDrive()` trigger automático desde OCR y PDF generado
- `POST /api/isaak/gmail/process-attachment` — OCR adjuntos Gmail + backup Drive
- Página `/mail` — scan bandeja 30 días, detección facturas, procesado OCR inline
- Sidebar: "Gmail Facturas" (Mail icon)

### ✅ P0 Audit 360 (2026-05-19, PR #90)

IsaakSiteChrome subtitle + footer fix · pricing AEAT section (Sede Electrónica, VeriFactu, SII) · `/fiscal` panel acceso directo AEAT · Resend lazy init (CI fix) · OAuth proxy metadata sync

### ✅ Sprint VF — VeriFactu + Certs + Plantillas (PRs #91 + #92, 2026-05-19)

| Item | Detalle                                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VF-0 | Fix `verifactu_status`: parseo real de `EstadoRegistro` SOAP AEAT (accepted/rejected/accepted_with_errors)                                                                                                            |
| VF-T | Sistema de plantillas: 5 predefinidas + constructor custom + extracción IA colores (Claude Vision). UI `/settings` tab "Plantillas". APIs: `GET/POST /api/isaak/templates` + `PATCH/DELETE /api/isaak/templates/[id]` |
| VF-2 | Certificados digitales: P12/PFX upload → extracción PEM-JSON (node-forge) → cifrado AES-256-GCM. UI `/settings` tab "Certificado". APIs: `GET/POST /api/isaak/certificates` + `DELETE /api/isaak/certificates/[id]`   |
| VF-1 | Landing + pricing: VeriFactu y plantillas destacados en plan Free. Copy "único plan gratis con AEAT real"                                                                                                             |
| VF-3 | Proxy SOAP mTLS AEAT: `aeat-sede.ts` (cert PEM + HTTPS agent). Página `/sede` con cert card, notificaciones, datos censales. APIs: `GET /api/isaak/sede/notifications` + `/census`                                    |
| VF-4 | `isAeatQuery()` detecta preguntas AEAT, inyecta `aeatBlock` (cert + notificaciones) en system prompt                                                                                                                  |
| Tmpl | PDF route: carga `InvoiceTemplate` default del tenant y merge branding sobre adminEditHistory fallback                                                                                                                |

### ✅ Holded Connector UX (PRs #93 + #94, 2026-05-19)

- OG images dinámicas: `/api/og/chatgpt` y `/api/og/claude` — ImageResponse 1200×630 con logos reales
- Email sender names: `ChatGPT x Holded` / `Claude x Holded` por canal
- Toast post-conexión + ChannelBadge en dashboard
- Confetti hook + disparado en holded-form y claude-form
- ConnectorRequirementsCard en landings + hub público-ready

---

### ✅ P3-1 Modo Asesoría (2026-05-19, commit 00d65830)

- `AdvisorClient` Prisma model — alias, NIF, Holded API key cifrada AES-256-GCM, is_active, notas
- CRUD API en `/api/isaak/advisor/clients` (GET/POST/PATCH/DELETE)
- Cookie-based session `isaak_advisor_client` (httpOnly, 7d) — switch vía POST `.../[id]/switch`
- `AdvisorDashboardClient.tsx` — listado con ClientCard, formulario inline, botón "Chat con este cliente"
- `AdvisorModeBanner.tsx` — banner ámbar en chat, botón Salir que limpia la cookie
- Chat route: inyecta key del cliente, carga snapshot con esa key, prepend `advisorBanner` al system prompt
- Migración `20260519200000_advisor_clients` en producción vía `prisma migrate deploy` en Vercel build

### ✅ Legal policies + landing pricing (2026-05-19, commit 2e9dd6f3)

- **Landing**: plan Starter (19 €) añadido al grid — ahora 4 columnas (Free / Starter / Pro / Business)
- **Privacy** (`/privacy`): fecha 19-may-2026, 5 secciones nuevas (WhatsApp/Meta, Salt Edge, AEAT P12, Modo Asesoría, Google Workspace), subencargados ampliados con Salt Edge y Meta
- **Terms** (`/terms`): fecha 19-may-2026, secciones por integración (WhatsApp/Meta, Open Banking, AEAT P12, Modo Asesoría, VeriFactu emisión), sección uso aceptable, enlace WhatsApp Business Terms

---

## ⚠️ Pendientes de infraestructura (antes del próximo sprint)

| Tarea                                 | Detalle                                                                                                                                                                      | Prioridad    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `prisma migrate deploy` en producción | Tablas `invoice_templates` + `tenant_certificates` (migración `20260519120000`) + `advisor_clients` (migración `20260519200000`) — se aplica automáticamente en Vercel build | 🟡 Verificar |
| Validar WSDLs AEAT                    | Probar `BuzElecWS` y `ConsultaInformacion` con un cert real. Si los paths son incorrectos, añadir `AEAT_NOTIF_WS_URL` y `AEAT_CENSUS_WS_URL` a Vercel                        | 🟡 Post-cert |
| VAPID push notifications              | ✅ Verificado 2026-05-19: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` están en Vercel desde hace 14d                            | ✅ OK        |
| GPT-4o fallback automático            | ✅ Verificado 2026-05-19: fallback es automático en `packages/utils/ai/config.ts` (defaultFallback: anthropic→openai). `ISAAK_NEW_OPENAI_API_KEY` ya en Vercel               | ✅ OK        |
| OpenAI Manual QA                      | 16 tests × 2 plataformas (POS-01..10 + NEG-01..6 en web y mobile). Ver `docs/openai-submission/WEB_MOBILE_REVIEW_CHECKLIST.md`                                               | 🟡 QA manual |

---

## Backlog P3 — Asesorías y B2B (mes 3+)

| ID   | Tarea                                                                                                         | Esfuerzo estimado |
| ---- | ------------------------------------------------------------------------------------------------------------- | ----------------- |
| P3-1 | ~~**Modo Asesoría**~~ ✅ Completado 2026-05-19                                                                | —                 |
| P3-3 | **Modelos AEAT Business**: borradores 303, 130, 390 pre-rellenados con datos Holded. UI wizard paso a paso    | L (2 sprints)     |
| P3-4 | **Conector Sage / A3**: segundo ERP. Arquitectura: `ERP_TYPE` por tenant, capa de abstracción `erp-client.ts` | XL (3+ sprints)   |

---

## Backlog Admin Panel (pendiente menor)

| ID  | Tarea                                                   | Detalle                                                  |
| --- | ------------------------------------------------------- | -------------------------------------------------------- |
| D4  | `MarketingCampaign` Prisma model + migration            | Historial de campañas email desde el panel admin         |
| F   | Fase F admin — Isaak Público feature flag UI por tenant | Toggle en admin panel (prerequisito: Fase C en prod 7d+) |

---

## Variables de entorno críticas

```env
# Anthropic API (motor IA de Isaak)
ANTHROPIC_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_STARTER_MONTHLY=price_...   # €19/mes
STRIPE_PRICE_PRO_MONTHLY=price_...       # €49/mes
STRIPE_PRICE_BUSINESS_MONTHLY=price_...  # €149/mes

# Google OAuth (Calendar + Gmail + Drive)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Push notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_SUBJECT=mailto:soporte@verifactu.business

# Alertas + cron
CRON_SECRET=...
RESEND_API_KEY=...

# Open Banking (Salt Edge)
SALTEDGE_APP_ID=...
SALTEDGE_SECRET=...

# Certificados digitales — AES-256-GCM (añadido 2026-05-19)
CERT_MASTER_KEY=<hex 64 chars>

# Auth server-to-server Isaak → API (añadido 2026-05-19)
INTERNAL_API_SECRET=<secret>

# Multi-LLM fallback (añadido 2026-05-19)
# Activa GPT-4o como fallback automático cuando falla el modelo primario (plan Business)
# GPT-4o fallback — automático vía config.ts defaultFallback(); key ya en Vercel como ISAAK_NEW_OPENAI_API_KEY
# ISAAK_AI_FALLBACK_PROVIDER=openai  ← solo necesario si se quiere forzar explícitamente

# AEAT Sede Electrónica (opcionales — defaults apuntan a producción AEAT)
AEAT_NOTIF_WS_URL=https://www1.agenciatributaria.gob.es/wlpl/BUZA-CONT/ws/BuzElecWS
AEAT_CENSUS_WS_URL=https://www1.agenciatributaria.gob.es/wlpl/OVSC-CONT/ws/ConsultaInformacion/ConsultaInformacion
```

---

## Decisiones de arquitectura vigentes

| Decisión               | Detalle                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor IA por plan      | Free/Starter → Claude Haiku (~€0.003/consulta). Pro → Claude Sonnet (~€0.008/consulta). Business → Sonnet + GPT-4o opcional                       |
| Rate limit free        | `TenantSubscription.dailyQueryLimit/queriesUsedToday/lastQueryResetAt` — reset diario, check en `isaak-quota.ts`                                  |
| Contexto por tenant    | SYSTEM_PROMPT base + sección dinámica (empresa, sector, régimen, señales workspace) + `aeatBlock` si query AEAT                                   |
| Acciones con escritura | Siempre requieren confirmación explícita. Sin excepciones                                                                                         |
| Certificados digitales | P12 upload → extracción PEM (node-forge) → cifrado AES-256-GCM (`CERT_MASTER_KEY`). Campo `encryptedP12` contiene PEM-JSON cifrado, nunca raw P12 |
| mTLS AEAT              | `https.Agent` con `cert` + `key` PEM del tenant. Endpoints configurables via env vars                                                             |
| Branding facturas      | `InvoiceTemplate.isDefault` del tenant → merge sobre `adminEditHistory.branding` como fallback                                                    |
| Isaak Público          | Feature flag `isaak_public_enabled` por tenant. Auto-slug. Rate limit 15/h por IP. API pública no requiere auth                                   |

---

## Estrategia de captación — conectores pendientes de aprobación

Mientras los conectores ChatGPT y Claude están **pendientes de aprobación**:

1. Widget Isaak en `holded.verifactu.business` (activo)
2. SEO y landing WOW en `isaak.verifactu.business`
3. Campaña directa a usuarios de Holded
4. Demo pública en `/demo`
5. Isaak Público por tenant (activo para tenants que lo activen desde admin)

Una vez aprobados los conectores:

```
Usuario en ChatGPT/Claude → conecta Holded → usa conector gratis
  → llega al límite diario del widget → CTA
  → registra en Isaak Free → trial 14 días Pro → conversión
```

---

## Documentos relacionados

| Doc                                                              | Descripción                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `docs/engineering/ISAAK_MASTER_PLAN.md`                          | Plan técnico por fases con desglose de implementación   |
| `docs/isaak/ISAAK_SUBSCRIPTION_MODEL.md`                         | Modelo de suscripción detallado (sync con precios aquí) |
| `docs/isaak/ISAAK_PLATFORM_VISION.md`                            | Visión de plataforma a largo plazo                      |
| `docs/product/CONNECTOR_ACQUISITION_FUNNEL_PLAN_2026.md`         | Estrategia funnel conector → Isaak                      |
| `docs/engineering/ADMIN_PANEL_CONNECTORS_AUDIT_AND_PLAN_2026.md` | Auditoría y plan del panel de administración            |
| `docs/openai-submission/WEB_MOBILE_REVIEW_CHECKLIST.md`          | Checklist QA manual para resubmisión OpenAI             |
