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

## Logo upload (recommended: SVG)

Anthropic's submission guide says: _"server logo (URL or SVG upload)"_. **Upload the SVG directly** — this forces a fresh asset with zero cache crossover from prior submissions.

- **File to upload:** `apps/holded-mcp/public/holded-square.svg` (Holded diamond on transparent background, 512×512 viewBox).
- **If the form only accepts a URL:** `https://holded-claude.verifactu.business/holded-diamond-logo.png` (MD5 `d4a3694f`, served from the new subdomain with no prior interaction with Anthropic's cache).

---

## Pre-submission checklist

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
- [x] Standard testing account preparada (sección "Page 4" arriba)
- [x] 3+ working example prompts (5 cubiertos)
- [x] Logo SVG cuadrado listo para subir
- [ ] **Hacer la submission** ← acción pendiente del operador
