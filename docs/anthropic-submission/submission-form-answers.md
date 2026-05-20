# Anthropic Remote MCP Submission — Form-by-form copy-paste

> **Última actualización: 2026-05-20 — submission v2 desde `holded-claude.verifactu.business`.**
>
> Este documento sigue la estructura **exacta** del Google Form de Anthropic en https://claude.com/docs/connectors/building/submission. Cada bloque está listo para copy-paste literal sin cambios.
>
> Cambios respecto a v1: server name `Holded` → `Holded for Claude`, MCP URL `claude.verifactu.business` → `holded-claude.verifactu.business`. Razón: purgar branding legacy cacheado por Anthropic (ver `docs/engineering/HOLDED_CLAUDE_BRANDING_RESET_2026-05-20.md`).

---

## Page 1 — Server Information

### Server Name

```
Holded for Claude
```

### MCP Server URL

```
https://holded-claude.verifactu.business/mcp
```

### Tagline (max 55 characters)

```
Holded invoices, contacts & accounting in Claude
```

(48/55 chars. Alternativa ES: `Facturas, contactos y contabilidad de Holded en Claude` — 54/55.)

### MCP Server Description (50-100 words)

```
Holded is the all-in-one business management platform used by 100,000+ SMBs in Spain and Europe for invoicing, accounting, CRM, projects, and inventory. This connector lets Claude read your Holded data in natural language — sales and purchase invoices, contacts, chart of accounts, daily ledger entries, and document PDFs — and create invoice drafts with your explicit confirmation. Drafts are never issued, sent, charged, or transmitted to tax authorities automatically: you review and approve them in the Holded UI before any legal effect.
```

(82 words.)

### Use Cases + Examples (at least 3)

**Use Case 1 — Revenue insights from sales invoices**

- Prompt: `How much did I invoice last month? Show me my top 3 clients by revenue.`
- Value: Instant financial insights without opening Holded or building reports manually.
- Tools called: `list_documents` (docType=invoice, date filter) + Claude-side aggregation.

**Use Case 2 — Customer 360 from a name**

- Prompt: `Show me Acme S.L.'s contact info, tax ID, and any pending invoices.`
- Value: Centralized lookup by customer name. Claude resolves the contact and pulls related data into one answer.
- Tools called: `list_contacts` (search by name) → `get_contact` (full details) → `list_documents` (filter by contactId).

**Use Case 3 — Invoice drafts with explicit confirmation**

- Prompt: `Create a draft invoice for Beta Studios for €1,500 + 21% VAT for consulting services.`
- Value: Reduce manual data entry. Claude prepares the draft, shows exactly what will be created, waits for explicit "yes" before any write. Drafts land in Holded as DRAFT only — never sent, charged, or finalized.
- Tools called: `list_contacts` (resolve "Beta Studios") → `create_invoice_draft` (only after explicit confirmation).

**Use Case 4 — Accounting summary by date range**

- Prompt: `Summarize February's journal entries — total revenue, expenses, and VAT collected.`
- Value: On-demand accounting summaries without exporting CSVs.
- Tools called: `get_journal` (with explicit startDate + endDate).

**Use Case 5 — Download document PDFs**

- Prompt: `List my Q1 purchase invoices and give me the PDF of the most recent one.`
- Value: Retrieve auditable PDFs straight from chat.
- Tools called: `list_documents` (docType=purchase, Q1) → `get_document_pdf` (most recent ID).

### Connection requirements

```
Users need an active Holded account (https://holded.com — free trial available; paid plans for production use) and must generate a Holded API key from their Holded panel: Configuración → Desarrolladores → API (admin role required to generate the key). No Verifactu account is required upfront — a User+Tenant are created during the OAuth consent flow on first connect, with explicit acceptance of Terms, Privacy, and DPA. Available globally; optimized for Spain/EU businesses (Holded is primarily an EU SMB platform with localized invoicing and accounting for ES/EU tax frameworks).
```

### Read/Write Capabilities

**☑ Read + Write**

(7 read-only tools + 1 write tool `create_invoice_draft`. The write tool requires `confirm: true` from the user before execution and forces `approveDoc=false` at the wire level — drafts never auto-issue.)

