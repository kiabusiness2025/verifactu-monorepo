# Holded Public Landings E2E Audit

Date: 2026-04-30

Scope audited:

- `https://holded.verifactu.business/`
- `https://holded.verifactu.business/conectores/chatgpt`
- `https://holded.verifactu.business/conectores/claude`
- Related demo, support, auth, onboarding, email, admin-reporting, database-persistence, modal, popup, close, and back-navigation flows.

Audit status: `NOT_READY_FOR_OPENAI_RESUBMISSION`

Reason: the public routes are mostly present, but there are several release blockers before using the pages for OpenAI review, especially demo recording reliability, ChatGPT review-scope copy, support form behavior, a hardcoded secret in repo tooling, and unresolved local build/runtime validation issues.

## Executive Summary

The three public landings already cover the main product story and most required routes exist. The site has a coherent general direction: Holded as a connector hub, with dedicated ChatGPT and Claude connector landings, support routes, legal routes, demo pages, login, onboarding, profile completion, and admin notification/email infrastructure.

However, the current public copy and some CTA targets still mix broad product capabilities with the narrower OpenAI review scope. For the OpenAI re-submit, this is risky because the ChatGPT landing advertises modules such as projects, HR, time records, products, warehouses, CRM/leads, and broad "complete access" style wording, while the submitted review pack should focus only on invoices, contacts, accounting accounts, daily ledger with date range, and invoice draft creation with explicit confirmation.

The biggest operational issue is the demo recording URL. The submitted URL `/demo-recording` exists, but its current implementation expects several demo clip files under `/demo/*.mp4` that are not present in the public assets. The actual video file exists under `/video/holded-chatgpt-demo.mp4`, and the dedicated OpenAI review route `/conectores/chatgpt/openai-review-demo` already uses it. The submitted `/demo-recording` URL must remain live and should be changed to render the same working OpenAI review video or redirect to the review demo page.

There is also a support-form gap: the ChatGPT support page exists and opens Isaak in a separate standalone window, which is correct, but its embedded support form posts to an AI support endpoint instead of creating a real support ticket or sending a support/admin email. The UI says the message was received and support will respond by email, but the current flow does not guarantee that.

## Route Map

### Public hub and connector pages

- `/` maps to `apps/holded/app/page.tsx`
- `/conectores/chatgpt` maps to `apps/holded/app/conectores/chatgpt/page.tsx`
- `/conectores/claude` maps to `apps/holded/app/conectores/claude/page.tsx`
- Both connector pages use `apps/holded/app/components/ConnectorLandingClient.tsx`

### Demo routes

- `/demo-recording` maps to `apps/holded/app/demo-recording/page.tsx`
- `/conectores/chatgpt/openai-review-demo` maps to `apps/holded/app/conectores/chatgpt/openai-review-demo/page.tsx`
- `/demo` maps to `apps/holded/app/demo/page.tsx`
- `/holded/demo-recording` maps to `apps/holded/app/holded/demo-recording/page.tsx`
- `/holded/demo` maps to `apps/holded/app/holded/demo/page.tsx`

### Support routes

- `/support` maps to `apps/holded/app/support/page.tsx`
- `/support/chat` maps to `apps/holded/app/support/chat/page.tsx`
- `/conectores/chatgpt/soporte` maps to `apps/holded/app/conectores/chatgpt/soporte/page.tsx`
- `/conectores/chatgpt/soporte/SoporteForm.tsx` contains the ChatGPT connector support form

### Auth, connection, onboarding, and profile routes

- `/auth/holded` maps to `apps/holded/app/auth/holded/page.tsx`
- `/onboarding/holded` maps to `apps/holded/app/onboarding/holded/page.tsx`
- `/onboarding/profile` maps to `apps/holded/app/onboarding/profile/page.tsx`
- `/api/auth/session` creates/updates user, tenant, membership, preferences, cookie, and activity
- `/api/auth/register` creates/updates user, tenant, membership, tenant profile, preferences, verification email, welcome email, and admin notification
- `/api/holded/connect` validates the Holded connection, persists the external connection, and sends user/admin communications

