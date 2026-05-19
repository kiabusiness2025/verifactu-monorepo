# Holded Connector Review Test Matrix

**Date:** 2026-04-29 (initial), 2026-05-04 (post-rejection), 2026-05-15 (controlled-errors wave), 2026-05-18 (post-rejection-2 + brotli fix + scope NARROWING), **2026-05-19 (matrix updated to include POS-08..POS-10 + UX cluster note)**
**Status:** ⏳ READY FOR RESUBMISSION v2 — surface NARROWED to 10 tools (`openai_review_invoicing_v1`: invoicing venta+compra + contactos + contabilidad), brotli silent-decoding bug fixed in `apps/app`, manifest `chatgpt-app-submission.json` aligned. **Manual ChatGPT web+mobile validation of the 10 tools** still required before resubmit.

## 🟢 2026-05-18 (afternoon) — Decision: narrow surface to invoicing + accounting only

After preparing a 29-tool expansion (`claude_parity`) earlier the same day, the product decision was to **narrow the OpenAI submission surface** to the minimum defendible set focused on invoicing (sales + purchases) plus accounting. Rationale:

- Submitting 29 tools at the same time as the brotli fix doubles the variables under review — if anything fails the reviewer would attribute it to the expansion, not the actual fix.
- Holded categories outside invoicing+accounting (CRM, projects, products, warehouses, treasury, employees, taxes, numbering) add demo-tenant dependencies that haven't been validated end-to-end in ChatGPT mobile.
- Once OpenAI approves submission v2 (10 tools), we open submission v3 with `claude_parity` (29 tools) as a clean follow-up.

### Current preset (`openai_review_invoicing_v1`, 10 tools)

| #   | Tool                          | Group                                                         |
| --- | ----------------------------- | ------------------------------------------------------------- |
| 1   | `holded_list_invoices`        | Sales invoicing                                               |
| 2   | `holded_get_invoice`          | Sales invoicing                                               |
| 3   | `holded_list_documents`       | Purchases + commercial docs (via `docType`)                   |
| 4   | `holded_get_document`         | Purchases + commercial docs                                   |
| 5   | `holded_get_document_pdf`     | Purchases + commercial docs (PDF rendering)                   |
| 6   | `holded_list_contacts`        | Contacts (needed for create_invoice_draft contact resolution) |
| 7   | `holded_get_contact`          | Contacts                                                      |
| 8   | `holded_list_accounts`        | Accounting (chart of accounts)                                |
| 9   | `holded_list_daily_ledger`    | Accounting (daily ledger, requires date range)                |
| 10  | `holded_create_invoice_draft` | Sales invoicing (single write, requires confirmation)         |

Removed from the 29-tool wave (will return in submission v3):

`holded_get_document_shipped_items`, `holded_list_products`, `holded_get_product`, `holded_list_warehouses`, `holded_get_warehouse`, `holded_list_warehouse_stock`, `holded_list_treasury_accounts`, `holded_get_treasury_account`, `holded_list_employees`, `holded_get_employee`, `holded_list_taxes`, `holded_list_numbering_series`, `holded_list_bookings`, `holded_list_crm_funnels`, `holded_list_leads`, `holded_list_projects`, `holded_get_project`, `holded_list_project_tasks`, `holded_list_time_records`.

### Test cases that survive

POS-01..POS-07 + POS-08..POS-10 (the 3 new ones for purchase documents / PDF). 10 positive + 6 negative = 16 cases total. POS-11..POS-22 are stashed in this document for reuse in submission v3.

### What still requires manual validation before submission

The 10 POS + 6 NEG cases need to be re-run on ChatGPT **web** AND **mobile** against the demo tenant. Run `node scripts/validate-openai-submission.mjs` locally first.

---

## 🟡 2026-05-18 (morning, superseded) — Scope expansion to claude_parity + brotli decoding fix

After the second OpenAI rejection (2026-05-18, same generic message as 2026-05-04: _"did not produce correct results"_), root-cause analysis identified two structural issues:

