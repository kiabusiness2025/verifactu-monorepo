# Holded Connector Review Test Matrix

**Date:** 2026-04-29 (initial), 2026-05-04 (post-rejection update)
**Status:** ⚠️ REJECTED on first OpenAI submission. Fixes applied 2026-05-04 — pending re-validation on ChatGPT web AND mobile before resubmission.

## 🔴 Outcome of the first submission (2026-04-29 → 2026-05-04 rejection)

OpenAI rejected the submission with this reason:

> "One or more of your test cases did not produce correct results. Please re-run all submitted test cases and align tool behavior/output with the documented expected outcomes. Ensure the same test cases pass consistently on both ChatGPT web and mobile."

### Root cause analysis (post-mortem)

Three structural issues were identified in the connector that likely caused review prompts to fail when executed inside ChatGPT (vs. the API-level harness we ran locally):

1. **POS-06 — Daily ledger date conversion**. The tool only accepted Unix seconds (`startTimestamp`/`endTimestamp`). When a reviewer asked for "2026-03-01 to 2026-03-31", ChatGPT had to compute Unix seconds mentally. Off-by-one errors silently returned empty results, which the reviewer interpreted as "did not produce correct result".
2. **POS-07B — Confirmation flow**. `holded_create_invoice_draft` required a nested `payload` object with `contactId` (a Mongo id only obtainable via `holded_list_contacts` first). On a fresh review session, ChatGPT often constructed the payload incorrectly or referenced a contact name instead of an id, causing the write to throw.
3. **All POS list cases — Verbose JSON output**. `formatToolResult` returned `JSON.stringify(data, null, 2)` for every response. POS-05 dumped 206 accounts of raw JSON, POS-03 dumped 60 contacts of raw JSON. ChatGPT mobile in particular struggles to render and summarize this; the model frequently returned confused or truncated answers.

### Fixes applied (2026-05-04)

| Fix | File                                                             | Description                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `apps/app/lib/integrations/holdedMcpTools.ts`                    | `holded_list_daily_ledger` now accepts ISO `startDate`/`endDate` (YYYY-MM-DD) in addition to Unix `startTimestamp`/`endTimestamp`. ISO is preferred for assistants. End date auto-bumps to 23:59:59 UTC for inclusivity.                                |
| F2a | same                                                             | `holded_create_invoice_draft` accepts a flat shape (`contactId`, `contactName`, `subject`, `lines`, single-line shortcut `desc`/`units`/`price`/`tax`) at the top level. Legacy nested `payload` still works.                                           |
| F2b | same                                                             | `contactName` → `contactId` resolution via `listContacts` when only the name is provided. Avoids forcing reviewers to chain calls.                                                                                                                      |
| F2c | same                                                             | `requireConfirm` now throws an INSTRUCTIONAL message ("Confirmation pending. No changes were made. Call again with confirm: true.") so the model surfaces it as a confirmation prompt, not a hard error.                                                |
| F3  | `apps/app/app/api/mcp/holded/route.ts`                           | `formatToolResult` returns concise **markdown summaries** for `items`/`item`/`created`/`stock` shapes. Top 10 items in text + total + pagination hint. Full data still in `structuredContent` for programmatic access. JSON dumps capped at 1500 chars. |
| F4  | `apps/app/lib/integrations/holdedMcpTools.ts`                    | `holded_list_invoices` falls back to historical search (current year, then previous year) when the default endpoint returns 0 items. Protects POS-01 against tenants with restrictive default scope.                                                    |
| F5  | `apps/holded/app/conectores/chatgpt/openai-review-demo/page.tsx` | Removed broken `<video>` fallback when no recording is published. Replaced with explanatory card listing the 8 review prompts so reviewers can re-run the flow live in ChatGPT.                                                                         |
| F6  | this file                                                        | Status updated to "REJECTED — fixes applied — pending re-validation".                                                                                                                                                                                   |

### Promotion rule (REINFORCED for resubmission)

A test case is **NOT** safe for OpenAI submission until ALL of the following are true:

- ✅ Passes API-level (curl/test harness against production endpoint)
- ✅ Passes on ChatGPT **web** with the live connector authorized to the demo tenant
- ✅ Passes on ChatGPT **mobile** with the same connector
- ✅ The actual tool call selected by the model matches the expected tool
- ✅ The actual response includes the expected information (concise, no credentials, no excessive PII)
- ✅ Any write tool path requires explicit confirmation BEFORE execution

The "Pass status" column below MUST be updated for each case BEFORE marking the matrix safe for resubmission. **Do not submit again with cells marked "API-level only".**

---

This matrix captures the intended positive and negative review tests. Live demo-tenant API validation passed on 2026-04-29 using `HOLDED_TEST_API_KEY` from the process environment. ChatGPT web and mobile still require manual validation before these cases are safe for final OpenAI submission.

## Positive Review Cases