### Admin and reporting routes

- `/admin`, `/admin/activity`, and `/admin/connections` redirect to `admin.verifactu.business`
- `/api/admin/weekly-summary` sends weekly admin summaries

## Priority P0 - Release Blockers

### P0.1 - Submitted `/demo-recording` URL does not currently show the real recording

Current state:

- The URL `/demo-recording` exists.
- It uses `DemoVideoGrid`.
- `DemoVideoGrid` expects public files such as:
  - `/demo/holded-overview-16x9.mp4`
  - `/demo/holded-facturas-16x9.mp4`
  - `/demo/holded-contactos-16x9.mp4`
  - `/demo/holded-contabilidad-16x9.mp4`
  - `/demo/holded-proyectos-16x9.mp4`
- These MP4 files were not found in `apps/holded/public/demo`.
- The actual available recording is:
  - `/video/holded-chatgpt-demo.mp4`
  - `/video/Video Holded App 1.mp4`
- The route `/conectores/chatgpt/openai-review-demo` already uses `/video/holded-chatgpt-demo.mp4`.

Impact:

- The OpenAI form already references `https://holded.verifactu.business/demo-recording`.
- If the reviewer opens that URL, they may see placeholders instead of the submitted demo recording.
- This can directly cause rejection.

Recommended fix:

- Keep `/demo-recording` live.
- Make `/demo-recording` render the same working video as `/conectores/chatgpt/openai-review-demo`, or redirect permanently/temporarily to `/conectores/chatgpt/openai-review-demo`.
- Do not remove or rename `/demo-recording`.
- Use `/conectores/chatgpt/openai-review-demo` as the preferred new demo URL only after verifying the old URL still works.

Priority: P0

### P0.2 - ChatGPT connector landing overpromises the OpenAI review scope

Current state:

- The shared connector landing advertises broad capabilities, including projects, HR, time records, employees, products, warehouses, CRM/leads, and "Acceso completo a Holded, en lenguaje natural."
- These capabilities are not part of the intended OpenAI review scope.
- The review scope should be limited to:
  - invoices
  - invoice details
  - contacts
  - contact details
  - accounting accounts
  - daily ledger with explicit date range
  - invoice draft with explicit confirmation

Impact:

- OpenAI reviewers may test capabilities advertised on the public landing but not included in the deterministic test cases.
- The page may be interpreted as promising broader behavior than the submitted tool/test pack.

Recommended fix:

- Change the main capability heading to: "Trabaja con datos clave de Holded en lenguaje natural."
- Hide the broad modules from the ChatGPT review landing or move them into a clearly separated note:
  - "Additional modules are being validated and are not part of this OpenAI review scope."
- Remove or de-emphasize:
  - RRHH
  - warehouses
  - CRM/leads
  - project tasks
  - time records
  - products
  - broad project operations
- Keep only the review-safe modules visible for ChatGPT review:
  - invoices
  - contacts
  - accounting accounts
  - daily ledger with date range
  - invoice draft with confirmation

Priority: P0

### P0.3 - ChatGPT support form does not create a real support ticket or support email

Current state:

- `/conectores/chatgpt/soporte` exists and is the right support URL pattern.
- The page correctly opens Isaak in a standalone `/support/chat` window with a prefilled support prompt.
- The embedded `SoporteForm` posts to `/api/isaak/support`, which is an AI support-response endpoint.
- The UI displays a success message that implies human support will reply by email.
- No confirmed ticket persistence, admin email, or support email flow was found for this form.
- Attachments are likely broken:
  - The form accepts PDFs but only serializes image files.
  - The client code uses `Buffer` in the browser.
  - It sends `imageAttachments`, while the support endpoint expects a different payload shape.

Impact:

