# Holded MCP Server

Remote HTTPS MCP server for Claude.ai and Anthropic MCP Directory submission.

- Public base URL: `https://claude.verifactu.business`
- MCP endpoint: `https://claude.verifactu.business/mcp`
- OAuth metadata: `https://claude.verifactu.business/.well-known/oauth-authorization-server`
- Public docs: `https://holded.verifactu.business/conectores/claude/docs`
- Privacy Policy: `https://holded.verifactu.business/conectores/claude/privacy`
- Data Processing Agreement: `https://holded.verifactu.business/conectores/claude/dpa`
- Terms: `https://holded.verifactu.business/conectores/claude/terms`
- Support page: `https://holded.verifactu.business/conectores/claude/soporte`
- Support email: `mailto:soporte@verifactu.business`

These pages live in the Next.js app at `holded.verifactu.business/conectores/claude/*`. The MCP server exposes `/docs`, `/privacy`, `/dpa`, `/terms`, `/support`, `/soporte` as **301 redirects** to those canonical URLs — no content is duplicated on the MCP server.

Operational runbook:

- `apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md`

Submission checklist:

- `docs/engineering/ai/HOLDED_MCP_DIRECTORY_SUBMISSION_CHECKLIST.md`

## Overview

This server connects Claude to a user's own Holded account through OAuth 2.0 and a user-provided Holded API key.

Safety scope:

- most tools are read-only
- the only write-capable tool is `create_invoice_draft`
- `create_invoice_draft` creates a draft invoice only
- the server does not expose payment execution, money movement, crypto, destructive operations, or cross-service automation

## Public Surface

Runtime endpoints:

- `GET /health`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/oauth-protected-resource`
- `GET /docs` → 301 to holded.verifactu.business/conectores/claude/docs
- `GET /privacy` → 301 to holded.verifactu.business/conectores/claude/privacy
- `GET /dpa` → 301 to holded.verifactu.business/conectores/claude/dpa
- `GET /terms` → 301 to holded.verifactu.business/conectores/claude/terms
- `GET /support` → 301 to holded.verifactu.business/conectores/claude/soporte
- `GET /soporte` → 301 to holded.verifactu.business/conectores/claude/soporte
- `GET|POST /oauth/authorize`
- `POST /oauth/register`
- `POST /oauth/token`
- `POST /oauth/revoke`
- `POST /mcp`

## Exposed Tools

Read-only tools:

- `list_documents`: list invoices, quotes, orders and other Holded documents
- `get_document`: read one document in detail
- `get_document_pdf`: read one document as a base64-encoded PDF
- `list_contacts`: list Holded contacts
- `get_contact`: read one contact in detail
- `list_crm_funnels`: list CRM funnels
- `list_leads`: list CRM leads or opportunities
- `list_products`: list products and services
- `get_product`: read one product in detail
- `list_products_stock`: list current stock levels per product and warehouse
- `list_warehouses`: list warehouse locations (without stock; use list_products_stock for stock)
- `list_taxes`: list VAT and other tax IDs configured in Holded
- `list_numbering_series`: list numbering series configured in Holded
- `list_projects`: list projects
- `get_project`: read one project in detail
- `list_project_tasks`: list project tasks
- `list_time_records`: list project time records
- `get_chart_of_accounts`: read the chart of accounts
- `get_journal`: read journal entries
- `get_daily_book`: read the daily accounting book
- `list_employees`: list employees
- `get_employee`: read one employee in detail
- `list_treasury_accounts`: list treasury accounts and balances

Write-capable tool:

- `create_invoice_draft`: create a draft invoice only; it does not issue, send, pay, delete, finalize, or destructively modify invoices, and the user must review the draft in Holded before taking any further action

Not exposed:

- invoice delete/update/send/finalize tools
- payment tools
- money transfer tools
- crypto tools
- cross-service automation tools

## Authentication

All Holded tools require OAuth 2.0.

Current behavior:

- unauthenticated `POST /mcp` requests fail with `401`
- invalid bearer tokens fail with `401`
- the authorization page validates the Holded API key before issuing an authorization code
- dynamic client registration is available at `POST /oauth/register`
- authorization code flow supports PKCE `S256`
- token exchange is available at `POST /oauth/token`
- token revocation is available at `POST /oauth/revoke`

OAuth storage modes:

- with `DATABASE_URL`, authorization codes plus access and refresh tokens are stored in PostgreSQL, refresh rotation is real, and revocation invalidates the session
- without `DATABASE_URL`, the server falls back to stateless JWT tokens for compatibility

Security notes:

- Holded API keys stored for OAuth sessions are encrypted at rest with `OAUTH_DATA_ENCRYPTION_SECRET`
- if `OAUTH_DATA_ENCRYPTION_SECRET` is not set, the server falls back to `OAUTH_JWT_SECRET`

## CORS

Browser auth compatibility is enabled for Claude origins while staying narrow by default.

Allowed origins:

- same origin from `BASE_URL`
- `https://claude.ai`
- `https://app.claude.ai`
- any extra origins listed in `CORS_ALLOWED_ORIGINS`

