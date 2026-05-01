# Verifactu Business Rebuild Execution Plan 2026

## 1. Purpose

This document translates the platform architecture into an execution plan with three practical outputs:

- technical workstreams by app, package and folder
- landing route transition decisions
- cleanup gates for what must be preserved, replaced or retired

It is a companion to `VERIFACTU_BUSINESS_PLATFORM_ARCHITECTURE_2026.md`.

## 2. Non-Negotiable Rules

1. Reuse existing platform foundations before writing new modules.
2. Preserve valuable dashboard capabilities for future phases instead of deleting them.
3. Retire public legacy routes only after redirects and replacement flows exist.
4. Do not build new commerce, governance or onboarding logic on `Company` / `CompanyMember`.
5. `Tenant` + `TenantProfile` + `Membership` + `ExternalConnection` remain the canonical business core.

## 3. Technical Workstreams by Surface

| Workstream                            | Main paths                                                                                                                                                                                                                                                                                                   | Reuse now                                                                                                                                              | Preserve for future                                                                      | Replace or retire                                                                                                 | Primary deliverables                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public IA and commercial shell        | `apps/landing/app/page.tsx`, `apps/landing/app/components/*`, `apps/landing/app/layout.tsx`, `apps/landing/app/producto/*`, `apps/landing/app/precios/*`, `apps/landing/app/planes/*`, `apps/landing/app/verifactu/*`, `apps/landing/app/holded/*`                                                           | current layout, header/footer patterns, legal shell, conversion blocks that can be rewritten                                                           | low-priority resources content                                                           | old Demo SL and Isaak-first commercial narrative, duplicate product trees                                         | new navigation, new route tree, new conversion hierarchy                                       |
| Public APIs and handoff               | `apps/landing/app/api/send-lead/route.ts`, `apps/landing/app/api/support-ticket/route.ts`, `apps/landing/app/api/checkout/route.ts`, `apps/landing/app/api/dashboard-redirect/route.ts`, `apps/landing/app/api/chat/route.ts`, `apps/landing/app/api/stripe/webhook/route.ts`, `apps/landing/app/api/auth/*` | send lead, support ticket, checkout, dashboard redirect                                                                                                | auth/session endpoints during transition                                                 | public chat as old acquisition layer, landing-owned Stripe webhook after centralization                           | catalog APIs, onboarding start, custom integrations request, WhatsApp entry, safer app handoff |
| Tenant workspace and onboarding       | `apps/app/app/api/app/me/route.ts`, `apps/app/app/api/session/tenant-switch/route.ts`, `apps/app/app/api/onboarding/*`, `apps/app/app/api/integrations/accounting/*`, `apps/app/app/api/webhooks/stripe/route.ts`                                                                                            | tenant context, onboarding prefill, Holded validation/connect/status, tenant switch, Stripe webhook capability                                         | invoice, AEAT, Isaak, banking, expenses, quotes, documents and broader workspace modules | trial-specific onboarding assumptions once real provisioning exists                                               | tenant-aware onboarding, order visibility, billing access, governance continuation             |
| Admin control plane                   | `apps/admin/app/(admin)/*`, `apps/admin/app/api/admin/tenants/*`, `apps/admin/app/api/admin/users/*`, `apps/admin/app/api/admin/support-sessions/*`, `apps/admin/app/api/admin/accounting/route.ts`, `apps/admin/app/api/admin/emails/*`                                                                     | tenant overview, support sessions, user search, audit and operations base                                                                              | deeper admin accounting and VeriFactu panels                                             | company-named legacy aliases after tenant normalization                                                           | orders queue, fulfillment queue, claims review, catalog ops, support routing                   |
| Canonical data model and provisioning | `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/*`                                                                                                                                                                                                                                        | `Tenant`, `TenantProfile`, `Membership`, `TenantSubscription`, `ExternalConnection`, `ClaimCase`, `ClaimResolution`, `ChannelIdentity`, `WebhookEvent` | existing business tables needed for compatibility during migration                       | new feature work on `Company` / `CompanyMember`                                                                   | catalog, prices, orders, fulfillment, support and WhatsApp entities                            |
| Shared integration layer              | `packages/integrations/stripe.ts`, `packages/integrations/holded/*`, `packages/integrations/index.ts`                                                                                                                                                                                                        | Stripe and Holded adapters                                                                                                                             | Isaak-related helpers and other connectors not blocking phase 1                          | none immediately; only duplicate wrappers if discovered later                                                     | WhatsApp adapter, order provisioning helpers, shared commercial contracts                      |
| Shared auth, UI and utils             | `packages/auth/*`, `packages/ui/*`, `packages/utils/*`                                                                                                                                                                                                                                                       | shared session, UI primitives, URL/cookie helpers                                                                                                      | private-workspace UX helpers                                                             | duplicated auth logic in landing once `/acceder` becomes canonical                                                | business shell variant, shared access flows, catalog/billing helper utilities                  |
| Cleanup and compatibility             | `apps/landing/middleware.ts`, `apps/app/middleware.ts`, `apps/admin/README.md`, company-centric helpers such as `apps/app/lib/tenants.ts`, legacy admin aliases                                                                                                                                              | compatibility redirects during migration                                                                                                               | backward compatibility for one or two releases where needed                              | Demo SL marketing path, duplicate public trees, `/dashboard/admin/*` aliases, company-centric canonical semantics | redirect map, de-indexing plan, final retirement checklist                                     |