### Is this an "MCP App" (has interactive UI elements)?

**☑ No**

(Server exposes only standard MCP tools. No interactive UI, no cards, no `prompts` or `resources`.)

### Third-party Connections and Web Access

**☑ N/A**

(The connector calls only the Holded API of the authenticated user's tenant. No open-web browsing, no third-party AI models, no aggregation from multiple sources, no fan-out writes.)

### Data Handling (check all that apply)

- ☑ Server only accesses data explicitly requested by user
- ☐ ~~No data is stored beyond session requirements~~ _(do NOT check — we persist User/Tenant records and an encrypted Holded API key so the user doesn't re-enter credentials each session)_
- ☑ Data transmission is encrypted (HTTPS/TLS)
- ☑ GDPR compliant (if applicable)

### Personal health data?

**☑ No**

### Categories

- ☑ **Business & Productivity** (primary)
- ☑ **Financial Services** (secondary)

### Sponsored content / advertisements?

**☑ No, there is no sponsored content or advertisements**

---

## Page 2 — Authentication Details

### Authentication Type

**☑ OAuth 2.0**

### Auth Client

**☑ Dynamic OAuth Client (e.g., DCR, CIMD)**

(Implements RFC 7591 Dynamic Client Registration. Endpoint: `https://holded-claude.verifactu.business/oauth/register`.)

### Static Client ID / Static Client Secret

_(leave blank — DCR-only)_

### Transport Support

- **☑ Streamable HTTP** (MCP spec 2025-03-26)
- ☐ SSE _(not supported — per Anthropic's recommendation, server is Streamable HTTP only)_

### Reference OAuth metadata (informational, not asked in form)

- Issuer: `https://holded-claude.verifactu.business`
- Authorization endpoint: `/oauth/authorize`
- Token endpoint: `/oauth/token`
- Registration endpoint: `/oauth/register` (DCR)
- Revocation endpoint: `/oauth/revoke`
- Discovery: `/.well-known/oauth-authorization-server`
- Protected resource metadata: `/.well-known/oauth-protected-resource`
- PKCE: S256 mandatory
- Scopes: `holded:read`, `holded:write`
- Redirect URI allowlist: `claude.ai`, `app.claude.ai`

---

## Page 3 — Documentation & Support

### MCP Server Documentation Link

```
https://holded.verifactu.business/conectores/claude/docs
```

### Privacy Policy

```
https://holded.verifactu.business/conectores/claude/privacy
```

### Data Processing Agreement URL (if applicable)

```
https://holded.verifactu.business/conectores/claude/dpa
```

### Support Channel

```
https://holded.verifactu.business/conectores/claude/soporte
```

(That page hosts a contact form + Isaak chat + visible email `soporte@verifactu.business` as fallback.)

---

## Page 4 — Testing Account Credentials

> The form says: "If your integration is gated by auth, please provide standard testing credentials, with sample data, so Anthropic can verify the integration's functionality and compliance with policies. You can use client credentials (if supported) or a custom email (as long as 2FA is not required). If an accessible email is required for a test account (e.g., for Google OAuth or 2FA), use mcp-review@anthropic.com."

### Testing Account Credentials

```
Email for the consent screen: mcp-review@anthropic.com
(per Anthropic guidance — our flow uses an email-based one-time login link as identity verification, not 2FA)

Holded API key (paste at the consent screen when prompted): 0ecf1267eacc89ff45acab1b8ca28396

This API key is dedicated to review use and rotated after each cycle.
```

### Test Account Server URL (if different from main)

_(leave blank — same as main: `https://holded-claude.verifactu.business/mcp`)_

### Test Account Setup Instructions

```
1. Add this MCP server to Claude: https://holded-claude.verifactu.business/mcp
2. Claude redirects to the Verifactu OAuth consent screen.
3. Enter email: mcp-review@anthropic.com
4. Check that inbox for the one-time login link and click it (email-based identity verification — NOT 2FA, no app or phone needed)
5. Paste the Holded API key: 0ecf1267eacc89ff45acab1b8ca28396
6. Accept the Terms, Privacy Policy, and DPA checkboxes
7. Click "Conectar" — OAuth completes, Claude receives the access token, the connector is live.

The demo Holded tenant has stable seed data:
- 60+ contacts (including "Kappa Digital Zaragoza SL" for testing)
- 5+ sales invoices (most recent: F0030)
- 5+ purchase documents (commercial documents with docType=purchase)
- 206 accounting accounts (chart of accounts)
- Daily ledger entries for 2026-03-01 to 2026-03-31 (82 entries)

Quick verification prompts — each maps to one tool:
- "List my latest Holded sales invoices." → list_documents(docType=invoice)
- "Show me my Holded contacts and find Kappa Digital Zaragoza SL." → list_contacts + get_contact
- "List my chart of accounts." → get_chart_of_accounts
- "Show my Holded journal entries from 2026-03-01 to 2026-03-31." → get_journal
- "Give me the PDF of invoice F0030." → list_documents + get_document_pdf
- "Create a draft invoice for Kappa Digital Zaragoza SL for €100 + 21% VAT. Ask for confirmation before creating it." → create_invoice_draft (validates the explicit confirmation flow — Claude must NOT call the tool before the user confirms)

Notes:
- Data and UI are primarily in Spanish (Holded is an EU SMB platform); Claude can summarize in any language.
- The connector is tenant-scoped: only reads/writes against the demo tenant connected via the API key above.
- No destructive operations are exposed (no delete, no send, no charge, no AEAT/Verifactu transmission).
- create_invoice_draft always sends approveDoc=false to Holded at the wire level, so drafts are never auto-issued.
```

### Test Data Availability

- ☑ Test account includes sample data
- ☑ All tools can be tested with provided data

---

## Page 5 — Server Technical Details

### List of tools in your MCP Server

> Format: `tool_name (human-readable name)`, comma-separated.

```
list_documents (List documents — sales invoices, purchases, credit notes, estimates, sales receipts, etc., filtered by docType), get_document (Get document details by type and ID), get_document_pdf (Download document PDF as base64), list_contacts (List contacts — customers, suppliers, debtors), get_contact (Get contact details by ID), get_chart_of_accounts (Chart of accounts), get_journal (Accounting daily ledger entries; requires explicit date range), create_invoice_draft (Create a sales invoice in DRAFT state; requires explicit user confirmation and forces approveDoc=false at the wire level — never auto-issues)
```

### Tool Titles & Annotations

- ☑ I've specified user-friendly titles for all tools in my server
- ☑ I've specified accurate tool annotations for all tools in my server

(Annotations defined centrally in `apps/holded-mcp/src/tools/policy.ts`: 7 tools with `readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false`; `create_invoice_draft` with `readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false`. Verifiable end-to-end via `tools/list` JSON-RPC against the live MCP endpoint.)

### List of resources in your MCP Server

_(leave blank — none. This server exposes tools only, no MCP resources.)_

### List of prompts in your MCP Server

_(leave blank — none. This server exposes tools only, no MCP prompts.)_

---

## Page 6 — Launch & Branding

### Timeline - Server GA Date

```
(leave blank — server already in GA since April 2026, no future date applies)
```

If the form forces a date, enter `2026-04-01` (initial production launch month).

### Confirm testing is complete & your server works as intended in:

- ☑ **Claude.ai (web)** — tested live during this sprint
- ☐ Claude Desktop — not tested by us
- ☐ Claude Code — not tested by us (note: per form copy, not required)
- ☐ Cowork — not tested (not required)

> Mark only Claude.ai (web). Adding Desktop without testing risks rejection if the reviewer probes it. Other surfaces can be added in a post-approval iteration.

### Server Logo SVG (upload option)

**Upload this file from the repo:**

```
apps/holded-mcp/public/holded-square.svg
```

1:1 aspect ratio (square viewBox), vector SVG with transparent background, Holded coral diamond (`#FF5454`), ~1.6 KB. Anthropic's submission guide accepts SVG upload as the preferred branding asset.

### Server Logo URL

```
https://holded-claude.verifactu.business/holded-diamond-logo.png
```

(MD5 `d4a3694f`, PNG of the Holded coral diamond, served from the new subdomain with `Cache-Control: public, max-age=86400, immutable` + `X-Icon-Version: holded-diamond-2026-05-19` header.)

### ☐ "I have verified that the favicon is correct"

**DO NOT CHECK** at the time of submission (verified live 2026-05-20):

| Test                                                                               | Result                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `https://www.google.com/s2/favicons?domain=holded-claude.verifactu.business&sz=64` | HTTP 404 → 16×16 generic PNG fallback    |
| `https://www.google.com/s2/favicons?domain=holded.verifactu.business&sz=64`        | HTTP 200 → 64×64 PNG with Holded diamond |

Google has not yet indexed the new subdomain. Marking this would be false. The SVG upload above is the authoritative branding source — Anthropic's form provides it as a path precisely for cases like ours.

**Parallel actions to encourage Google indexing** (optional, post-submission):

1. Submit `https://holded-claude.verifactu.business/` to Google Search Console.
2. The MCP server now serves `/sitemap.xml` and `/robots.txt` (PR commit `217472bf3`) so Google can discover content.
3. Anthropic's manual review can override the favicon path if the SVG upload is present.

### Promotional Images of MCP Server (3-5 PNG)

**Status: pending capture.** The branding-assets.md doc references mock screenshots that don't exist in the repo. The operator should capture screenshots from a live Claude.ai session post-PR #102 reconnect.

Recommended captures (PNG, ≥1000px wide, cropped to Claude response only, no browser chrome):

| #       | Prompt in Claude.ai                                                                                    | Captures                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1       | `List my latest Holded sales invoices.`                                                                | Tool call `list_documents` + invoice list with numbers/customers/totals                                             |
| 2       | `Show me Kappa Digital Zaragoza SL with CIF, email and pending invoices.`                              | Tool chain `list_contacts` → `get_contact` → consolidated response                                                  |
| 3       | `Create a draft invoice for Kappa Digital Zaragoza SL for €100 + 21% VAT. Ask for confirmation first.` | **Confirmation step** — Claude shows the draft summary and waits for "yes". This is the safety-flagship screenshot. |
| 4 (opt) | `Show my Holded journal entries from 2026-03-01 to 2026-03-31.`                                        | `get_journal` with ledger entries table                                                                             |
| 5 (opt) | `Give me the PDF of invoice F0030.`                                                                    | `get_document_pdf` + PDF download affordance                                                                        |

If no time to capture before submission: this section is **not blocking** — leave blank. Anthropic can approve without screenshots; the directory listing is less attractive but functional.

### Link to Promotional Materials

```
(leave blank if uploading PNGs directly above)
```

Alternative: Google Drive folder link with the 3-5 screenshots + paired prompts. Set "anyone with the link can view" so Anthropic can fetch.

---

## Page 7 — Submission Requirements Checklist (final gate)

> All items in Policy Compliance / Technical / Documentation / Testing must be confirmed before submission.

### Policy Compliance — 5 items

- [ ] **I have reviewed and agree to the Software Directory Policy** — operator action; read https://support.claude.com/en/articles/13145358 before marking.
- [x] **My server does NOT enable cross-service automation** — connector only calls Holded API; no workflows across multiple services.
- [x] **My server does NOT transfer money, cryptocurrency, or execute financial transactions** — `create_invoice_draft` creates a DRAFT document; no money movement, no payment processing, no charge. Forced `approveDoc=false` ensures the document has no legal effect until the user manually approves it in Holded UI.
- [x] **My MCP server is live, published, and ready to accept production traffic** — `holded-claude.verifactu.business/mcp` in Vercel production since 2026-05-20 (alias of existing build). HTTPS, returns 401 without Bearer, full OAuth flow operational.
- [x] **I work for the company that owns or controls the API endpoint(s) that my server connects to** — ✅ **YES.** Expert Estudios Profesionales, SLU (our legal entity, brand `Verifactu Business`) is an **official Holded Solution Partner certified by Holded** — see the public listing in Holded's own partners directory: https://www.holded.com/es/directorio-solution-partners/expert-estudios-profesionales. The partnership requires signing Holded's collaboration agreement and completing Holded's official certification, which grants formal authorization to integrate with and resell Holded services. Additionally, Expert Estudios owns the MCP server endpoint, the OAuth authorization server, and all surrounding infrastructure at `holded-claude.verifactu.business`. Both layers (the MCP we publish + the Holded API we call) are covered by formal authorization.

### Technical Requirements — 6 items

- [x] **OAuth 2.0 fully implemented for ALL tools requiring authentication** — OAuth 2.1 with PKCE S256, DCR (RFC 7591), refresh tokens (RFC 6749), revocation (RFC 7009). All tools require Bearer.
- [x] **All tools include proper safety annotations (readOnlyHint, destructiveHint)** — defined centrally in `apps/holded-mcp/src/tools/policy.ts`. 8 tools, all annotated.
- [x] **Server is accessible via HTTPS (not HTTP)** — Vercel with valid SSL cert, TLS 1.2+ enforced.
- [x] **CORS is properly configured for browser-based authentication** — `apps/holded-mcp/src/middleware/cors.ts` allows Claude.ai origins (claude.ai, app.claude.ai) for the OAuth callback flow.
- [x] **Claude.ai and Claude Code IP addresses are allowlisted (if applicable)** — "if applicable" not applicable: we do not IP-restrict. Public HTTPS endpoint for any caller.
- [ ] **I have tested this works with Claude.ai on the latest build** — operator must validate post-PR #102 by reconnecting and running the 5 verification prompts (Page 4).

### Documentation Requirements — 4 items

- [x] **Complete server documentation is published and publicly accessible** — `https://holded.verifactu.business/conectores/claude/docs` (200 OK).
- [x] **Documentation includes setup instructions, tool descriptions, and troubleshooting guide** — verified 2026-05-20: docs page contains Configuración, Cómo conectar, Preguntas frecuentes, and error/troubleshooting sections.
- [x] **Company privacy policy is published and accessible** — `https://holded.verifactu.business/conectores/claude/privacy` (200 OK).
- [x] **Terms of service are published and accessible** — `https://holded.verifactu.business/conectores/claude/terms` (200 OK).

### Testing Requirements — 3 items

- [x] **Test account with sample data is ready** — Demo Holded tenant + API key `0ecf1267eacc89ff45acab1b8ca28396` + seed data documented on Page 4 (60+ contacts, F0030 invoice, 206 chart accounts, 82 ledger entries for 2026-03).
- [x] **Test credentials are valid for at least 30 days** — Holded API keys are long-lived; commitment: no rotation during the review window (~2 weeks + buffer).
- [ ] **All server tools are functional and tested in the surfaces in which they'll be available** — limited to Claude.ai (web) per Page 3 selection. Operator must run the 6 verification prompts post-reconnect to confirm.

### Additional Information (final free-text)

```
Submission context — Expert Estudios Profesionales, SLU (brand: Verifactu Business) → "Holded for Claude" connector (May 2026)

1. Authorized Holded Solution Partner — formal upstream authorization.

Expert Estudios Profesionales, SLU (Spanish entity) is an officially certified Holded Solution Partner. Public listing in Holded's own partners directory:

   https://www.holded.com/es/directorio-solution-partners/expert-estudios-profesionales

The partnership is formal, not a public-API arrangement: we have signed Holded's collaboration agreement and completed Holded's official certification program, which authorizes us to integrate with, implement, and resell Holded services for end customers. This covers both the MCP server we publish at holded-claude.verifactu.business (which we own and operate) and the upstream Holded API the server calls on behalf of authenticated users. Each end-user provides their own per-tenant API key generated from their own Holded admin panel (Configuración → Desarrolladores → API); we never access other tenants' data.

2. Branding caching from prior product brand — why a fresh subdomain.

This connector previously shipped under the legacy "Verifactu Business" product brand from claude.verifactu.business (icons used: a navy "V" mark and a blue shield with checkmark — both uploaded by our team years ago when the product was first launched as Verifactu Business). All legacy assets have been removed from our origin since December 2025 (commit 2ea8e783e). However, Claude.ai's UI continued to display those legacy icons on the connector chip and pre-connect surface, indicating that Anthropic's infrastructure cached the assets server-side before deletion and does not re-scrape custom (non-Directory) connectors.

To deliver clean branding for this submission, we migrated the connector to a new subdomain — holded-claude.verifactu.business — that has zero prior interaction with Anthropic's cache. All public assets (favicon.ico, manifest.json theme colors, OAuth metadata logo_uri, DCR response logo_uri) now serve the canonical Holded coral diamond. We have also added /sitemap.xml and /robots.txt to encourage indexing.

One operational note: Google's s2/favicons service does not yet index the new subdomain (HTTP 404 as of 2026-05-20). Please use the SVG we upload directly in this form rather than fetching from Google's favicon service. The legacy claude.verifactu.business subdomain is preserved as a parallel alias in Vercel during the transition to avoid breaking any existing connections.

3. Tool surface intentionally narrow for first review.

The MCP server exposes 8 tools (preset HOLDED_MCP_TOOL_PRESET=submission_v1):

   • 7 read-only: list_documents, get_document, get_document_pdf, list_contacts, get_contact, get_chart_of_accounts, get_journal
   • 1 write: create_invoice_draft — requires explicit user confirmation (confirm: true parameter) AND forces approveDoc=false at the wire level when calling Holded. Drafts are never auto-issued, sent, charged, emailed, finalized, or transmitted to tax authorities (AEAT / Verifactu). The user must review and approve the draft in the Holded UI before any legal effect.

The remaining 16 tools from our internal catalog (CRM/leads, projects/tasks/time records, products/stock, treasury accounts, employees, taxes, numbering series, additional document types) are implemented but gated behind the preset and not registered in tools/list. We plan to expose them in a post-approval submission v2 once this initial review is approved.

4. Cross-platform parity.

We submitted the same integration to OpenAI's ChatGPT App Directory (10-tool variant — same functional coverage, list_invoices and list_documents split for ChatGPT vs Claude's polymorphic list_documents). Pending OpenAI review. Submitting to Anthropic now to reach Spanish/EU SMB businesses already using Claude.

5. Operator information.

Legal entity: Expert Estudios Profesionales, SLU (Spain)
Brand: Verifactu Business
Holded partner directory: https://www.holded.com/es/directorio-solution-partners/expert-estudios-profesionales
Support: soporte@verifactu.business
Escalation (in case the form route is unavailable): partnerships@anthropic.com referencing this submission.
```

---

## Logo upload (recommended: SVG)

Anthropic's submission guide says: _"server logo (URL or SVG upload)"_. **Upload the SVG directly** — this forces a fresh asset with zero cache crossover from prior submissions, and bypasses the Google s2/favicons gap (Google has not yet indexed the new subdomain).

- **File to upload:** `apps/holded-mcp/public/holded-square.svg` (Holded diamond on transparent background, 1:1 viewBox).
- **If the form only accepts a URL:** `https://holded-claude.verifactu.business/holded-diamond-logo.png` (MD5 `d4a3694f`, served from the new subdomain with no prior interaction with Anthropic's cache).

---

## Pre-submission checklist (operator-facing)

- [x] OAuth funcional con PKCE S256
- [x] Redirect URIs allowlist (claude.ai + app.claude.ai)
- [x] Todas las tools con `readOnlyHint` o `destructiveHint`
- [x] Privacy + T&C + DPA URLs públicos
- [x] Docs URL público
- [x] HTTPS (TLS 1.2+) en todos los endpoints
- [x] Origin-header validation en CORS
- [x] No está en beta — producción desde abril 2026
- [x] Subdomain nuevo `holded-claude.verifactu.business` operativo y BASE_URL aplicado
- [x] OAuth bridge bug fixed (PR #102 commit `047dd166` — sanitize allowlist incluye nuevo subdominio)
- [x] `/sitemap.xml` y `/robots.txt` servidos (encourage Google indexing)
- [x] Standard testing account preparada (sección "Page 4")
- [x] 3+ working example prompts (5 cubiertos)
- [x] Logo SVG cuadrado listo para subir
- [ ] **Reconectar `Holded for Claude` en Claude.ai post-merge** y validar las 6 verification prompts
- [ ] **Capturar 3-5 PNG screenshots** del connector funcionando (opcional pero recomendado)
- [ ] **Hacer la submission del Google Form** ← acción pendiente del operador
