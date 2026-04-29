# Holded Connector – OpenAI Review Checklist (Abril 2026)

## 1. Reviewer Notes (para OpenAI Platform)

**App under review:** Holded Connector for ChatGPT

This connector lets a user connect their own Holded account to ChatGPT through Verifactu OAuth and a server-side Holded API key connection flow.

**Scope for review:**
For this submission, please validate only the narrow public preset currently exposed by default:

- invoices
- contacts
- accounting accounts
- daily ledger
- invoice draft creation with explicit confirmation

**Important behavior notes:**

- The connector is closed-world and only accesses the authenticated tenant’s connected Holded account.
- Holded API keys are stored server-side and are never returned to the client.
- The public review preset is intentionally narrower than the full internal runtime.
- The daily ledger tool requires an explicit date range.
- Draft invoice creation requires explicit confirmation before write execution.

**Recommended review path:**

1. Open the connector.
2. Click “Connect with account”.
3. Complete the Holded connection flow.
4. After connection completes, run the test prompts listed below.
5. Please validate behavior on both ChatGPT web and mobile.

**What not to expect in this review:**

- Please do not evaluate broader internal capabilities, wide write actions, open web access, or universal advisor behavior in this submission.

---

## 2. Test Cases & Prompts

| #   | Prompt                                                                                                           | Tool                        | Expected Outcome                                     | RequestId | Result | Evidence |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------- | --------- | ------ | -------- |
| 1   | List my latest Holded invoices.                                                                                  | holded_list_invoices        | Returns a list of invoices for the connected tenant. |           |        |          |
| 2   | Show me the details of one invoice from the list you just found.                                                 | holded_get_invoice          | Returns details of a real invoice.                   |           |        |          |
| 3   | List my Holded contacts.                                                                                         | holded_list_contacts        | Returns a list of contacts.                          |           |        |          |
| 4   | Show me the details of one contact from that list.                                                               | holded_get_contact          | Returns details of a real contact.                   |           |        |          |
| 5   | List my main accounting accounts in Holded.                                                                      | holded_list_accounts        | Returns a list of accounting accounts.               |           |        |          |
| 6   | Show my Holded daily ledger entries from 2026-03-01 to 2026-03-31.                                               | holded_list_daily_ledger    | Returns ledger entries for the given range.          |           |        |          |
| 7   | Create a draft invoice for an existing customer for 100 euros plus VAT. Ask for confirmation before creating it. | holded_create_invoice_draft | Asks for confirmation, then creates a draft invoice. |           |        |          |

---

## 3. Expected Outcomes (for submission)

- The connector completes the full connect flow without showing tenant switch, dashboard handoff, or invalid request errors.
- The public tool list matches the review preset behavior.
- Invoice, contact, account, and daily ledger reads return tenant-scoped Holded data.
- Daily ledger queries succeed only when an explicit date range is provided.
- Draft invoice creation requires explicit confirmation before execution.
- The connector never returns the user’s Holded API key to the client.
- The same test cases pass consistently in ChatGPT web and mobile.

---

## 4. QA Checklist (internal, must pass before re-submit)

### A. Connection Flow

- [ ] Open Holded Connector for ChatGPT
- [ ] Click “Connect with account”
- [ ] Redirects to /onboarding/holded
- [ ] No visible login or tenant selector
- [ ] Paste valid API key
- [ ] Validation and server-side persistence
- [ ] Automatic return to OAuth flow
- [ ] ChatGPT is connected without error

### B. Technical Smoke

- [ ] /.well-known/oauth-authorization-server responds
- [ ] /.well-known/oauth-protected-resource/api/mcp/holded responds
- [ ] GET /api/mcp/holded responds
- [ ] POST /api/mcp/holded unauthenticated returns 401 + WWW-Authenticate

### C. Environment Configuration

- [ ] MCP_PUBLIC_SCOPE_PRESET=openai_review_v2
- [ ] No dependency on HOLDED_TEST_API_KEY in public
- [ ] MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS set
- [ ] INTEGRATIONS_SECRET_KEY, SESSION_SECRET, MCP_OAUTH_SECRET set

### D. Web & Mobile Validation

- [ ] Manual QA in ChatGPT web
- [ ] Manual QA in ChatGPT mobile
- [ ] Transition screens correct in both formats

### E. Evidence per Case

- [ ] For each test case, save: prompt, tool, expected, actual, screenshot/video, x-verifactu-request-id

---

## 5. What NOT to include in this review

- No bookings
- No project tasks
- No projects unless demo tenant is fully prepared

---

**Isaak (con K) – Abril 2026**

Este checklist debe cumplirse al 100% antes de re-submit a OpenAI.