1. **Brotli silent decoding failure**: the upstream HTTP client in `apps/app/lib/integrations/accounting.ts` did not force `Accept-Encoding: identity`. Node fetch (undici) sends `br, gzip, deflate` by default; large Holded responses (`/documents`, `/contacts`, `/accounts`, `/dailyledger`) sometimes arrive with broken decompression behind Vercel's edge proxy → `safeJsonParse` returns `[]` or `null` → the reviewer sees "empty account" when the demo tenant actually has data. Intermittent by nature (datasets used in local QA are too small to hit it). **Fixed** in commit [08eb029](../../commit/08eb029a).

2. **14-tool surface was too narrow to demonstrate value**: review prompts that required `holded_list_documents` (commercial documents other than invoices), `holded_list_products`, `holded_list_warehouses`, etc. all surfaced as "tool not available" — the reviewer interpreted that as broken behaviour.

**Decision (2026-05-18):** expand `DEFAULT_PUBLIC_SCOPE_PRESET` from `openai_review_v2` (14 tools) to `claude_parity` (29 tools, all read-only except `holded_create_invoice_draft`). The manifest `tool-hint-justifications.json` was regenerated to match 1:1.

### Surface delta — 15 new read-only tools added

| Tool                                | Holded API surface             |
| ----------------------------------- | ------------------------------ |
| `holded_list_documents`             | All commercial document types  |
| `holded_get_document`               | One commercial document by id  |
| `holded_get_document_pdf`           | PDF rendering (base64)         |
| `holded_get_document_shipped_items` | Shipment status of a document  |
| `holded_list_products`              | Catalog products + services    |
| `holded_get_product`                | One product by id              |
| `holded_list_warehouses`            | Warehouse configuration        |
| `holded_get_warehouse`              | One warehouse by id            |
| `holded_list_warehouse_stock`       | Stock levels per warehouse     |
| `holded_list_treasury_accounts`     | Bank accounts + cash registers |
| `holded_get_treasury_account`       | One treasury account by id     |
| `holded_list_employees`             | HR employees                   |
| `holded_get_employee`               | One employee by id             |
| `holded_list_taxes`                 | Tax configuration              |
| `holded_list_numbering_series`      | Invoice/estimate numbering     |

The single write tool (`holded_create_invoice_draft`) is unchanged — the "broad read, minimal write" promise of the submission is preserved.

### What still requires manual validation before submission

The 14 original POS/NEG cases (POS-01..POS-07B, NEG-01..NEG-07) — see below — still need to be re-run on ChatGPT web AND mobile against the demo tenant. PLUS the 15 new tools need at least one happy-path prompt each. **Without this manual QA, do not resubmit.** OpenAI's reviewers test the actual ChatGPT UX, not the API harness.

### Suggested prompts for the 15 new tools (POS-08..POS-22)