- Users may believe they opened a real support request, but no support ticket/admin notification may be created.
- The flow is inconsistent with the requested "flujos de correos de las actividades de usuarios con informes al Admin".
- This is risky for production support and for reviewer confidence.

Recommended fix:

- Replace the form endpoint with a real support-ticket endpoint.
- Persist `SupportTicket` and `SupportMessage`.
- Send an admin notification to the configured support/admin inbox.
- Send a confirmation email to the user when an email address is available.
- If attachments are not ready, remove the attachment UI or mark it unavailable.
- Keep Isaak chat as a separate standalone help option, not as the same flow as human support.

Priority: P0

### P0.4 - Hardcoded Holded API key exists in repo tooling

Current state:

- A hardcoded Holded API key was found in a video-pipeline configuration file.
- The value must not be printed, committed again, included in reports, or reused in logs.

Impact:

- This is a credential leak risk.
- The demo key should be treated as exposed.

Recommended fix:

- Remove the hardcoded key from repo tooling.
- Load the key from an environment variable only.
- Rotate the demo Holded key after testing.
- Add a secret scan to CI or pre-release checks.

Priority: P0

### P0.5 - Local app validation is currently not clean

Current state:

- A targeted TypeScript check for recently changed support/chat files passed.
- Full `verifactu-holded` TypeScript validation is not clean due pre-existing unrelated errors in generated validator output, purchases route/tests, and onboarding imports.
- A local dev server attempt failed because `.next/trace` could not be opened.
- An existing server on port 3001 returned HTTP 500 even for `/`.

Impact:

- A browser-based full E2E audit could not be completed locally.
- Manual verification on production/staging is required before re-submit.

Recommended fix:

- Fix or isolate the existing full typecheck failures.
- Restart a clean local/staging process.
- Run link, form, auth, support, demo, and onboarding QA against a clean deployment.

Priority: P0

## Priority P1 - High Priority Consistency Fixes

### P1.1 - Root hub says "Solo lectura - no modifica tu cuenta"

Current state:

- The root hub includes wording equivalent to "Solo lectura - no modifica tu cuenta de Holded".
- The product also supports creating invoice drafts after explicit confirmation.

Impact:

- This can look contradictory to OpenAI and to users.

Recommended fix:

- Use: "Solo lectura por defecto - los borradores requieren tu confirmacion."
- Keep the explanation that invoice drafts are the only supported write action in the reviewed scope.

Priority: P1

### P1.2 - Root hub and ChatGPT copy still mention API-key/GPT Action behavior

Current state:

- Some root copy says the ChatGPT connector is a GPT Action/API key setup.
- The current submission copy says credentials are stored server-side through Verifactu and never exposed to ChatGPT/client.

Impact:

- The public page and submission notes may describe different credential models.
- This can confuse users and reviewers.

Recommended fix:

- Normalize the public copy to:
  - secure Verifactu-hosted connection flow
  - credentials stored server-side
  - credentials not exposed to ChatGPT or the browser client
- If there are still two flows, label the legacy API-key flow as legacy/internal and keep it out of OpenAI review pages.

Priority: P1

### P1.3 - `/conectores/claude/terms` appears to be missing

Current state:

- The Claude connector config points to `/conectores/claude/terms`.
- That route was not found.

Impact:

- Footer/legal link on the Claude landing may 404.

Recommended fix:

- Add `/conectores/claude/terms`, or point the Claude landing to the existing generic `/terms` route.
- Verify `/conectores/claude/privacy` and `/conectores/claude/docs` too.

Priority: P1

### P1.4 - Claude CTA points to `/claude`, which appears to be a product/mock flow

Current state:

- The Claude connector connect CTA uses `/claude`.
- That page appears to be a Claude-style app surface that asks for a Holded API key, not necessarily a verified connector authorization flow.

Impact:

- Users may leave the connector landing into a different product experience.
- It may not match the expected "exclusive to connector" CTA behavior.