Handled headers and methods include:

- `Authorization`
- `Content-Type`
- `Mcp-Session-Id`
- `Mcp-Protocol-Version`
- `Last-Event-ID`
- `GET`, `POST`, `OPTIONS`, `DELETE`

## Branding

Canonical Holded brand source:

- `apps/holded/public/brand/holded/holded-diamond-logo.png`

Runtime brand assets served by this app:

- `public/holded-diamond-logo.png` — canonical source for all icon variants
- `public/favicon.ico` — multi-size ICO (64/48/32/16 px), generated from holded-diamond-logo.png
- `public/favicon.png` — 64×64 PNG, generated from holded-diamond-logo.png
- `public/icon.png` — 64×64 PNG, generated from holded-diamond-logo.png
- `public/logo.png` — 256×256 PNG, generated from holded-diamond-logo.png
- `public/apple-touch-icon.png` — 180×180 PNG, generated from holded-diamond-logo.png
- `public/logo.svg`
- `public/claude.svg`

Icon routes in `src/app.ts`:

- All icon routes (`/favicon.ico`, `/favicon.png`, `/icon.png`, `/logo.png`, `/apple-touch-icon.png`, `/holded-diamond-logo.png`) are registered **before** `express.static()` so physical files in `public/` never bypass them.
- Each route sets `Cache-Control: no-cache, must-revalidate`, `Pragma: no-cache`, and `X-Icon-Version: holded-diamond-2026-05-03` to prevent stale icon caching.
- `/favicon.ico` is served as `image/x-icon` (real multi-frame ICO); all PNG routes use `image/png`.

OAuth metadata:

- `logo_uri` in `/.well-known/oauth-authorization-server` includes a `?v=holded-diamond-2026-05-03` version query to force Claude to re-fetch the icon on each metadata crawl.

To regenerate all icons from the canonical source:

```powershell
cd apps/holded-mcp/public
magick holded-diamond-logo.png -resize 64x64 favicon.png
magick holded-diamond-logo.png -resize 64x64 icon.png
magick holded-diamond-logo.png -resize 256x256 logo.png
magick holded-diamond-logo.png -resize 180x180 apple-touch-icon.png
magick holded-diamond-logo.png -define icon:auto-resize=64,48,32,16 favicon.ico
```

Brand sync:

- `pnpm --dir apps/holded-mcp sync:brand`

Validate branding:

- `pnpm --dir apps/holded-mcp validate-branding`

**Important:** If Claude.ai shows an unexpected icon, first check whether it matches the _old_ custom blue connector icon from the first version of this connector. If it does, treat it as stale cached metadata — not a generic Claude fallback. To clear it:

1. Uninstall the connector from Claude.ai
2. If using Claude Team/Enterprise, also remove it under Organization Settings > Connectors
3. Clear your Claude session (sign out, clear browser cache, sign back in)
4. Reinstall at `https://claude.verifactu.business/mcp`
5. Verify public icon URLs are correct: `https://claude.verifactu.business/holded-diamond-logo.png`, `/favicon.ico`, `/icon.png`
6. Check Google's favicon cache: `https://www.google.com/s2/favicons?domain=claude.verifactu.business`
7. Only treat it as the generic Claude fallback if the displayed icon does not match any old asset and all public branding URLs return the correct Holded diamond image

Observed Claude behavior on `2026-04-23`:

- the OAuth page can show the correct Holded and Claude logos while Claude still renders a generic shield icon in some connector list or tool call surfaces
- treat that shield as a Claude UI fallback unless the assets served by `claude.verifactu.business` are also wrong

## Local Development

```bash
cd apps/holded-mcp
cp .env.example .env
pnpm install
pnpm dev
```

## Environment Variables

| Variable                          | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `PORT`                            | Server port                                            |
| `NODE_ENV`                        | `development`, `production` or `test`                  |
| `BASE_URL`                        | Canonical public base URL                              |
| `CORS_ALLOWED_ORIGINS`            | Extra comma-separated origins allowed for browser auth |
| `DATABASE_URL`                    | PostgreSQL URL for persistent OAuth state              |
| `OAUTH_JWT_SECRET`                | Signing secret for stateless OAuth artifacts           |
| `OAUTH_DATA_ENCRYPTION_SECRET`    | Secret used to encrypt stored Holded API keys          |
| `OAUTH_AUTH_CODE_TTL_SECONDS`     | Authorization code TTL                                 |
| `OAUTH_TOKEN_TTL_SECONDS`         | Access token TTL                                       |
| `OAUTH_REFRESH_TOKEN_TTL_SECONDS` | Refresh token TTL                                      |
| `OAUTH_CLIENT_ID`                 | Static compatibility client ID                         |
| `OAUTH_CLIENT_SECRET`             | Static compatibility client secret                     |
| `HOLDED_API_BASE`                 | Holded API base URL                                    |
| `RATE_LIMIT_WINDOW_MS`            | Rate limit window                                      |
| `RATE_LIMIT_MAX_REQUESTS`         | Max requests per window                                |
| `LOG_LEVEL`                       | `debug`, `info`, `warn` or `error`                     |

## Claude.ai Setup

1. Open `claude.ai/settings/connectors`.
2. Add a custom connector.
3. Use only `https://claude.verifactu.business/mcp`.
4. Let Claude discover OAuth dynamically from `/.well-known/oauth-authorization-server`.
5. Complete the authorization page with the user's own Holded API key.

Expected result:

- Claude discovers the tool list automatically
- Claude shows per-tool permissions
- most tools appear as read-only
- `create_invoice_draft` remains the only write-capable tool

## Testing

Run locally:

```bash
pnpm --dir apps/holded-mcp exec tsc --noEmit --pretty false
pnpm --dir apps/holded-mcp build
pnpm --dir apps/holded-mcp test
```

Current automated coverage:

- exact production tool surface
- safety annotations for every exposed tool
- draft-only description and non-destructive annotations
- unauthenticated and invalid auth failures
- canonical OAuth metadata URLs
- CORS preflight for OAuth and MCP endpoints
- dynamic client registration and token exchange
- invalid Holded API key failure path

## Deployment Notes

Before Anthropic submission, production should have:

- `BASE_URL=https://claude.verifactu.business`
- a real `DATABASE_URL`
- a real `OAUTH_DATA_ENCRYPTION_SECRET`
- a real `OAUTH_JWT_SECRET`
- a real `OAUTH_CLIENT_SECRET`

Recommended after deploy:

- verify `GET /.well-known/oauth-authorization-server`
- verify `GET /docs` redirects to `https://holded.verifactu.business/conectores/claude/docs`
- verify `https://www.google.com/s2/favicons?domain=claude.verifactu.business&sz=64`
- reconnect the Claude custom connector once if external icon caches are stale
