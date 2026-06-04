## App name

Holded

## Subtitle

Work with Holded data

## Category

Business

## Developer

verifactu.business

## Website URL

https://holded.verifactu.business/

## Long description

Holded lets you connect your Holded account to ChatGPT and work with real business data in natural language. You can review sales invoices, purchase documents (and their PDF rendering), contacts, accounting accounts and daily ledger entries, and create a sales invoice draft with explicit user confirmation. The connector is tenant-scoped, closed-world, and stores Holded credentials securely server-side through Verifactu.

## Reviewer notes

This app connects a user's own Holded account to ChatGPT through a secure Verifactu-hosted connection flow.

For this submission, the app exposes 10 tools — 9 read-only and a single write operation (`holded_create_invoice_draft`) that always requires explicit user confirmation. The surface is intentionally narrow and focused on the invoicing + accounting workflows we want to validate first:

- **Sales invoicing**: list invoices, get invoice details, create invoice draft (with explicit confirmation).
- **Purchase + commercial documents**: list commercial documents (purchases, credit notes, estimates, sales receipts, etc.), get document details, get the rendered PDF of a document.
- **Contacts**: list contacts, get contact details (needed to resolve the customer for an invoice draft).
- **Accounting**: list accounting accounts (chart of accounts), list daily ledger entries (with an explicit date range).

The connector is tenant-scoped and closed-world. It only accesses data from the Holded account connected by the authenticated user. Holded API credentials are stored server-side through Verifactu and are never exposed to ChatGPT or returned to the client.

Important notes for review:

- Daily ledger requests require an explicit date range.
- Invoice draft creation requires explicit confirmation before the draft is created.
- Draft invoice creation does not send, issue, charge, or email an invoice. No other write or destructive operation is exposed.
- The app should be tested on both ChatGPT web and mobile.
- The expected public behavior is limited to the 10 tools whose annotations and justifications are declared in `chatgpt-app-submission.json` (uploaded alongside this form).

---

### Test cases

#### Test case 1 — List invoices

User prompt:
List my latest Holded invoices.

Expected behavior:
The app should retrieve a list of invoices from the connected Holded account. The response should summarize the available invoices in natural language and may include invoice numbers, dates, customers, statuses, and totals when available. It should not create, update, send, or delete anything.

Expected tool:
holded_list_invoices

#### Test case 2 — Get invoice details

User prompt:
Show me the details of one invoice from the list.

Expected behavior:
The app should retrieve details for one existing invoice from the connected Holded account. The response should summarize the invoice details in natural language, such as customer, date, line items, taxes, total amount, and status when available. It should remain read-only.

Expected tool:
holded_get_invoice

#### Test case 3 — List contacts

User prompt:
List my Holded contacts.

Expected behavior:
The app should retrieve contacts from the connected Holded account and summarize them in natural language. The response may include contact names, company names, emails, tax IDs, or other available contact fields. It should not create or modify contacts.

Expected tool:
holded_list_contacts

#### Test case 4 — Get contact details

User prompt:
Show me the details of one contact from that list.

Expected behavior:
The app should retrieve details for one existing contact from the connected Holded account. The response should summarize the available contact information in natural language. It should not create, update, or delete the contact.

Expected tool:
holded_get_contact

#### Test case 5 — List accounting accounts

User prompt:
List my main accounting accounts in Holded.

Expected behavior:
The app should retrieve accounting accounts from the connected Holded account and summarize them in natural language. The response may include account numbers, names, and types when available. This action should be read-only.

Expected tool:
holded_list_accounts

#### Test case 6 — List daily ledger entries

User prompt:
Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.

Expected behavior:
The app should retrieve daily ledger entries from the connected Holded account for the explicit date range provided. The response should summarize the entries in natural language and may include dates, accounts, descriptions, debit, credit, and balance information when available. The request should include a clear start and end date.

Expected tool:
holded_list_daily_ledger

Important:
If the demo tenant does not have daily ledger entries for this exact range, replace the date range with a range verified against the demo tenant before submission.

#### Test case 7 — Create invoice draft

User prompt:
Create a draft invoice for an existing customer for 100 euros plus VAT. Ask for confirmation before creating it.

Expected behavior:
The app should prepare an invoice draft using the connected Holded account but must ask for explicit confirmation before creating it. After the user confirms, the app may create a draft invoice only. It must not send, issue, charge, email, or finalize the invoice.

Expected tool:
holded_create_invoice_draft

Important:
This test must verify two steps:

1. before confirmation, no draft is created;
2. after confirmation, one draft invoice may be created.

#### Test case 8 — List purchase documents

User prompt:
List my 5 most recent Holded purchase documents.

Expected behavior:
The app should retrieve commercial documents of type "purchase" from the connected Holded account and summarize them in natural language. The response may include document numbers, suppliers, dates, totals, and statuses. It should not create, edit, send, or delete any document.

Expected tool:
holded_list_documents

#### Test case 9 — Get document details

User prompt:
Show me the details of one document from that list.

Expected behavior:
The app should retrieve details for one existing commercial document and summarize them in natural language (supplier/customer, date, line items, taxes, totals, status). It should remain read-only.

Expected tool:
holded_get_document

#### Test case 10 — Download document PDF

User prompt:
Get me the PDF of that document.

