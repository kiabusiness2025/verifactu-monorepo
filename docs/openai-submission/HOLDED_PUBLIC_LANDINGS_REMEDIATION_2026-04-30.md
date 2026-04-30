# Holded Public Landings Remediation

Date: 2026-04-30

Status: `READY_FOR_DEPLOY_THEN_PRODUCTION_WEB_MOBILE_QA`

## Scope

Updated the Holded public connector pages and support/demo flows for:

- `/`
- `/conectores/chatgpt`
- `/conectores/claude`
- `/demo-recording`
- `/conectores/chatgpt/openai-review-demo`
- `/conectores/chatgpt/soporte`
- `/conectores/claude/soporte`

## Changes Applied

### Demo URLs

- Kept `/demo-recording` as a stable public URL.
- Removed the middleware redirect that sent `/demo-recording` to the home page.
- Rebuilt `/demo-recording` as a demo library page.
- The current demo uses the real local asset:
  - `/video/holded-chatgpt-demo.mp4`
- Kept the OpenAI review URL:
  - `/conectores/chatgpt/openai-review-demo`
- The OpenAI review demo page now describes only review-safe flows.

### ChatGPT and Claude landing template

- Rebuilt the shared connector landing template used by both ChatGPT and Claude.
- Both pages now share the same structure, copy pattern, sections, CTA hierarchy, support block, legal links, and safety language.
- Removed broad/out-of-scope claims from the public connector landing template:
  - no "Acceso completo a Holded"
  - no HR/RRHH
  - no warehouses/almacenes
  - no CRM/leads
  - no project tasks
  - no time records
  - no product/stock promises
- Public scope now focuses on:
  - invoices
  - invoice details
  - contacts
  - contact details
  - accounting accounts
  - daily ledger with explicit date range
  - invoice draft with explicit confirmation

### Hub landing

- Updated the root hub copy to avoid strict read-only contradiction.
- Replaced "Solo lectura - no modifica tu cuenta" with "Solo lectura por defecto - borradores solo con confirmacion".
- Updated the hub connector cards to use review-safe capabilities.
- Updated the demo CTA to `/demo-recording`.

### Legal copy touched by connector links

- Updated the generic `/terms` route to avoid broad module promises.
- Updated `/conectores/chatgpt/terms` to avoid broad module promises.
- Added `/conectores/claude/terms` as a compatibility redirect to `/terms`.

### Support flow

- Replaced the previous ChatGPT support form behavior.
- Added a shared support page component for connector-specific support.
- Added `/conectores/claude/soporte`.
- Both connector support pages now offer exactly three clear options:
  - standalone Isaak support chat
  - authenticated support ticket form
  - direct email to `soporte@verifactu.business`
- The support chat opens in a new window/tab and is not embedded inside the landing.
- Added `/api/support/tickets`:
  - requires authenticated Holded session
  - creates `SupportTicket`
  - creates initial `SupportMessage`
  - sends admin notification email
  - sends user confirmation email
  - rate-limits per user/IP
- The unauthenticated form state now asks the user to sign in instead of pretending a ticket was created.

### Secret handling

- Removed the hardcoded Holded demo API key from `scripts/video-pipeline/config.py`.
- The video pipeline now reads Holded credentials only from:
  - `HOLDED_TEST_API_KEY`
  - fallback `HOLDED_API_KEY`
- The demo key should still be rotated after testing because it was previously present in repo tooling.

### QA automation

- Added `scripts/qa-holded-landings.mjs`.
- Added package script:
  - `pnpm holded:qa:landings`
- The script validates desktop and mobile browser viewports with Playwright.
- It checks public routes, expected copy, missing/out-of-scope copy, demo video presence, and standalone support chat behavior.

## Local Validation

Command:

```bash
pnpm holded:qa:landings -- --base-url=http://localhost:3011
```

Result:

```text
Holded landing QA passed against http://localhost:3011
```

Validated routes in desktop and mobile:

- `/`
- `/conectores/chatgpt`
- `/conectores/claude`
- `/demo-recording`
- `/conectores/chatgpt/openai-review-demo`
- `/conectores/chatgpt/soporte`
- `/conectores/claude/soporte`
- `/privacy`
- `/terms`

Additional check:

- Unauthenticated `POST /api/support/tickets` returns `401`, as expected.
- `pnpm openai:validate-tool-hints` passed.
- `pnpm holded:ci:contract` passed.
- `pnpm holded:demo:validate` passed against the demo tenant. This script seeds/validates demo data and creates/deletes temporary demo records as part of its documented smoke checks.

## Remaining Validation Required

After deploy, run:

```bash
pnpm holded:qa:landings
```

This defaults to:

```text
https://holded.verifactu.business
```

Manual QA still required:

- ChatGPT web connector flow
- ChatGPT mobile connector flow
- authenticated support ticket creation
- support admin email delivery
- user support confirmation email delivery
- real production `/demo-recording` video playback
- real production `/conectores/chatgpt/openai-review-demo` video playback

## Known Blockers Not Fixed In This Patch

- Full `pnpm --filter verifactu-holded exec tsc --noEmit` still fails on pre-existing unrelated issues in Holded customers/purchases routes/tests and `holded-onboarding.ts`.
- Production QA cannot reflect these changes until the updated app is deployed.

## Release Status

`READY_FOR_DEPLOY_THEN_PRODUCTION_WEB_MOBILE_QA`