| ID     | Prompt                                                           | Expected tool                       | Notes                                                                                    |
| ------ | ---------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| POS-08 | List my 5 most recent Holded purchase documents.                 | `holded_list_documents`             | Use `docType: "purchase"`. Verifies new commercial document surface.                     |
| POS-09 | Show me the details of document `<id from POS-08>`.              | `holded_get_document`               | Chained — uses an id returned by POS-08.                                                 |
| POS-10 | Download the PDF of that document.                               | `holded_get_document_pdf`           | Verifies base64 PDF passthrough. ChatGPT should expose a "Download" affordance.          |
| POS-11 | Has document `<id>` been shipped yet?                            | `holded_get_document_shipped_items` | Read-only shipment status lookup.                                                        |
| POS-12 | List my Holded products and tell me how many we have in catalog. | `holded_list_products`              | Tests pagination metadata + count summarization.                                         |
| POS-13 | Show me the details of product `<id from POS-12>`.               | `holded_get_product`                | Chained.                                                                                 |
| POS-14 | List my Holded warehouses.                                       | `holded_list_warehouses`            | Account may have only one warehouse — that is a valid non-empty result.                  |
| POS-15 | Show me warehouse `<id from POS-14>`.                            | `holded_get_warehouse`              | Chained.                                                                                 |
| POS-16 | List the current stock for the products in my Holded account.    | `holded_list_warehouse_stock`       | Returns one row per (product, warehouse). Reviewer should see numeric stock per product. |
| POS-17 | List my Holded treasury accounts (bank accounts and cash).       | `holded_list_treasury_accounts`     | Demo tenant has at least 2 treasury accounts.                                            |
| POS-18 | Show me treasury account `<id from POS-17>`.                     | `holded_get_treasury_account`       | Chained.                                                                                 |
| POS-19 | List my Holded employees.                                        | `holded_list_employees`             | Demo tenant has 1 employee.                                                              |
| POS-20 | Show me employee `<id from POS-19>`.                             | `holded_get_employee`               | Chained.                                                                                 |
| POS-21 | What VAT tax rates do I have configured in Holded?               | `holded_list_taxes`                 | Should return the standard ES tax rates (21%, 10%, 4%, 0%).                              |
| POS-22 | List my invoice numbering series.                                | `holded_list_numbering_series`      | Returns invoice + estimate series. Demo tenant has at least the default "F" series.      |

Each new POS case needs the same "Pass status" + "Safe for OpenAI submission" workflow as the 14 originals before promoting it to the form.

---

## 🟢 2026-05-15 — Controlled-errors wave + preset realignment

After the second round of soporte testing surfaced a follow-up batch of failures that all surfaced to the reviewer as the generic JSON-RPC `Internal MCP error -32000` (R4 hardening redacts crude messages), three changes landed in production:

### Runtime fixes (merged in [#80](https://github.com/kiabusiness2025/verifactu-monorepo/pull/80), deploy 2026-05-15 18:57 UTC)

| Behaviour                                                                                                     | Before                                                                                             | After                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `holded_get_invoice` / `holded_get_project` / `holded_list_project_tasks` with a non-existent or malformed id | `-32000 Internal MCP error. Reference: <uuid>`                                                     | `structuredContent.error = "not_found"` + readable message in `content[0].text`                                          |
| `holded_create_invoice_draft` (and every other write tool) called with `confirm: false`                       | `-32000 Internal MCP error.`                                                                       | `structuredContent.error = "confirmation_required"` + the existing instructional "Awaiting your confirmation..." text    |
| Holded API returns 403 on an optional module (e.g. CRM/bookings if the plan does not include it)              | The integration was marked `revoked` for the whole tenant and the user was told "Reconnect Holded" | The single tool returns `structuredContent.error = "holded_module_forbidden"`; the rest of the connector keeps working   |
| `holded_list_accounts` called with no `page`/`limit`                                                          | Returned the entire chart of accounts (~206 entries) inside `structuredContent` (heavy payload)    | Paginated by default (`page: 1, limit: 25`)                                                                              |
| `holded_list_invoices` with `year`/`from`/`to` against a tenant with no matching documents                    | Could hang the request for up to 12 sequential page scans; ChatGPT cut the tool call               | Honours `HOLDED_HISTORY_SCAN_BUDGET_MS` (default 7000ms) and returns a partial response with `history.reachedEnd: false` |

### Preset realignment (also in [#80](https://github.com/kiabusiness2025/verifactu-monorepo/pull/80))

`DEFAULT_PUBLIC_SCOPE_PRESET` reverted from `holded_full_read_v1` (22 tools, 2026-05-11 expansion) back to **`openai_review_v2`** — the preset the manifest is signed against. `tools/list` against `https://holded.verifactu.business/api/mcp/holded` now exposes the exact **14 tools** declared in `tool-hint-justifications.json`. Verified post-deploy:

```
PASS mcp.initialize — Holded Connector for ChatGPT v0.3.0
PASS mcp.tools_list.public — 14 tools expuestas sin token
Runtime: 14 tools | Manifest: 14 tools
In runtime but not in manifest: (none)
In manifest but not in runtime: (none)
Annotation diffs: (none — all annotations match)
```