Recommended fix:

- Decide the canonical Claude connector flow.
- If the real flow is docs-first, point "Conectar" to `/conectores/claude/docs`.
- If the real flow is onboarding-first, point it to the corresponding onboarding route with connector/channel parameters.
- Keep any mock/demo UI clearly labeled as demo.

Priority: P1

### P1.5 - OpenAI review demo page still mentions projects/hours

Current state:

- `/conectores/chatgpt/openai-review-demo` is the best candidate for the new demo URL.
- It includes a flow item mentioning projects and hours.

Impact:

- The dedicated OpenAI review demo page still leaks out-of-scope capabilities.

Recommended fix:

- Replace the projects/hours item with review-safe flows:
  - invoice list/details
  - contact list/details
  - accounting accounts
  - daily ledger with explicit date range
  - draft invoice with confirmation

Priority: P1

### P1.6 - "Sin datos almacenados" trust copy is misleading

Current state:

- The connector landing includes a trust chip saying "Sin datos almacenados".
- The app does persist users, tenants, memberships, preferences, connection records, onboarding/profile data, demo requests, activity logs, and possibly credential metadata/key material.

Impact:

- This can be seen as inaccurate.

Recommended fix:

- Replace with a more accurate claim:
  - "Credenciales protegidas server-side"
  - "Datos de negocio consultados bajo demanda"
  - "Tenant-scoped access"

Priority: P1

### P1.7 - Weekly admin summary route should require a secret in production

Current state:

- `/api/admin/weekly-summary` checks `CRON_SECRET` only if it is configured.
- If `CRON_SECRET` is not configured, the route can be triggered without authorization.

Impact:

- Anyone could trigger admin summary email generation if the route is public and the secret is missing.

Recommended fix:

- Require `CRON_SECRET` in production.
- Return 500/disabled if the secret is missing in production.
- Keep relaxed behavior only in local development.

Priority: P1

### P1.8 - Email events are not consistently persisted

Current state:

- The Prisma schema includes `EmailEvent`.
- The Holded email service sends several transactional emails, but no consistent `EmailEvent` persistence was confirmed.

Impact:

- Admin reporting and auditability of user communications are incomplete.

Recommended fix:

- Log outbound email attempts and results to `EmailEvent`.
- Track email type, provider, recipient hash or recipient when allowed, status, and related user/tenant.

Priority: P1

## Priority P2 - Product and UX Improvements

### P2.1 - Shared connector landing config causes ChatGPT and Claude copy to drift together

Current state:

- ChatGPT and Claude pages share `ConnectorLandingClient`.
- Several capabilities and labels are shared.

Impact:

- It is easy to accidentally expose ChatGPT-only review copy on Claude or broad Claude copy on ChatGPT.

Recommended improvement:

- Add connector-specific capability filters.
- For ChatGPT OpenAI review, render a strict review-safe capability set.
- For Claude, render only Claude-specific CTAs and docs.

Priority: P2

### P2.2 - Profile completion flow lacks a clear "back" control between steps

Current state:

- The conversational profile onboarding stores drafts and advances through steps.
- A clear step-back option was not found in the profile questionnaire UI.

Impact:

- Users may have to restart or skip if they entered a wrong answer.

Recommended improvement:

- Add an "Anterior" action where it does not break the conversation state.
- Keep "Cerrar" or "Volver al conector" visible where appropriate.

Priority: P2

### P2.3 - Capability modal close control needs accessibility polish

Current state:

- The modal has a visible close button and backdrop close.
- The close button should have a clear accessible label.

Impact:

- Minor accessibility issue.

Recommended improvement:

- Add `aria-label="Cerrar"` to modal close buttons.
- Verify Escape key handling on every modal.

Priority: P2

### P2.4 - Some public copy appears to have mojibake/encoding artifacts

Current state:

- Several files showed garbled Spanish accents in terminal output.

Impact:

- If these are present in browser output, they reduce trust.

Recommended improvement:

- Verify rendered pages in browser.
- Normalize file encoding to UTF-8 where needed.

Priority: P2

## Hub Landing Audit - `/`

Current strengths:

- The hub clearly presents Holded as the connector family.
- It separates Claude and ChatGPT cards.
- It includes legal, docs, demo, and contact/support style links.
- It already mentions invoice drafts with confirmation in at least one feature block.

Issues:

- The root claim "Solo lectura - no modifica tu cuenta de Holded" conflicts with draft invoice creation.
- ChatGPT connector setup is described as GPT Action/API key in some copy, while the submission says secure server-side Verifactu connection.
- Some hub features mention projects or broad analysis not included in OpenAI review.
- "Ver demo gratis" points to `/demo`, which is a demo request form, not the actual OpenAI review recording.

Recommended copy:

- Replace "Solo lectura - no modifica tu cuenta de Holded" with:
  - "Solo lectura por defecto - los borradores requieren tu confirmacion."
- Replace broad ChatGPT setup copy with:
  - "Conecta tu cuenta de Holded a ChatGPT mediante un flujo seguro alojado por Verifactu. Las credenciales se guardan server-side y no se muestran a ChatGPT ni al cliente."
- Add a visible OpenAI review demo link:
  - `/conectores/chatgpt/openai-review-demo`
- Keep `/demo-recording` working because it has already been submitted.

## ChatGPT Connector Landing Audit - `/conectores/chatgpt`

Current strengths:

- The page has a complete landing structure.
- It has CTAs, docs links, demo modal, privacy/terms links, and support links.
- It explains that invoice drafts require confirmation.
- It supports an independent support route at `/conectores/chatgpt/soporte`.

Issues:

- Copy is too broad for OpenAI review.
- The capabilities list includes out-of-scope modules.
- The heading "Acceso completo a Holded, en lenguaje natural" is too risky.
- Demo modal is not the same as a stable video-recording URL.
- "Sin datos almacenados" is inaccurate.

Recommended ChatGPT review-safe copy:

- Main capability heading:
  - "Trabaja con datos clave de Holded en lenguaje natural."
- Scope note:
  - "For this OpenAI review, the supported scope is limited to invoices, contacts, accounting accounts, daily ledger entries with explicit date range, and invoice draft creation with explicit confirmation."
- Safety note:
  - "Read-only by default. Creating an invoice draft requires explicit confirmation and does not send, issue, charge, email, finalize, delete, or overwrite records."

Recommended CTA set:

- Primary:
  - "Como conectar" -> `/conectores/chatgpt/docs`
- Secondary:
  - "Ver demo de revision OpenAI" -> `/conectores/chatgpt/openai-review-demo`
- Support:
  - "Soporte ChatGPT" -> `/conectores/chatgpt/soporte`
- Legal:
  - "Privacidad" -> `/conectores/chatgpt/privacy` or canonical `/privacy`
  - "Terminos" -> `/conectores/chatgpt/terms` or canonical `/terms`

## Claude Connector Landing Audit - `/conectores/claude`

Current strengths:

- Dedicated Claude landing exists.
- It shares a polished connector page structure.
- It has docs and support-oriented links.

Issues:

- Claude config points to `/conectores/claude/terms`, which appears missing.
- The primary connect CTA points to `/claude`, which may not be the canonical connector authorization/onboarding flow.
- Shared broad capability copy may overpromise or mix product surfaces.

Recommended fixes:

- Add/fix Claude legal routes.
- Define the canonical Claude connector onboarding URL.
- Filter capabilities to Claude-supported, deterministic features.
- Avoid reusing OpenAI review-specific wording on Claude unless the Claude connector has the same verified behavior.

## Demo and Recording Audit

Current state:

- `/conectores/chatgpt/openai-review-demo` exists and has a working local video fallback path.
- `/video/holded-chatgpt-demo.mp4` exists.
- `/demo-recording` exists but references missing segmented demo clips.
- Legacy `/holded/demo-recording` uses a different video path.

Required release behavior:

- `https://holded.verifactu.business/demo-recording` must keep working because it is already in the OpenAI submission form.
- `https://holded.verifactu.business/conectores/chatgpt/openai-review-demo` is the better long-term review URL.

Recommended fix:

- Make `/demo-recording` render the same content/video as `/conectores/chatgpt/openai-review-demo`.
- Keep the direct video URL available:
  - `/video/holded-chatgpt-demo.mp4`
- Remove or hide missing clip-grid placeholders until those clips exist.

## Support, Chat, and Human Contact Audit

Current state:

- Generic `/support` exists.
- Standalone `/support/chat` exists and is not embedded inside the landing chrome.
- The floating Isaak button opens standalone chat, which matches the current product decision.
- ChatGPT-specific support exists at `/conectores/chatgpt/soporte`.
- ChatGPT-specific support can open Isaak with a prefilled support prompt.

Main gap:

- The ChatGPT support form does not appear to create a real support ticket or send support/admin email.

Recommended support model:

- Isaak chat:
  - Standalone, separate window/tab.
  - Useful for instant guidance.
  - Clearly not the same as opening a human ticket.
- Human support form:
  - Creates `SupportTicket`.
  - Creates initial `SupportMessage`.
  - Sends admin email.
  - Sends user confirmation email.
  - Requires or captures reply email if user is not logged in.
  - Supports attachments only after storage and malware/size validation are implemented.

## Login, Close, Back, and Resend Audit

Current strengths:

- `/auth/holded` supports email magic link.
- It supports password login fallback.
- It supports password reset.
- It includes resend for magic links.
- It includes "Cambiar correo".
- It includes "Volver".
- Popup close behavior exists through `exitHoldedAuth`.
- Google login is feature-flagged.
- Session creation persists user, tenant, membership, preferences, and activity.

Issues and recommendations:

- Some copy is optimized for public signup and may not be ideal inside ChatGPT review flows.
- If `mode=register` is used by URL builders, confirm the auth page actually changes behavior for that mode.
- For ChatGPT OAuth/connector popup flows, ensure "Volver" returns to the expected origin or closes the popup when possible.
- Confirm magic-link callback behavior on mobile where popup/window behavior differs.
- Confirm resend rate limiting and user-visible error states.

Manual QA required:

- Login with email magic link on desktop.
- Login with email magic link on mobile.
- Resend magic link.
- Change email after magic link sent.
- Password reset.
- Close popup from ChatGPT web flow.
- Return/back from ChatGPT mobile flow.

## Onboarding and Profile Completion Audit

Current strengths:

- `/onboarding/holded` requires session.
- ChatGPT API-only flow starts directly at Holded credential/API-key validation.
- Connection endpoint validates the Holded connection before persisting.
- Connection endpoint persists external connection and activity.
- First connection sends user/admin communication flows.
- `/onboarding/profile` collects profile details after connection.
- Profile drafts are saved progressively.
- Completed profile state is persisted.

Issues:

- The ChatGPT connection flow should be described consistently as secure server-side credential handling, not as exposing the key to ChatGPT/client.
- For ChatGPT channel, some identity fields are intentionally not sent in phase I. Confirm this still matches the desired profile-completion strategy.
- Profile completion lacks a clear step-back UX.
- Legal checkbox links in onboarding point to generic `/terms` and `/privacy`; consider connector-specific links if those are the URLs shown in the connector flow.

Recommended fixes:

- Add a small "Anterior" action to the profile questionnaire.
- Keep "Cerrar" or "Volver al conector" visible.
- Align legal links with submitted OpenAI URLs.
- Confirm profile completion emails are sent only once per user/tenant/channel.

## Database Persistence Audit

Confirmed persistence areas:

- `User`
- `Tenant`
- `Membership`
- `UserPreference`
- `TenantProfile`
- `UserOnboarding`
- `ExternalConnection`
- `ExternalConnectionAuditLog`
- `DemoRequest`

Available but not fully integrated in observed support flow:

- `SupportTicket`
- `SupportMessage`
- `EmailEvent`

Recommendations:

- Use `SupportTicket` and `SupportMessage` for `/conectores/chatgpt/soporte`.
- Use `EmailEvent` for transactional email audit trails.
- Ensure activity logs do not store secrets, tokens, or raw API keys.

## Email and Admin Reporting Audit

Current strengths:

- Demo requests are persisted and notify admins.
- Contact flows notify admins and send user acknowledgement.
- Registration can send verification, welcome, and admin notification emails.
- Holded connection can send connected/profile-completion emails and admin notification.
- Weekly admin summary route exists.

Issues:

- ChatGPT support form is not wired to a real ticket/email flow.
- Weekly summary route should require a secret in production.
- Email delivery attempts are not consistently persisted in `EmailEvent`.
- Lead/contact APIs should be reviewed to ensure all user activity required for admin reporting is persisted, not only emailed.

Recommended email events:

- user_registered
- email_verification_sent
- login_completed
- holded_connection_created
- profile_completion_requested
- profile_completed
- demo_requested
- support_ticket_created
- support_reply_sent
- weekly_admin_summary_sent

## Modals, Popups, and Navigation Audit

Current strengths:

- Demo modal supports backdrop close.
- Demo modal supports Escape close.
- Demo modal locks body scroll.
- Capability modal supports close/backdrop close.
- Auth popup has close/back behavior.
- Isaak support opens standalone instead of embedded in the landing.

Issues:

- Capability modal close button should include an explicit accessible label.
- Any inline support chat should remain disabled/removed from landing pages to avoid confusing users.
- The support form success modal/message should only claim "received" if a ticket/email was actually created.

Manual QA required:

- Open/close demo modal with mouse.
- Open/close demo modal with Escape.
- Open/close capability modal with mouse.
- Open/close capability modal with Escape.
- Back from support route to connector.
- Open Isaak support in standalone window from support page.
- Verify no chat is embedded in the landing page itself.

## Link Audit Summary

Links/routes that exist and should remain stable:

- `/`
- `/privacy`
- `/terms`
- `/support`
- `/support/chat`
- `/demo`
- `/demo-recording`
- `/conectores/chatgpt`
- `/conectores/chatgpt/docs`
- `/conectores/chatgpt/privacy`
- `/conectores/chatgpt/terms`
- `/conectores/chatgpt/soporte`
- `/conectores/chatgpt/openai-review-demo`
- `/conectores/claude`
- `/conectores/claude/docs`

Links/routes requiring verification or fix:

- `/conectores/claude/terms`
- `/conectores/claude/privacy`
- `/claude` as primary Claude connector CTA
- `/demo-recording` video content
- `/demo` label, because it is a demo request form rather than the review recording

## Recommended Fix Plan

### Before OpenAI re-submit

1. Fix `/demo-recording` to show the actual OpenAI review video.
2. Keep `/conectores/chatgpt/openai-review-demo` and make it the preferred new demo URL.
3. Remove out-of-scope modules from the ChatGPT review landing.
4. Replace "Acceso completo a Holded" style wording.
5. Replace "Solo lectura - no modifica tu cuenta" with "Solo lectura por defecto - los borradores requieren tu confirmacion."
6. Remove project/hour references from the OpenAI review demo page.
7. Fix ChatGPT support form so it creates a real ticket/email, or temporarily remove the form and keep email + Isaak chat only.
8. Remove the hardcoded API key from repo tooling and rotate the demo key.
9. Verify all public URLs on a clean deployment.
10. Run manual ChatGPT web and mobile QA.

### Shortly after re-submit