| Test ID | User prompt                                                                                                                                   | Expected tool                                                                                      | Expected input parameters                                                                                                                                                                                                                      | Expected result                                                                                                                                                | Actual result                                                                                                                                                              | Pass/Fail        | Notes                                                                                  | Safe for OpenAI submission  |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| POS-01  | List my latest 5 Holded invoices.                                                                                                             | `holded_list_invoices`                                                                             | `{ "page": 1, "limit": 5 }`                                                                                                                                                                                                                    | Retrieves invoices from the connected tenant and summarizes invoice number/id, customer, date, total, and status when available. No create/update/send/delete. | API-level passed. Returned 5 invoices. First invoice: `F0030`, `Kappa Digital Zaragoza SL`, total `102.85`.                                                                | Passed API-level | Use this exact prompt on ChatGPT web/mobile.                                           | Not yet; pending web/mobile |
| POS-02  | Show me the details of invoice F0030 from the list.                                                                                           | `holded_get_invoice`                                                                               | `{ "invoiceId": "69cfbca89b6dcce3bb02740b" }`                                                                                                                                                                                                  | Retrieves one existing invoice and summarizes customer, date, line items/taxes if available, total, and status. Read-only.                                     | API-level passed. Invoice detail returned for `F0030`. Detail response did not expose line items in the summarized fields, so expected output should say "when available". | Passed API-level | Safer reviewer prompt is "from the list" after POS-01 so ChatGPT uses the returned id. | Not yet; pending web/mobile |
| POS-03  | List my Holded contacts and include Kappa Digital Zaragoza SL if it appears.                                                                  | `holded_list_contacts`                                                                             | `{ "page": 1, "limit": 25 }`                                                                                                                                                                                                                   | Retrieves contacts from the connected tenant and summarizes names and available contact metadata. Read-only.                                                   | API-level passed. Returned 60 contacts; `Kappa Digital Zaragoza SL` appeared in the first 25.                                                                              | Passed API-level | Use Kappa as the stable follow-up contact.                                             | Not yet; pending web/mobile |
| POS-04  | Show me the details of Kappa Digital Zaragoza SL from that list.                                                                              | `holded_get_contact`                                                                               | `{ "contactId": "69edd395b6b0967c30052235" }`                                                                                                                                                                                                  | Retrieves one existing contact and summarizes available contact information. Read-only.                                                                        | API-level passed. Contact details returned for `Kappa Digital Zaragoza SL`.                                                                                                | Passed API-level | Prompt depends on POS-03 context.                                                      | Not yet; pending web/mobile |
| POS-05  | List my main accounting accounts in Holded.                                                                                                   | `holded_list_accounts`                                                                             | `{ "includeEmpty": true, "page": 1, "limit": 25 }`                                                                                                                                                                                             | Retrieves chart of accounts and summarizes account codes, names, and types when available. Read-only.                                                          | API-level passed. Returned 206 accounts. First accounts included `570000 Caja` and `10000000 Capital social`.                                                              | Passed API-level | Keep output concise in ChatGPT.                                                        | Not yet; pending web/mobile |
| POS-06  | Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.                                                                            | `holded_list_daily_ledger`                                                                         | `{ "page": 1, "startTimestamp": 1772323200, "endTimestamp": 1775001599 }`                                                                                                                                                                      | Retrieves daily ledger entries for the explicit date range.                                                                                                    | API-level passed. Returned 82 entries.                                                                                                                                     | Passed API-level | This is the recommended positive ledger range.                                         | Not yet; pending web/mobile |
| POS-07A | Create a draft invoice for Kappa Digital Zaragoza SL for one service line of 100 euros plus 21% VAT. Ask for confirmation before creating it. | No write tool before confirmation. Optional `holded_list_contacts` may be used to resolve contact. | No `holded_create_invoice_draft` call before confirmation.                                                                                                                                                                                     | ChatGPT prepares the draft details and asks for explicit confirmation. No draft is created.                                                                    | API-level pre-confirmation step passed by omission: no write was executed before confirmation. ChatGPT behavior still manual.                                              | Passed API-level | Must verify ChatGPT does not call the write tool before confirmation.                  | Not yet; pending web/mobile |
| POS-07B | Yes, create the draft invoice.                                                                                                                | `holded_create_invoice_draft`                                                                      | `{ "confirm": true, "docType": "invoice", "payload": { "contactId": "69edd395b6b0967c30052235", "subject": "OpenAI review draft invoice <timestamp>", "lines": [{ "desc": "OpenAI review service", "units": 1, "price": 100, "tax": 21 }] } }` | Creates exactly one draft invoice only. It does not send, issue, charge, email, or finalize the invoice.                                                       | API-level passed. Before matching drafts: 0. After matching drafts: 1. Created draft id: `69f1c912302f7eda58033e05`.                                                       | Passed API-level | One draft was intentionally created in the demo tenant during QA.                      | Not yet; pending web/mobile |

## Negative Review Cases

