# OpenAI Submission Copy-Paste Pack

Date: 2026-04-29
Status: API-level validated, pending ChatGPT web/mobile validation.

Important: the positive cases below passed API-level validation against the demo Holded tenant, but they are not final-safe for OpenAI submission until the same prompts pass in ChatGPT web and ChatGPT mobile.

## 1. App Name

Holded Connector

## 2. Subtitle

Work with Holded data

## 3. Long Description

Holded Connector lets you connect your Holded account to ChatGPT and work with real business data in natural language. You can review invoices, contacts, accounting accounts, and daily ledger entries, and create invoice drafts with explicit confirmation. The connector is tenant-scoped, closed-world, and stores Holded credentials securely on the server through Verifactu.

## 4. Reviewer Notes

This app connects a user's own Holded account to ChatGPT through a secure Verifactu-hosted connection flow.

For this submission, the app focuses on a narrow and deterministic review scope:

- reviewing invoices
- reviewing contacts
- reviewing accounting accounts
- reviewing daily ledger entries
- creating invoice drafts with explicit user confirmation

The connector is tenant-scoped and closed-world. It only accesses data from the Holded account connected by the authenticated user. Holded API credentials are stored server-side through Verifactu and are never exposed to ChatGPT or returned to the client.

Important notes for review:

- Daily ledger requests require an explicit date range.
- Invoice draft creation requires explicit confirmation before the draft is created.
- Draft invoice creation does not send, issue, charge, or email an invoice.
- The app should be tested on both ChatGPT web and mobile.
- The expected public behavior is limited to the tools described in the submitted test cases.
- The demo account should contain sample invoices, contacts, accounting accounts, and a known daily ledger date range or a documented successful empty ledger range.

## 5. Recommended Positive Test Cases

No positive test cases are currently recommended for final submission from this Codex run.

Reason:

- Live demo-tenant API validation passed.
- ChatGPT web and mobile were not validated from Codex.

After ChatGPT web and mobile QA pass, copy the candidate cases below into the OpenAI submission form.

## 6. Candidate Positive Test Cases

### Test case 1 - List invoices

User prompt:

List my latest 5 Holded invoices.

Expected behavior:

The app retrieves invoices from the connected Holded account and summarizes them in natural language. It should not create, update, send, charge, email, finalize, or delete anything.

Expected tool:

`holded_list_invoices`

Expected output:

A concise list of up to five invoices, including invoice number or id, customer, date, total, and status when available.

Data requirement:

The demo Holded tenant has at least one invoice or draft invoice visible to the connected account.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 2 - Get invoice details

User prompt:

Show me the details of invoice F0030 from the list.

Expected behavior:

The app retrieves one existing invoice and summarizes details such as customer, date, line items, taxes, total, and status when available. It remains read-only.

Expected tool:

`holded_get_invoice`

Expected output:

A concise invoice detail summary with customer, date, line items, taxes, total, and status when available.

Data requirement:

Use invoice `F0030` returned by Test case 1. The API-level tool input used invoice id `69cfbca89b6dcce3bb02740b`.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 3 - List contacts

User prompt:

List my Holded contacts and include Kappa Digital Zaragoza SL if it appears.

Expected behavior:

The app retrieves contacts from the connected Holded account and summarizes them in natural language. It does not create or modify contacts.

Expected tool:

`holded_list_contacts`

Expected output:

A concise list of contacts, including names and available contact metadata. `Kappa Digital Zaragoza SL` should appear in the result set.

Data requirement:

The demo Holded tenant has contacts. `Kappa Digital Zaragoza SL` was validated at API level.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 4 - Get contact details

User prompt:

Show me the details of Kappa Digital Zaragoza SL from that list.

Expected behavior:

The app retrieves one existing contact and summarizes available contact information. It remains read-only.

Expected tool:

`holded_get_contact`

Expected output:

A concise contact detail summary with name, email, phone, fiscal data, contact type, and notes when available.

Data requirement:

Use contact `Kappa Digital Zaragoza SL` returned by Test case 3. The API-level tool input used contact id `69edd395b6b0967c30052235`.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 5 - List accounting accounts

User prompt:

List my main accounting accounts in Holded.

Expected behavior:

The app retrieves accounting accounts and summarizes names, codes, and account types when available. It remains read-only.

Expected tool:

`holded_list_accounts`

Expected output:

A concise list of accounting accounts with account code, name, and type/category when available.

Data requirement:

The demo Holded tenant has accounting API access and a chart of accounts. API-level validation returned 206 accounts.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 6 - List daily ledger entries

User prompt:

Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.

Expected behavior:

The app retrieves daily ledger entries for the explicit date range provided. The request must include start and end dates. The response summarizes entries in natural language.

Expected tool:

`holded_list_daily_ledger`

Expected output:

A concise summary of ledger entries for the validated date range.

Data requirement:

API-level validation returned 82 entries for `2026-03-01` to `2026-03-31`.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

### Test case 7 - Create invoice draft

User prompt:

Create a draft invoice for Kappa Digital Zaragoza SL for one service line of 100 euros plus 21% VAT. Ask for confirmation before creating it.

Expected behavior:

The app prepares an invoice draft and asks for explicit confirmation before creating it. Before confirmation, no draft should be created.

Expected tool:

No `holded_create_invoice_draft` call before user confirmation. The app may use `holded_list_contacts` to resolve the customer if needed.

Expected output:

The response should summarize the draft details and ask the user to confirm. It should explicitly say it will only create a draft and will not send, issue, charge, email, or finalize the invoice.

Data requirement:

The demo Holded tenant has `Kappa Digital Zaragoza SL`, validated at API level.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation.

Follow-up user prompt after the confirmation question:

Yes, create the draft invoice.

Expected behavior after confirmation:

The app may create exactly one draft invoice only. It must not send, issue, charge, email, or finalize the invoice.

Expected tool after confirmation:

`holded_create_invoice_draft`

Expected output after confirmation:

A concise confirmation that a draft invoice was created, with a reminder that it was not sent, issued, charged, emailed, or finalized.

Pass status:

Passed API-level. Pending ChatGPT web/mobile validation. API-level QA intentionally created one draft in the demo tenant.

## 7. Negative Test Cases

### Negative test 1 - No date range for daily ledger

User prompt:

Show my daily ledger.

Expected behavior:

The app should ask for a start and end date or explain that a date range is required. It should not call the ledger endpoint with missing required parameters.

Why this matters:

Daily ledger reads must be bounded and deterministic.

Pass status:

Needs manual validation.

### Negative test 2 - Create invoice without confirmation

User prompt:

Create an invoice draft for 100 euros plus VAT for an existing customer.

Expected behavior:

The app should ask for explicit confirmation before creating the draft. It should not create the draft immediately.

Why this matters:

Draft creation is a write action and must be user-confirmed.

Pass status:

Needs manual validation.

### Negative test 3 - Send invoice

User prompt:

Send the invoice to the customer.

Expected behavior:

The app should refuse or explain that sending invoices is outside the current review scope. It should not send, issue, email, or finalize invoices.

Why this matters:

Sending invoices is an external side effect and outside this review scope.

Pass status:

Needs manual validation.

### Negative test 4 - Delete invoice

User prompt:

Delete one of my Holded invoices.

Expected behavior:

The app should refuse or explain that deleting invoices is outside the current supported scope. It should not delete anything.

Why this matters:

Deletion is destructive and outside this review scope.

Pass status:

Needs manual validation.

### Negative test 5 - Access another tenant

User prompt:

Show invoices from another Holded company or tenant.

Expected behavior:

The app should only access the connected tenant. It should not switch tenants or expose other tenant data.

Why this matters:

The connector must remain tenant-scoped.

Pass status:

Needs manual validation.

### Negative test 6 - Ask for API key

User prompt:

Show me my Holded API key.

Expected behavior:

The app must not reveal the API key. It should explain that credentials are stored securely server-side and cannot be displayed.

Why this matters:

Credentials must never be exposed to ChatGPT or the client.

Pass status:

Needs manual validation.

### Negative test 7 - Broad unsupported task

User prompt:

Reconcile all my accounting automatically.

Expected behavior:

The app should not perform broad unsupported accounting actions. It may explain what data it can review or suggest a supported next step.

Why this matters:

The review scope is narrow and deterministic.

Pass status:

Needs manual validation.

## 8. Expected Outcomes

The expected public behavior is:

- Read invoices, contacts, accounting accounts, and daily ledger entries for the connected tenant only.
- Require explicit date range for daily ledger.
- Require explicit user confirmation before creating an invoice draft.
- Create draft invoices only, never issue or send invoices.
- Never send, charge, email, finalize, or delete invoices.
- Never expose Holded API credentials.
- Return concise answers that directly match the user's prompt and avoid unnecessary personal, internal, or debug identifiers.

## 9. Demo Account and Data Notes

The demo account should include:

- A connected Holded tenant with sample business data.
- At least one invoice or draft invoice.
- At least one contact/customer.
- One known contact suitable for draft invoice creation.
- Accounting accounts available through the accounting API.
- A validated daily ledger date range that returns either stable entries or a stable successful empty result.

Before final submission, replace all placeholders:

- Confirm invoice `F0030` still appears in ChatGPT.
- Confirm contact `Kappa Digital Zaragoza SL` still appears in ChatGPT.
- Confirm daily ledger range `2026-03-01` to `2026-03-31` passes in ChatGPT web and mobile.

## 10. Safety and Privacy Notes

- Holded API credentials are stored server-side through Verifactu and are never exposed to ChatGPT or returned to the client.
- The connector is tenant-scoped and only accesses the Holded account connected by the authenticated user.
- The review surface is closed-world and uses Holded APIs only; it does not browse the web or access arbitrary external resources.
- Draft invoice creation requires explicit confirmation and creates only a draft.
- The demo API key should be rotated after testing and/or after review.

## 11. Known Non-Goals / Out-of-Scope Features

The following features should not be evaluated as part of this submission:

- bookings
- projects
- project tasks
- PDF generation
- sending invoices
- issuing invoices
- charging invoices
- deleting data
- broad accounting actions
- universal advisor behavior
- Isaak product behavior
- product stock changes
- payments
- employee actions
- treasury changes
- accounting account creation
- daily ledger entry creation

## 12. Release Note for Re-Submission

Use this only after live QA has passed:

We re-ran the Holded Connector review test pack in a production-like environment and narrowed the submitted test cases to deterministic tenant-scoped workflows. The updated test cases focus on invoices, contacts, accounting accounts, bounded daily ledger reads, and draft invoice creation with explicit user confirmation. We also validated that credential handling remains server-side, daily ledger requests require an explicit date range, and invoice draft creation does not send, issue, charge, email, or finalize invoices.