## 4. Route Transition Matrix for `apps/landing`

| Current route group                                                                                               | Action                                                                                      | Canonical target                                                        | Timing       | Notes                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `/`                                                                                                               | rebuild in place                                                                            | `/`                                                                     | phase 1      | becomes the new marketplace home                                            |
| `/presupuesto`                                                                                                    | keep and refactor                                                                           | `/presupuesto`                                                          | phase 1      | convert to structured quote and assisted sales intake                       |
| `/servicios/migracion`                                                                                            | rename and rebuild                                                                          | `/servicios/migraciones`                                                | phase 1      | keep the intent, normalize the taxonomy                                     |
| `/precios`, `/planes`, `/planes/basico`, `/planes/pro`, `/planes/pyme`, `/planes/empresa`, `/politica-de-precios` | replace with redirects after new pages ship                                                 | `/suscripciones`, `/suscripciones/autonomos`, `/suscripciones/empresas` | phase 1      | pricing copy can be recycled, route family should be consolidated           |
| `/holded`, `/producto/integraciones`, `/producto/integraciones/isaak-for-holded`                                  | replace with redirects after content migration                                              | `/integraciones`, `/integraciones/holded-chatgpt`                       | phase 1      | reuse the substance, retire the fragmented route tree                       |
| `/producto/automatizacion`                                                                                        | replace with redirect after rewrite                                                         | `/integraciones/personalizadas`                                         | phase 1      | custom automations move into integrations catalog                           |
| `/producto/plataforma`, `/producto/resumen`                                                                       | merge content and retire routes                                                             | `/`, `/servicios`, `/integraciones`                                     | phase 1      | do not keep standalone platform-summary routes                              |
| `/verifactu`, `/verifactu/que-es`                                                                                 | merge content and redirect                                                                  | `/servicios`                                                            | phase 1      | fold fiscal/compliance explanation into services                            |
| `/verifactu/planes`                                                                                               | redirect after subscriptions launch                                                         | `/suscripciones`                                                        | phase 1      | one subscription tree only                                                  |
| `/verifactu/soporte`, `/holded/support`, `/recursos/contacto`                                                     | consolidate                                                                                 | `/contacto` and `/soporte`                                              | phase 1      | commercial contact and support entry should not be fragmented               |
| `/que-es-isaak`                                                                                                   | retire as standalone acquisition page after content reuse                                   | `/integraciones/holded-chatgpt`                                         | phase 1      | Isaak remains a capability, but not the public IA spine                     |
| `/proximamente`                                                                                                   | rebuild in place with new meaning                                                           | `/integraciones/proximamente`                                           | phase 1      | use as future integrations holding page                                     |
| `/demo`                                                                                                           | remove from public primary navigation; keep only as temporary noindex sales asset if needed | temporary hidden path or retire                                         | phase 1 to 2 | old Demo SL motion must not remain the main acquisition story               |
| `/recursos/blog`, `/recursos/checklist`, `/recursos/guias-y-webinars`                                             | preserve but de-prioritize                                                                  | keep temporarily                                                        | phase 2+     | content marketing is optional, not a blocker for the rebuild                |
| `/legal/cookies`, `/legal/privacidad`, `/legal/terminos`                                                          | keep                                                                                        | same paths                                                              | phase 1      | canonical legal pages                                                       |
| `/holded/privacy`, `/holded/terms`                                                                                | redirect after legal consolidation                                                          | `/legal/privacidad`, `/legal/terminos`                                  | phase 1      | remove product-specific legal duplication                                   |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/verify-email`, `/auth/holded`                      | preserve temporarily, then normalize                                                        | `/acceder` plus internal auth flows                                     | phase 1 to 2 | current screens are still useful, but the public entry path should converge |
| `/health`                                                                                                         | keep internal only                                                                          | `/health`                                                               | ongoing      | operational route, not a public nav item                                    |

## 5. API Transition Matrix

### 5.1 Landing APIs

| Current API                                                   | Decision                            | Future state                                                            |
| ------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `/api/send-lead`                                              | keep and refactor                   | stays as the base lead capture endpoint                                 |
| `/api/support-ticket`                                         | keep and refactor                   | stays as public support and pre-sales intake                            |
| `/api/checkout`                                               | keep and refactor                   | remains public checkout entry, backed by `Order` draft creation         |
| `/api/dashboard-redirect`                                     | keep temporarily                    | remains useful for cross-subdomain handoff while access flow is unified |
| `/api/auth/session`, `/api/auth/logout`, `/api/auth/log-next` | preserve temporarily                | keep until `/acceder` and shared auth normalization are complete        |
| `/api/chat`                                                   | retire from the main public journey | replace with guided onboarding and structured commercial entry points   |
| `/api/stripe/webhook`                                         | retire after centralization         | move Stripe webhook ownership to tenant-aware backend handling          |

### 5.2 Tenant APIs in `apps/app`

| API group                                                                                            | Decision            | Notes                                                            |
| ---------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `/api/app/me`, `/api/session/tenant-switch`                                                          | reuse now           | already aligned with tenant-scoped state                         |
| `/api/onboarding/prefill`, `/api/onboarding/tenant`, `/api/onboarding/status`                        | reuse and extend    | good base for guided onboarding                                  |
| `/api/onboarding/start-trial`                                                                        | retire or repurpose | current trial semantics are tied to old landing flow             |
| `/api/integrations/accounting/*`                                                                     | reuse now           | first-class foundation for Holded activation and governance      |
| `/api/webhooks/stripe`                                                                               | reuse now           | likely best candidate for centralized billing webhook ownership  |
| `/api/invoices/*`, `/api/aeat/*`, `/api/isaak/*`, `/api/quotes/*`, `/api/expenses/*`, `/api/banks/*` | preserve for future | retain as workspace expansion surfaces, not phase-1 dependencies |

### 5.3 Admin APIs in `apps/admin`

| API group                                                                                                                              | Decision           | Notes                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| `/api/admin/tenants/*`, `/api/admin/users/*`, `/api/admin/support-sessions/*`, `/api/admin/accounting/route.ts`, `/api/admin/emails/*` | reuse now          | valid backoffice foundation                                       |
| `/api/admin/companies/*`                                                                                                               | compatibility only | retire after tenant-first normalization                           |
| missing marketplace APIs such as orders, fulfillment, claims, catalog and WhatsApp templates                                           | add new            | implement on top of admin control-plane patterns already in place |

## 6. Immediate Backlog by Folder

### 6.1 `apps/landing/app`

1. Replace current header/navigation with the canonical public IA.
2. Build new route groups for `servicios`, `integraciones`, `suscripciones`, `nosotros`, `contacto`, `acceder`.
3. Rewrite home page around service marketplace and guided onboarding, not Demo SL.
4. Convert legacy product pages into either canonical pages or redirect stubs.
5. Remove Demo SL from primary CTAs, trust messaging and success paths.
6. Keep legal pages canonical and map legacy legal variants to them.

### 6.2 `apps/landing/app/api`

1. Refactor checkout to create `Order` drafts and attach catalog metadata.
2. Add catalog read endpoints.
3. Add onboarding-start handoff endpoint.
4. Add custom integrations request endpoint.
5. Add WhatsApp entry endpoint.
6. Deprecate public freeform chat as the main acquisition mechanic.
7. Move Stripe webhook ownership away from landing.

### 6.3 `apps/app/app/api`

1. Add tenant order list and detail endpoints.
2. Add current subscription view and portal session endpoint.
3. Add tenant support ticket list/create endpoints.
4. Reuse existing Holded accounting endpoints for guided activation.
5. Normalize onboarding APIs away from trial/demo semantics.
6. Preserve invoice, AEAT, Isaak and operational APIs for later workspace expansion.

### 6.4 `apps/admin/app` and `apps/admin/app/api/admin`

1. Add orders queue.
2. Add fulfillment queue and assignment flow.
3. Add claims review and resolution queue.
4. Add catalog publish / pricing ops.
5. Add WhatsApp template and campaign management.
6. Keep tenant, user, support-session and audit surfaces as the control-plane base.

### 6.5 `packages/db/prisma`

1. Add `ServiceCategory`, `CatalogItem`, `CatalogPrice`.
2. Add `Order`, `OrderLine`, `FulfillmentCase`, `FulfillmentTask`.
3. Add `SupportTicket`, `SupportMessage`.
4. Add `WhatsAppThread`, `WhatsAppEvent`.
5. Add `CustomIntegrationRequest`.
6. Keep `Tenant` as canonical and stop extending `Company` for new platform features.

### 6.6 `packages/integrations`, `packages/auth`, `packages/ui`, `packages/utils`

1. Keep Stripe and Holded adapters as shared foundations.
2. Add WhatsApp provider abstraction.
3. Expose shared catalog and billing helper contracts.
4. Keep shared session and cookie contract for landing-to-app handoff.
5. Add shared `business` UI variants instead of duplicating landing-only primitives.

## 7. Deletion and Redirect Gates

Nothing should be physically removed until all gates below are true.

1. The canonical replacement route or API is live.
2. Internal navigation and CTAs no longer reference the legacy path.
3. Redirects are in place for user-facing routes.
4. Auth and session handoff have been tested across subdomains.
5. Analytics or logs show legacy traffic is near-zero for at least one release window.
6. For company-centric code, the tenant-first replacement is already shipping in production.

## 8. Recommended Delivery Order

1. `packages/db` schema extension and canonical billing/provisioning contracts. ✅ DONE
2. `apps/landing` public IA rebuild and redirect map. ✅ DONE (Paso 2 — rutas canónicas)
3. `apps/landing/app/api` catalog, checkout and onboarding-start refactor. ✅ DONE (Paso 3)
4. `apps/app/app/api` orders, subscriptions and support endpoints. ✅ DONE (Paso 4)
5. `apps/admin` orders, fulfillment and catalog queues. ✅ DONE (Paso 5)
6. **Landing public architecture phase 1, investor page, corporate email system.** ✅ DONE (Fase PublicArch-1)
7. **App real billing data integration + Isaak AI platform enablement.** ✅ DONE (Fase App-F3-A)
8. **Public MCP spec + API v1 OpenAPI contracts (developer docs).** ✅ DONE (Fase DevDocs)
9. **PDF QR VeriFactu generation + Fase 5 public developer portal.** ✅ DONE (Fase PDF+DevPortal)
10. Shared package refinements and WhatsApp adapter. ⏳
11. Claims review queue and admin support routing. ⏳
12. Legacy route retirement and company-centric cleanup. ⏳

## 9. Delivery Notes

### Paso 5: Admin Queues and Catalog Operations (May 2026)

**Scope:** Implement control-plane queues for orders, fulfillment, and catalog management. Admin operators can now:

- View and filter orders by status
- Manage fulfillment cases and assign tasks to staff
- Publish and manage catalog items and pricing

**Deliverables:**

1. **Orders Queue (`/admin/orders`)**
   - `apps/admin/app/(admin)/orders/page.tsx`: Table view with status badges, inline dropdown to change status (draft → pending → paid → active → provisioning → cancelled)
   - `apps/admin/app/(admin)/orders/[id]/page.tsx`: Detail page placeholder (full endpoint GET /api/admin/orders/[id] pending)
   - `apps/admin/app/api/admin/orders/route.ts`: GET (list + filter + pagination) and PATCH (update status)
   - Status flow: draft (new) → pending (awaiting payment) → paid (invoice sent to user) → active (subscription live) → provisioning (fulfillment in progress) → cancelled

2. **Fulfillment Queue (`/admin/fulfillment`)**
   - `apps/admin/app/(admin)/fulfillment/page.tsx`: Table with FulfillmentCase status, priority, and task assignment
   - `apps/admin/app/api/admin/fulfillment/route.ts`: GET (list + filter) and PATCH (update case status or assign task to staff member)
   - Case statuses: pending (new) → assigned (staff assigned) → in-progress (work started) → completed (fulfilled) / failed
   - Task counts display: "assigned_count/total_tasks" (e.g., "2/3" means 2 tasks assigned out of 3)

3. **Catalog Operations (`/admin/catalog`)**
   - `apps/admin/app/(admin)/catalog/page.tsx`: Browse CatalogItems by category, create new items, see active prices and featured status
   - `apps/admin/app/api/admin/catalog/route.ts`: GET (list + category filter + pagination) and POST (create/upsert item)
   - Form to create new service: name, slug (e.g., "suscripcion-pyme"), category (dropdown from DB), description (optional), featured toggle
   - Displays: item name, slug, category, active price variants (€XX/month, €XX/year), featured star, creation date

4. **Navigation Update**
   - `apps/admin/src/navAdmin.tsx`: Reorganized sections
     - **Operaciones:** Panel, Usuarios, Tenants, **Pedidos** (/orders, previously /admin-orders), **Fulfillment** (/fulfillment, Zap icon), Soporte
     - **Crecimiento:** **Catálogo** (/catalog, ShoppingBag icon), Marketing, Métricas
     - (Relaciones and Contenido sections unchanged)

**API Contracts:**

```
GET /api/admin/orders?status=pending&limit=50&offset=0
Response: { ok, orders: [...], pagination: { limit, offset, total, hasMore } }

PATCH /api/admin/orders
Body: { id, status, notes? }
Response: { ok, message, order: { id, status, updatedAt } }

GET /api/admin/fulfillment?status=pending&limit=50&offset=0
Response: { ok, cases: [...], pagination: {...} }

PATCH /api/admin/fulfillment
Body: { id, status? } OR { id, taskId, assignedTo?, taskStatus? }
Response: { ok, message, case/task: {...} }

GET /api/admin/catalog?category=suscripciones&limit=50&offset=0
Response: { ok, items: [...], categories: [...], pagination: {...} }

POST /api/admin/catalog
Body: { name, slug, categorySlug, description?, featured?, active? }
Response: { ok, message, item: { id, name, slug, categorySlug } }
```

**What's Not Yet Implemented:**

- GET /api/admin/orders/[id] (detail endpoint; page shows placeholder)
- Claims review queue (Paso 6)
- WhatsApp template management (Paso 6)
- Detailed task assignment UI (currently just shows count; full Kanban board deferred)
- Catalog pricing CRUD (only items are handled; prices use existing CatalogPrice read)

**Testing Checklist:**

- [ ] List orders with status filter (all statuses show correct count)
- [ ] Change order status from admin UI (persists in DB)
- [ ] List fulfillment cases by priority and task assignment rate
- [ ] Assign tasks to staff (case status updates to "assigned")
- [ ] List catalog items, create new item, see it appear in listing
- [ ] Category filter on catalog works (shows filtered items + category list)

**Tech Stack Used:**

- Next.js 15 App Router (Typescript)
- React "use client" components with fetch + useState/useEffect
- Prisma ORM (read/write Order, FulfillmentCase, FulfillmentTask, CatalogItem, CatalogCategory)
- Tailwind CSS + Lucide icons (Package, Zap, ShoppingBag)
- `requireAdminContext` for auth guard

## 10. Extended Phases: Landing Public Ecosystem + App Integration

### Fase PublicArch-1: Landing Public Architecture Phase 1 + Investor Page (May 2026)

**Scope:** Build public-facing marketing architecture, investor page, and corporate email system.

**Deliverables:**

1. **Landing Public Hub Phase 1 (`LandingPublicHubPhase1.tsx`)**
   - Central navigation component for landing website
   - Routes: Servicios, Integraciones, Suscripciones, Developers, Contacto
   - Consolidated navigation (no more fragmented product trees)

2. **New Landing Route Family**
   - `/asesorias` — consulting services marketplace
   - `/conectores` — integrations catalog hub
   - `/modo-excel` — Excel-native mode for non-technical users
   - `/modos` — collection of operational modes

3. **Investor Teaser Page (`/inversores`)**
   - `apps/landing/app/inversores/page.tsx`: 9-section investor acquisition page
     - Hero · Oportunidad · Tesis · Ecosistema · Tracción · Modelo · Mercado · Buscamos · Contacto
   - `apps/landing/app/inversores/InvestorContactForm.tsx`: Client-side contact form for investor inquiries
   - Disclaimer footer (investor risk disclosure)
   - Footer link added: Empresa → Inversores

4. **Corporate Email System (Branded Variants)**
   - `apps/landing/app/lib/emailTemplates.ts`: Shared branded email module
     - 3 variants: comercial | inversores | soporte (badge/color theming)
     - Export: `renderCorporateBrandedEmail()`, `renderCorporatePlainTextEmail()`
   - `apps/landing/app/lib/leadIntake.ts`: Lead-aware, branded HTML+text routing
     - Configurable reply_to via `LANDING_REPLY_TO_EMAIL` env var
   - `/api/support-ticket/route.ts`: Branded soporte template, configurable reply-to

5. **Holded Connector Public Hub**
   - Connector landing pages (ConnectorLandingClient, ConnectorSupportPage)
   - `/conectores` route with subroutes: docs, privacy, soporte, sitemap
   - HoldedSiteChrome + layout updated for public hub

6. **Isaak Orchestrator Public Hub**
   - IsaakPublicPhase1Landing.tsx orchestrator page
   - Routes: `/asesorias`, `/conectores`, `/modos` with sitemaps
   - IsaakSiteChrome + layout updated

**Impact:** Marketing top-of-funnel now supports three entry paths: services marketplace, integrations catalog, investor outreach. Branded email creates consistent corporate presence across lead capture.

---

### Fase App-F3-A: App Real Billing Data Integration + Isaak Platform Enablement (May 2026)

**Scope:** Replace hardcoded mock billing with real TenantSubscription data. Enable Isaak AI for all dashboard surfaces.

**Deliverables:**

1. **Real Billing Data in Settings**
   - `apps/app/app/lib/settings.ts`: `loadBillingData()` function
     - Loads TenantSubscription for tenant (copies isaak/lib/settings pattern)
   - `apps/app/app/api/settings/billing/route.ts`: GET endpoint (query param: `tenantId`)
     - Returns SettingsBillingData: plan name, trial/renewal dates, payment method, invoices
   - `apps/app/app/dashboard/settings/page.tsx`: Real subscription display
     - Replaces mock (Plan Profesional 99€, Mastercard 4242)
     - Shows actual plan, dates, payment method from database

2. **Isaak AI Platform Enablement**
   - `apps/app/components/layout/Sidebar.tsx`: Support action items
     - Items with `action === 'openIsaak'` render as buttons (not links)
     - onClick triggers `openDrawer()` from useIsaakUI
   - `apps/app/config/nav.ts`: Add `action?: 'openIsaak'` to NavItem type
     - Isaak AI nav item now carries `action: 'openIsaak'` instead of `/dashboard/isaak`
   - `apps/app/app/dashboard/DashboardClientLayout.tsx`: Enable Isaak on all non-admin routes
     - `enableIsaak = !minimalAdminMode` (was false)
     - Activates: IsaakSmartFloating, IsaakDrawer, IsaakProactiveBubbles, IsaakDeadlineNotifications
     - Tenant workspace now has AI co-pilot throughout entire dashboard

**Impact:** Panel avanzado (apps/app) now displays real billing state, increasing credibility. Isaak becomes ambient AI assistant for all tenant operators (not just Isaak app users). Subscription transparency enables upsell/downgrade flows.

---

### Fase DevDocs: Canonical MCP Server Spec + API v1 OpenAPI Contract (May 2026)

**Scope:** Document the Isaak Platform as public developer surface with MCP and REST API contracts.

**Deliverables:**

1. **`docs/isaak/ISAAK_MCP_SERVER_SPEC.md`** — Canonical MCP Server Specification
   - Protocol: JSON-RPC 2.0 / MCP 2024-11-05
   - Endpoint: POST `/api/mcp/isaak` in apps/app
   - Authentication: OAuth2 PKCE | shared secret | anonymous (initialize + tools/list)
   - 9 scopes fully documented (company_read, invoices_write, invoices_issue, etc.)
   - All methods: initialize, tools/list, tools/call with example requests
   - 9 tools with scope, risk level, requires_confirmation flag
   - Two-step confirmation flow for `isaak_issue_verifactu_invoice` (irreversible action)
   - Claude Desktop config JSON (OAuth + shared secret)
   - JSON-RPC error codes table
   - Source file references

2. **`docs/isaak/ISAAK_API_V1_OPENAPI.yaml`** — Public REST API Contract
   - OpenAPI 3.1 specification
   - Base URL: `https://app.verifactu.business/api/v1`
   - 10 endpoints fully specified:
     - `GET /companies/current` — current company context
     - `GET /invoices`, `POST /invoices` — list and create invoices
     - `GET /invoices/{id}` — retrieve single invoice
     - `POST /invoices/{id}/validate` — validation endpoint
     - `POST /invoices/{id}/issue` — two-step issuance (202 → 200)
     - `GET /invoices/{id}/verifactu-status` — VeriFactu validation status
     - `GET /invoices/{id}/pdf` — PDF download
     - `GET /audit/events` — audit log
     - `GET /keys`, `POST /keys`, `DELETE /keys/{id}` — API key management
   - Strict schemas: all request/response bodies with types
   - SecuritySchemes: BearerApiKey + SessionCookie
   - Tags: company, invoices, verifactu, audit, keys

**Impact:** Developers now have canonical reference for integrating with Isaak Platform. MCP enables Claude/AI integrations natively. REST API unifies programmatic access with clear versioning and security model.

---

### Fase PDF+DevPortal: PDF QR VeriFactu Generation + Public Developer Portal (May 2026)

**Scope:** Add automatic AEAT verification QR codes to invoices. Launch public developer portal with quickstart + endpoint table.

**Deliverables:**

1. **PDF QR VeriFactu Auto-Generation**
   - `apps/app/lib/isaak-platform/pdf/invoicePdfBuilder.ts`: QR generation logic
     - If invoice has `verifactuQr` (data URL): use it directly
     - If not: build AEAT verification URL and generate QR with qrcode library
     - Format: `/ValidarQR?nif=...&numserie=...&fecha=DD-MM-YYYY&importe=...`
     - QR rendered 100×100px bottom-right of VeriFactu section
     - Label: "Verificar en AEAT"
     - QR + logo resolved in parallel (Promise.all) before PDF stream
   - Dependencies: `qrcode` ^1.5.4, `@types/qrcode` ^1.5.6
   - `scripts/generate-example-invoice-pdf.mjs`: Standalone script uses same QR logic
   - Example: `docs/examples/factura-ejemplo-verifactu-v2.pdf` with live QR

2. **Public Developer Portal (`/developers`)**
   - `apps/landing/app/developers/page.tsx`: Public developer hub
     - **Hero:** Isaak Platform API · Beta
     - **Auth section:** Bearer tokens (live/test), two-step confirmation for AEAT
     - **Quickstart:** curl examples (list, create draft, issue)
     - **Endpoints table:** 10 endpoints with method, path, description, scope
     - **MCP section:** config JSON + 9 available tools
     - **CTA:** Create account / Talk to team
   - Footer link added: Empresa → Developers
   - Sitemap entry: `/developers` (priority 0.8)

**Impact:** End users can now verify invoices via AEAT QR code in PDF. Developers get low-friction entry point with examples and specs. QR generation is transparent—no user action required.

---

### Paso 2 Extended: Landing Canonical Routes + Legacy Redirects (May 2026)

**Scope:** Establish canonical route tree. Redirect all legacy marketing URLs.

**Deliverables:**

1. **Canonical Route Family**
   - `/servicios` — VeriFactu, Isaak, Modo Excel, Migraciones, Asesorías
   - `/integraciones` — Holded, Isaak nativo, API/MCP, WhatsApp
   - `/suscripciones` — Plans comparison table (Básico 19€, Pyme 39€, Empresa 69€, Pro 99€)
   - `/contacto` — redirect to `/recursos/contacto` (unified flow pending)
   - `/acceder` — canonical login entry point (redirect from `/auth/login`)

2. **Legacy Redirect Map**
   - `/planes` → `/suscripciones`
   - `/producto/plataforma` → `/`
   - `/producto/resumen` → `/`
   - `/recursos/contacto` → `/contacto`
   - `/holded/privacy` → `/legal/privacidad`
   - `/holded/terms` → `/legal/terminos`
   - `/que-es-isaak` → `/integraciones/holded-chatgpt` (after content reuse)

3. **Navigation + Sitemap**
   - LandingPublicHubPhase1 nav updated to canonical routes (Servicios/Integraciones/Suscripciones/Developers/Contacto)
   - `sitemap.ts` cleaned: legacy routes removed, canonical routes added with correct priorities

**Impact:** Single marketing URL namespace. Users land on correct funnel. SEO consolidates under canonical routes.

---

### Paso 3 Extended: Landing APIs — Catalog, Onboarding, Custom Integrations (May 2026)

**Scope:** Connect landing to tenant platform via three new public APIs.

**Deliverables:**

1. **`/api/catalog` (GET)**
   - List published CatalogItems with active CatalogPrices
   - Filters: `category` (slug), `featured`, `type`
   - Decimal-to-string serialization for JSON
   - Returns: `{ ok, items: [...], categories: [...] }`

2. **`/api/onboarding-start` (POST)**
   - Create Order draft linked to requested planId
   - Search CatalogItem by slug (`suscripcion-{planId}`)
   - Create OrderLine if catalog is seeded; else return draft without line
   - Resolve user session if cookie exists
   - Returns: `{ redirectUrl: 'app.verifactu.business/onboarding', orderId }`

3. **`/api/custom-integration-request` (POST)**
   - Persist CustomIntegrationRequest to DB
   - Rate limit: 3 req/hour per IP
   - Link user session if exists
   - Fields: contactName, contactEmail, companyName, title, summary, requestedSystems, businessGoals, budgetRange, urgency

**Impact:** Marketing can now guide visitors through signup funnel. Custom integration requests captured for sales team. Landing handoff to app is transparent to user.

---

### Paso 4 Extended: Tenant Dashboard — Orders, Support, Real Billing (May 2026)

**Scope:** Give tenant operators full visibility into platform state: orders placed, support tickets, subscription details.

**Deliverables:**

1. **Orders Dashboard**
   - `apps/app/app/dashboard/orders/page.tsx`: List with pagination (limit=50), status badges, formatAmount/formatDate
   - `apps/app/app/dashboard/orders/[id]/page.tsx`: Order detail (name, email, channel, items, totals, dates)
   - Skeleton loader, empty state CTA → /suscripciones
   - Status flow visible: draft → pending → paid → active → provisioning → cancelled / failed

2. **Support Dashboard**
   - `apps/app/app/dashboard/support/page.tsx`: Tenant support tickets
   - Uses existing `/api/support/tickets` endpoints (GET/POST)
   - Create form + list with pagination
   - Ticket status tracking

3. **Real Billing Settings**
   - Subscription page shows actual plan, renewal date, payment method
   - Links to Stripe portal for billing updates
   - Transparent pricing: no more mock data

4. **Navigation**
   - `apps/app/config/nav.ts` updated: Mis pedidos + Soporte entries
   - Isaak AI nav item → opens IsaakSmartFloating (action: 'openIsaak')

**Impact:** Tenant can now track orders, get help, and manage subscription without going to email. Billing transparency builds trust.

---

## 11. Practical Summary

The rebuild is **running as a controlled migration**, not a blind redesign.

- ✅ **Reused strong pieces immediately:** Tenant model, Holded adapter, Stripe webhook foundation, auth patterns
- ✅ **Froze valuable dashboard depth for later:** Invoice, AEAT, banking, expenses modules preserved untouched
- ✅ **Redirected and retired only after replacement exists:** All landing route transitions backed by new pages or APIs

That keeps the product **additive instead of destructive**, and prevents the rebuild from breaking real platform value already in the repo.

**Current Status (May 2026):**

- ✅ Pasos 1-5 + Fases PublicArch-1, App-F3-A, DevDocs, PDF+DevPortal completed
- ⏳ Remaining: WhatsApp adapter, claims queue, legacy cleanup (Pasos 6-8)