1. Add persistent `EmailEvent` logging.
2. Add complete support-ticket lifecycle.
3. Add connector-specific capability filters for ChatGPT and Claude.
4. Add Claude-specific missing legal routes.
5. Require admin summary secret in production.
6. Improve onboarding profile back navigation.

## Manual QA Checklist

### Hub

- [ ] `/` loads without 500.
- [ ] ChatGPT CTA points only to ChatGPT connector/docs/demo/support.
- [ ] Claude CTA points only to Claude connector/docs/demo/support.
- [ ] Root copy does not claim strict read-only if invoice drafts are supported.
- [ ] Demo CTA clearly distinguishes demo request from video recording.

### ChatGPT connector

- [ ] `/conectores/chatgpt` loads.
- [ ] Copy is limited to OpenAI review-safe scope.
- [ ] No broad "complete access" claim remains.
- [ ] No HR, warehouses, broad CRM/leads, products, project tasks, or time records are promoted in the main review page.
- [ ] Draft invoice copy says explicit confirmation is required.
- [ ] Demo link opens `/conectores/chatgpt/openai-review-demo`.
- [ ] Support link opens `/conectores/chatgpt/soporte`.
- [ ] Privacy and terms links work.

### Claude connector

- [ ] `/conectores/claude` loads.
- [ ] Claude CTA points to the intended connector flow.
- [ ] Claude docs link works.
- [ ] Claude terms link works.
- [ ] Claude privacy link works.
- [ ] Claude page does not reuse inaccurate ChatGPT-specific claims.

### Demo

- [ ] `/demo-recording` plays a real video.
- [ ] `/conectores/chatgpt/openai-review-demo` plays a real video.
- [ ] Direct video asset `/video/holded-chatgpt-demo.mp4` is reachable.
- [ ] Demo page does not advertise out-of-scope OpenAI review features.

### Support

- [ ] `/support` loads.
- [ ] `/support/chat` opens as standalone.
- [ ] Floating Isaak button opens standalone chat.
- [ ] No support chat is embedded inside the landing itself.
- [ ] `/conectores/chatgpt/soporte` loads.
- [ ] ChatGPT support "Volver" returns to `/conectores/chatgpt`.
- [ ] ChatGPT support form creates a real ticket or is removed.
- [ ] Support form sends admin notification.
- [ ] Support form sends user confirmation where email is available.

### Auth and onboarding

- [ ] Email magic link login works on web.
- [ ] Email magic link login works on mobile.
- [ ] Resend magic link works.
- [ ] Change email works.
- [ ] Password reset works.
- [ ] Close popup works in ChatGPT web flow.
- [ ] Close/back behavior works in ChatGPT mobile flow.
- [ ] Holded connection persists without exposing credentials.
- [ ] Profile completion draft saves.
- [ ] Profile completion final state persists.
- [ ] Profile completion email is sent once.

### Email/admin

- [ ] Demo request persists and emails admin.
- [ ] Contact request emails admin and user.
- [ ] Support request persists and emails admin/user.
- [ ] Holded connection emails user/admin.
- [ ] Weekly admin summary requires secret in production.
- [ ] Email events are persisted or consciously deferred.

## Final Readiness Assessment

Current status: `NOT_READY_FOR_OPENAI_RESUBMISSION`

The site can move to `READY_FOR_OPENAI_RESUBMISSION_AFTER_MANUAL_WEB_MOBILE_QA` after:

- `/demo-recording` is fixed to show the real recording.
- `/conectores/chatgpt/openai-review-demo` is cleaned of out-of-scope references.
- `/conectores/chatgpt` copy is constrained to the OpenAI review scope.
- ChatGPT support form either creates a real support ticket/email or is replaced with email + standalone Isaak chat only.
- The hardcoded secret is removed and the demo key is rotated.
- Public production/staging QA verifies all links, modals, auth, onboarding, support, demo, and email/admin flows.
- ChatGPT web and ChatGPT mobile review tests pass manually.