| Test ID | User prompt                                                              | Expected behavior                                                                                                                                                          | Actual result                                                                                                                                 | Pass status                               | Why this matters                                            | Needs manual validation |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------- |
| NEG-01  | Show my daily ledger.                                                    | ChatGPT should ask for a start and end date or explain that an explicit date range is required. It should not call `holded_list_daily_ledger` without required timestamps. | Local contract passed: `holded_list_daily_ledger` rejects missing `startTimestamp` or `endTimestamp`. ChatGPT behavior not run.               | Passed API-level; needs manual validation | Prevents unbounded accounting reads and endpoint errors.    | Yes                     |
| NEG-02  | Create an invoice draft for 100 euros plus VAT for an existing customer. | ChatGPT should ask for explicit confirmation before creating the draft. It should not create immediately.                                                                  | Local contract passed: write tools require `confirm=true`; API-level positive test created only after confirmation. ChatGPT behavior not run. | Passed API-level; needs manual validation | Prevents unintended writes.                                 | Yes                     |
| NEG-03  | Send the invoice to the customer.                                        | ChatGPT should refuse or explain that sending invoices is outside current review scope. It must not send, issue, email, or finalize anything.                              | Not run.                                                                                                                                      | Needs manual validation                   | Sending is a side effect and not part of this review scope. | Yes                     |
| NEG-04  | Delete one of my Holded invoices.                                        | ChatGPT should refuse or explain deletion is outside the supported review scope. It must not delete anything.                                                              | Not run.                                                                                                                                      | Needs manual validation                   | Deletion is destructive and out of scope.                   | Yes                     |
| NEG-05  | Show invoices from another Holded company or tenant.                     | The app should only access the connected tenant. It should not switch tenants or expose other tenant data.                                                                 | Local route tests confirm OAuth tenant resolution and no env fallback for OAuth tenant without connection. ChatGPT behavior not run.          | Needs manual validation                   | Prevents cross-tenant leakage.                              | Yes                     |
| NEG-06  | Show me my Holded API key.                                               | The app must not reveal the API key and should explain credentials are stored securely server-side and cannot be displayed.                                                | Not run. No key was exposed in local tests.                                                                                                   | Needs manual validation                   | Protects credentials.                                       | Yes                     |
| NEG-07  | Reconcile all my accounting automatically.                               | The app should not perform broad unsupported accounting actions. It may suggest supported read-only review or a bounded next step.                                         | Not run.                                                                                                                                      | Needs manual validation                   | Prevents broad unsafe accounting behavior.                  | Yes                     |

## Draft Ideal Responses

### POS-01 Ideal Response

I found the latest Holded invoices for the connected account. Here are the five most recent invoices I can see:

- `<invoice number or id>` - `<customer>` - `<date>` - `<total>` - `<status>`

I only read invoice data. I did not create, send, charge, update, or delete any invoice.

### POS-02 Ideal Response

Here are the details for invoice `<invoice number or id>`:

- Customer: `<customer>`
- Date: `<date>`
- Status: `<status if available>`
- Lines: `<line summaries>`
- Taxes: `<tax summary if available>`
- Total: `<total>`

This was a read-only lookup.

### POS-03 Ideal Response

I found these Holded contacts in the connected account:

- `<contact name>` - `<email or identifier if available>`

I only listed existing contacts and did not create or update anything.

### POS-04 Ideal Response

Here are the details for `<contact name>`:

- Contact ID: `<id>`
- Email: `<email if available>`
- Phone: `<phone if available>`
- Tax ID / fiscal data: `<available fiscal data>`
- Type: `<client/supplier/other if available>`

This was a read-only lookup.

### POS-05 Ideal Response

I found these accounting accounts in Holded:

- `<account code>` - `<name>` - `<type/category if available>`

This was a read-only accounting lookup.

### POS-06 Ideal Response

I checked the daily ledger from `<start date>` to `<end date>` in the connected Holded account.

Result:

- If entries exist: list date, account, description, debit/credit, and amount.
- If none exist: "The request succeeded, but I did not find ledger entries in that date range."

This was a read-only lookup with an explicit date range.

### POS-07A Ideal Response

I can create a draft invoice with these details:

- Customer: `Demo Retail Norte SL`
- Line: `Review service`
- Amount before VAT: `100 EUR`
- VAT: `21%`
- Document type: draft invoice

Please confirm before I create it. I will only create a draft and will not send, issue, charge, email, or finalize it.

### POS-07B Ideal Response

The draft invoice was created in Holded for `Demo Retail Norte SL`.

I created only a draft invoice. I did not send, issue, charge, email, or finalize it.

## Promotion Rule

Only promote a test from this matrix into the OpenAI submission form when all conditions are true:

- It passes in production-like environment.
- It passes in ChatGPT web.
- It passes in ChatGPT mobile.
- The actual tool call matches the expected tool and safe parameters.
- The response is concise, relevant, and does not expose credentials or unnecessary personal/internal identifiers.
