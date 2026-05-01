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
2. `apps/landing` public IA rebuild and redirect map. ✅ DONE (Paso 2)
3. `apps/landing/app/api` catalog, checkout and onboarding-start refactor. ✅ DONE (Paso 3)
4. `apps/app/app/api` orders, subscriptions and support endpoints. ✅ DONE (Paso 4)
   - Dashboard pages: `/dashboard/orders`, `/dashboard/orders/[id]`, `/dashboard/support`
   - Nav updated: Mis pedidos + Soporte entries added
   - Isaak AI nav item → opens IsaakSmartFloating sidebar (enabled: `enableIsaak = !minimalAdminMode`)
5. `apps/admin` orders, fulfillment and claims queues. ⏳ NEXT
6. Shared package refinements and WhatsApp adapter. ⏳
7. Legacy route retirement and company-centric cleanup. ⏳

## 9. Practical Summary

The rebuild should be run as a controlled migration, not as a blind redesign.

- reuse the strong pieces immediately
- freeze valuable dashboard depth for later phases
- redirect and retire only when the new route or backend contract already exists

That keeps the product additive instead of destructive, and prevents the landing rebuild from breaking the real platform value already present in the repo.