### Supporting CI fixes (merged in [#81](https://github.com/kiabusiness2025/verifactu-monorepo/pull/81), 2026-05-15 18:51 UTC)

`pnpm/action-setup` version mismatch, `actions/upload-artifact@v3` deprecation, `apps/api` jest ESM transforms, `apps/holded-mcp` test endpoint count, prisma-generate scope, build-admin path filter, and Resend dummy env. None affect the connector runtime; all required for green CI on resubmission PRs.

### Source-of-truth in production (verified 2026-05-15)

| Surface                                                                                 | Status        |
| --------------------------------------------------------------------------------------- | ------------- |
| `https://holded.verifactu.business/`                                                    | 200           |
| `https://holded.verifactu.business/conectores/chatgpt`                                  | 200           |
| `https://holded.verifactu.business/conectores/chatgpt/docs`                             | 200           |
| `https://holded.verifactu.business/conectores/chatgpt/privacy`                          | 200           |
| `https://holded.verifactu.business/conectores/chatgpt/terms`                            | 200           |
| `https://holded.verifactu.business/conectores/chatgpt/dpa`                              | 200           |
| `https://holded.verifactu.business/conectores/chatgpt/openai-review-demo`               | 200           |
| `https://holded.verifactu.business/api/mcp/holded` (GET descriptor + POST JSON-RPC)     | 200           |
| `https://holded.verifactu.business/.well-known/oauth-authorization-server`              | 200, complete |
| `https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded` | 200           |

OAuth discovery includes `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `scopes_supported`, `response_types_supported`, `grant_types_supported`, `code_challenge_methods_supported` (S256).

### What remains before resubmission

Only **manual ChatGPT validation**:

- [ ] All 7 positive cases (POS-01..POS-07B below) pass in ChatGPT **web** with the connector authorized to the demo tenant.
- [ ] Same 7 cases pass in ChatGPT **mobile**.
- [ ] All 6 negative cases (NEG-01..NEG-06) behave as expected on both surfaces.
- [ ] Demo Holded API key rotated after final review.

Reproduction script for the four soporte regressions (independent of ChatGPT):

```
MCP_BEARER_TOKEN=<oauth_or_pat> pnpm holded:chatgpt:smoke
```

The four cases now report `resultado controlado "not_found"` / `"confirmation_required"` instead of `JSON-RPC error -32000`.

---

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
| POS-08  | List my 5 most recent Holded purchase documents.                                                                                              | `holded_list_documents`                                                                            | `{ "docType": "purchase", "page": 1, "limit": 5 }`                                                                                                                                                                                             | Retrieves commercial documents of type "purchase" from the connected tenant and summarizes them in natural language. Read-only.                                | API-level passed via brotli fix (PR #88).                                                                                                                                  | Passed API-level | New in submission v2.                                                                  | Not yet; pending web/mobile |
| POS-09  | Show me the details of one document from that list.                                                                                           | `holded_get_document`                                                                              | `{ "docType": "purchase", "documentId": "<id from POS-08>" }`                                                                                                                                                                                  | Retrieves details for one existing commercial document (supplier/customer, date, line items, taxes, totals, status). Read-only.                                | API-level passed. Chained from POS-08.                                                                                                                                     | Passed API-level | New in submission v2.                                                                  | Not yet; pending web/mobile |
| POS-10  | Get me the PDF of that document.                                                                                                              | `holded_get_document_pdf`                                                                          | `{ "docType": "purchase", "documentId": "<id from POS-08>" }`                                                                                                                                                                                  | Retrieves the PDF rendering of the document as a base64 payload. ChatGPT should expose a "Download" affordance.                                                | API-level passed. Verified base64 PDF passthrough.                                                                                                                         | Passed API-level | New in submission v2.                                                                  | Not yet; pending web/mobile |

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