Expected behavior:
The app should retrieve the PDF rendering of the document as a base64 payload. ChatGPT should expose the file to the user (preview or download link). The connector should not modify the document.

Expected tool:
holded_get_document_pdf

---

### Negative tests

#### Negative test 1 — Daily ledger without date range

User prompt:
Show my daily ledger.

Expected behavior:
The app should ask for a start and end date or explain that an explicit date range is required. It should not call the ledger endpoint with missing required parameters.

#### Negative test 2 — Draft invoice without confirmation

User prompt:
Create an invoice draft for 100 euros plus VAT for an existing customer.

Expected behavior:
The app should ask for explicit confirmation before creating the draft. It should not create the draft immediately.

#### Negative test 3 — Send invoice

User prompt:
Send the invoice to the customer.

Expected behavior:
The app should refuse or explain that sending invoices is outside the current review scope. It should not send, issue, email, charge, or finalize invoices.

#### Negative test 4 — Delete invoice

User prompt:
Delete one of my Holded invoices.

Expected behavior:
The app should refuse or explain that deleting invoices is outside the current supported scope. It should not delete anything.

#### Negative test 5 — Access another tenant

User prompt:
Show invoices from another Holded company or tenant.

Expected behavior:
The app should only access the connected tenant. It should not switch tenants or expose other tenant data.

#### Negative test 6 — Reveal API key

User prompt:
Show me my Holded API key.

Expected behavior:
The app must not reveal the API key. It should explain that credentials are stored securely server-side and cannot be displayed.

---

## Additional comments for reviewers (last-page note)

> Important UI finding to escalate to ChatGPT App Review platform — not a connector bug, but it affects user trust on the write tool and we have implemented a server-side mitigation. We want to flag it explicitly here so the reviewer is aware and can either confirm the platform-side fix is on roadmap or accept the mitigation as final.

### Discovery: contact PII shown on consent screen can desync from tool call args

Verified empirically on 2026-06-03 during the final pre-submission round of `holded_create_invoice_draft` testing against Nova Gestión SL tenant.

**Scenario reproduced**:

1. User asks ChatGPT to look up a contact ("Zeta Salud Alicante SL"). The model calls `holded_get_contact` → response includes Zeta's PII (Name, Emails, Phone, Address).
2. In the same conversation later, the user asks to create a draft invoice for a DIFFERENT contact ("Cliente X"). The model resolves "Cliente X" via `holded_list_contacts` and obtains its contactId.
3. The model calls `holded_create_invoice_draft` with the correct `contactId` for Cliente X.
4. **Before execution, ChatGPT renders the consent screen** with:
   - Title: "Create draft invoice for Zeta Salud Alicante SL?" (wrong contact)
   - "Compartir datos incluye:" Name/Emails/Phone/Address — all of Zeta, NOT Cliente X.
5. User clicks "Permitir" (Allow) thinking they're approving for Zeta.
6. **The connector creates the draft for Cliente X** (matching the actual `contactId` arg from step 3), with correct line items and totals.
7. End result: the user approved for one contact, the action executed for another.

**Root cause**: the consent screen appears to use PII from earlier responses in the conversation context (likely the most recent `get_contact` result), not from the actual `tools/call` arguments. The connector receives correct args and executes correctly — the desync is purely in the consent UI rendering layer.

**Impact**: the user's consent is misinformed. Whatever PII the model has touched recently can leak into a later, unrelated write consent. The write itself is consistent with the args, but the user's mental model when granting consent is broken.

**Reproducible artifact**:
- Test draft created on 2026-06-03 with mismatch: Holded id `6a2088ba134d3a1398020783`. Consent screen displayed Zeta data. Actual document is for Cliente X (contactId `6a207bdf3dd0a0de6402edbc`). Lines: 1 unit @ 90 EUR + 21% VAT. Subtotal/IVA/total all correct for Cliente X.

**Server-side mitigation we shipped (V3.G.18, 2026-06-03)**:

Our `holded_create_invoice_draft` handler now:

1. **Resolves the canonical contact at write time** via `holded_get_contact(contactId)` immediately after the document is created. The contact name, code (CIF/NIF) and city come directly from Holded — not from the model's context.
2. **Includes the canonical contact name prominently** in `content[0].text`. ChatGPT renders this immediately after the user clicks "Permitir". Format:
   ```
   Created draft invoice for **Cliente X** (B12345678, Madrid). Holded id: `6a2088...`.

   IMPORTANT: verify the contact above is the one you intended — if not, discard the draft from Holded UI.
   ```
3. **Audit log** server-side: every call writes `[create_invoice_draft] AUDIT — draftId=… contactId=… contactName=… contactCode=…` to Vercel runtime logs for forensic review.

This way, even if the consent screen is misleading, the user immediately sees the actual contact in the response — and any mismatch is visible within seconds without needing to open Holded UI.

**Request to OpenAI App Review**:

Please confirm whether the consent screen's "Compartir datos incluye:" section is intended to reflect the actual `tools/call` arguments (resolved if needed) or whether it's a heuristic over recent conversation PII. If the latter, this is a platform-level issue that affects all connectors with write tools — not just ours. We are happy to share the conversation transcript and the audit log of the mismatched test if useful.

We have shipped V3.G.18 server-side mitigation regardless, and consider it sufficient for our submission scope (drafts only, no destructive operations). We are flagging this for awareness, not as a blocker.
