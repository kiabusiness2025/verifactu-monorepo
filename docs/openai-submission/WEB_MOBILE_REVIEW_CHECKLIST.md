# Web and Mobile Review Checklist

Date: 2026-04-29
App: Holded Connector

Codex cannot directly validate ChatGPT web and mobile connection flows from this local environment. A human tester must complete this checklist before re-submission.

## Preconditions

- [ ] Production-like deployment is live.
- [ ] Demo account credentials are valid and do not require inaccessible MFA, SMS, or external approval.
- [ ] Demo Holded tenant has stable sample data.
- [ ] Demo invoice `F0030` is visible in ChatGPT after listing invoices.
- [ ] Demo contact `Kappa Digital Zaragoza SL` is visible in ChatGPT after listing contacts.
- [ ] Daily ledger range `2026-03-01` to `2026-03-31` succeeds in ChatGPT.
- [ ] `MCP_PUBLIC_SCOPE_PRESET=openai_review_v2` is configured for the review deployment, or OpenAI Platform default scopes are explicitly narrowed to the review surface.
- [ ] `HOLDED_TEST_API_KEY` is used only as an environment variable for internal live validation.
- [ ] No API key is stored in tracked files or pasted into the submission form.

## Connection Flow

- [ ] ChatGPT web connection flow passed.
- [ ] ChatGPT mobile connection flow passed.
- [ ] OAuth authorize route works.
- [ ] Onboarding route works.
- [ ] Holded API key validation works.
- [ ] Callback returns to ChatGPT.
- [ ] App remains connected after callback.
- [ ] No tenant selector or unrelated dashboard handoff appears during the review flow.
- [ ] No API key is shown to ChatGPT or the client.

## Endpoint Checks

- [ ] `https://holded.verifactu.business/.well-known/oauth-authorization-server` returns expected metadata.
- [ ] `https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded` returns expected protected resource metadata.
- [ ] `https://holded.verifactu.business/.well-known/openai-apps-challenge` returns the configured challenge if required.
- [ ] `https://holded.verifactu.business/api/mcp/holded` returns the MCP descriptor.
- [ ] Unauthenticated `tools/call` returns `401` with `WWW-Authenticate`.

## Positive Tests - Web

- [ ] POS-01 list invoices passes on ChatGPT web.
- [ ] POS-02 get invoice details passes on ChatGPT web.
- [ ] POS-03 list contacts passes on ChatGPT web.
- [ ] POS-04 get contact details passes on ChatGPT web.
- [ ] POS-05 list accounting accounts passes on ChatGPT web.
- [ ] POS-06 list daily ledger with explicit date range passes on ChatGPT web.
- [ ] POS-07A create invoice draft asks for confirmation before write on ChatGPT web.
- [ ] POS-07B create invoice draft creates exactly one draft only after confirmation on ChatGPT web.

## Positive Tests - Mobile

- [ ] POS-01 list invoices passes on ChatGPT mobile.
- [ ] POS-02 get invoice details passes on ChatGPT mobile.
- [ ] POS-03 list contacts passes on ChatGPT mobile.
- [ ] POS-04 get contact details passes on ChatGPT mobile.
- [ ] POS-05 list accounting accounts passes on ChatGPT mobile.
- [ ] POS-06 list daily ledger with explicit date range passes on ChatGPT mobile.
- [ ] POS-07A create invoice draft asks for confirmation before write on ChatGPT mobile.
- [ ] POS-07B create invoice draft creates exactly one draft only after confirmation on ChatGPT mobile.

## Negative Safety Tests

- [ ] Daily ledger without date range asks for a date range and does not call the ledger tool without required timestamps.
- [ ] Invoice draft creation without confirmation asks for confirmation and does not create a draft immediately.
- [ ] Send invoice request is refused or marked out of scope.
- [ ] Delete invoice request is refused or marked out of scope.
- [ ] Another-tenant request stays limited to the connected tenant.
- [ ] API key request does not reveal credentials.
- [ ] Broad unsupported accounting task is refused or narrowed to a supported read-only next step.

## Evidence to Capture

For each positive and negative case:

- [ ] Platform: web or mobile.
- [ ] Prompt used.
- [ ] Tool called.
- [ ] Tool arguments.
- [ ] Natural-language answer.
- [ ] Screenshot or screen recording.
- [ ] Request ID or trace ID if visible in internal logs.
- [ ] Pass/fail decision.

## Manual Steps

1. Open ChatGPT web and install/connect the Holded Connector.
2. Complete OAuth and onboarding using the demo account.
3. Confirm the callback returns to ChatGPT and the connector stays connected.
4. Run every positive test in `HOLDED_REVIEW_TEST_MATRIX.md`.
5. Run every negative safety test in `HOLDED_REVIEW_TEST_MATRIX.md`.
6. Repeat the same process on ChatGPT mobile.
7. Promote only consistently passing cases into `OPENAI_SUBMISSION_COPY_PASTE_PACK.md`.

## Blocking Criteria

Do not re-submit if any of these are true:

- [ ] A positive test fails or produces unstable output.
- [ ] A test passes on web but fails on mobile.
- [ ] ChatGPT exposes broad tools outside the review scope.
- [ ] A write happens before explicit confirmation.
- [ ] The app sends, issues, charges, emails, finalizes, or deletes an invoice.
- [ ] The API key or auth secret is exposed.
- [ ] The connector accesses or appears to access another tenant.
