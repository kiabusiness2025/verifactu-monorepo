# Holded MCP Server

Remote MCP server for Claude at `https://claude.verifactu.business`.

## Runtime

- MCP endpoint: `https://claude.verifactu.business/mcp`
- OAuth metadata: `https://claude.verifactu.business/.well-known/oauth-authorization-server`
- OAuth authorize: `https://claude.verifactu.business/oauth/authorize`
- OAuth token: `https://claude.verifactu.business/oauth/token`
- OAuth register: `https://claude.verifactu.business/oauth/register`

## Tools

- Invoicing: `list_documents`, `get_document`, `create_invoice_draft`
- Contacts / CRM: `list_contacts`, `get_contact`, `list_crm_funnels`, `list_leads`
- Products: `list_products`, `get_product`, `list_warehouses`
- Projects: `list_projects`, `get_project`, `list_project_tasks`, `list_time_records`
- Accounting: `get_chart_of_accounts`, `get_journal`, `get_daily_book`
- Team: `list_employees`, `get_employee`
- Treasury: `list_treasury_accounts`

## Branding

Canonical Holded logo source:

- `apps/holded/public/brand/holded/holded-diamond-logo.png`

Runtime branding files served by `holded-mcp`:

- `apps/holded-mcp/public/holded-diamond-logo.png`
- `apps/holded-mcp/public/favicon.png`
- `apps/holded-mcp/public/logo.svg`
- `apps/holded-mcp/public/claude.svg`

Branding rules:

- the OAuth consent page and landing page must render Holded branding from these runtime files
- `favicon.png` and `holded-diamond-logo.png` are intentionally identical
- `logo.svg` is also aligned to Holded branding to cover clients that probe `/logo.svg`
- the server also serves Holded icon aliases on `/logo.png`, `/icon.png`, `/icon.svg`, and `/apple-touch-icon.png`

Observed Claude behavior on `2026-04-23`:

- the OAuth page can show the correct Holded + Claude logos while Claude still renders a generic shield icon in the connector list/details view
- we did not find a documented server-side icon metadata field in the Anthropic custom connector flow for URL-based custom connectors
- until Anthropic documents icon metadata support, treat the generic shield tile as a Claude UI fallback rather than a runtime branding regression

## Local development

```bash
git clone https://github.com/verifactu/verifactu-monorepo
cd apps/holded-mcp
cp .env.example .env
pnpm install
pnpm dev
```

## Environment variables

| Variable                          | Description                                   |
| --------------------------------- | --------------------------------------------- |
| `PORT`                            | Server port                                   |
| `BASE_URL`                        | Public server URL                             |
| `OAUTH_JWT_SECRET`                | JWT signing secret                            |
| `OAUTH_TOKEN_TTL_SECONDS`         | Access token TTL                              |
| `OAUTH_REFRESH_TOKEN_TTL_SECONDS` | Refresh token TTL                             |
| `OAUTH_CLIENT_ID`                 | Legacy static client ID for compatibility     |
| `OAUTH_CLIENT_SECRET`             | Legacy static client secret for compatibility |
| `HOLDED_API_BASE`                 | Holded API base URL                           |
| `RATE_LIMIT_WINDOW_MS`            | Rate limit window                             |
| `RATE_LIMIT_MAX_REQUESTS`         | Max requests per window                       |
| `LOG_LEVEL`                       | Log verbosity                                 |

## Claude setup

Current setup in Claude custom connectors:

1. Open `claude.ai/settings/connectors`.
2. Add a custom connector.
3. Use only the MCP server URL: `https://claude.verifactu.business/mcp`.
4. Let Claude discover OAuth dynamically from server metadata.
5. Complete the OAuth page and enter the Holded API key.

Expected behavior:

- Claude discovers OAuth endpoints from `/.well-known/oauth-authorization-server`
- the consent page is served from `https://claude.verifactu.business/oauth/authorize`
- the consent page shows Holded on the left and Claude on the right
- tool permissions can be configured in Claude after connecting

Operational recovery:

- if Claude reuses stale OAuth state, remove and recreate the connector
- if the tile still shows a generic shield after recreation, do not treat that alone as a server branding failure unless the OAuth page is also wrong

## Permissions

Observed in Claude:

- Claude exposes per-tool permission controls after connect

Practical implication for this server:

- keep tool names stable
- keep read/write boundaries explicit
- keep annotations and descriptions narrow so permission UIs stay understandable

## Stateless OAuth

Access tokens and refresh tokens are self-contained JWTs embedding the Holded API key. Dynamic client registration is also stateless, so OAuth does not depend on in-memory client storage across redeploys.
