# Holded MCP Server — claude.verifactu.business

Official Holded connector for Claude, built on the **Model Context Protocol (MCP)** by Anthropic.
Lets Claude users access their Holded account data directly from the conversation.

## Architecture

```
Claude (claude.ai / Desktop / Mobile / API)
        │ POST /mcp  (Bearer token)
        ▼
claude.verifactu.business   ← this server
        │ key: {holded_api_key}
        ▼
api.holded.com
```

## Available modules

| Module         | Tools                                                                     | Mode         |
| -------------- | ------------------------------------------------------------------------- | ------------ |
| Invoicing      | `list_documents`, `get_document`, `create_invoice_draft`                  | Read + Draft |
| Contacts / CRM | `list_contacts`, `get_contact`, `list_crm_funnels`, `list_leads`          | Read-only    |
| Products       | `list_products`, `get_product`, `list_warehouses`                         | Read-only    |
| Projects       | `list_projects`, `get_project`, `list_project_tasks`, `list_time_records` | Read-only    |
| Accounting     | `get_chart_of_accounts`, `get_journal`, `get_daily_book`                  | Read-only    |
| Team           | `list_employees`, `get_employee`                                          | Read-only    |
| Treasury       | `list_treasury_accounts`                                                  | Read-only    |

## Quick start

### 1. Clone and configure

```bash
git clone https://github.com/verifactu/verifactu-monorepo
cd apps/holded-mcp
cp .env.example .env
# Edit .env with your real values
```

### 2. Generate secure secrets

```bash
# OAUTH_JWT_SECRET (minimum 32 chars)
openssl rand -hex 32

# OAUTH_CLIENT_SECRET
openssl rand -hex 24
```

### 3. Local development

```bash
pnpm install
pnpm dev
# Server at http://localhost:3000
```

### 4. Production with Docker

```bash
docker compose up -d
```

### 5. Configure subdomain

Add to your DNS:

```
claude.verifactu.business  CNAME  your-server.com
```

Traefik (see `docker-compose.yml`) handles TLS with Let's Encrypt automatically.

## Endpoints

| Endpoint                                      | Description                                |
| --------------------------------------------- | ------------------------------------------ |
| `GET /health`                                 | Server health check                        |
| `GET /.well-known/oauth-authorization-server` | OAuth discovery (required by Anthropic)    |
| `GET /oauth/authorize`                        | User consent page                          |
| `POST /oauth/authorize`                       | Processes the form and generates auth code |
| `POST /oauth/token`                           | Exchanges auth code for access token       |
| `POST /oauth/revoke`                          | Revokes a token                            |
| `POST /mcp`                                   | Main MCP endpoint (requires Bearer token)  |

## Manual test

```bash
# 1. Health check
curl https://claude.verifactu.business/health

# 2. OAuth discovery
curl https://claude.verifactu.business/.well-known/oauth-authorization-server

# 3. Simulate MCP call (with valid token)
curl -X POST https://claude.verifactu.business/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Testing in Claude (before submitting to directory)

1. Go to `claude.ai/settings/connectors`
2. Click **"Add custom connector"**
3. Name: `Holded (verifactu.business)`
4. URL: `https://claude.verifactu.business/mcp`
5. OAuth Client ID: value of `OAUTH_CLIENT_ID` in your `.env`
6. OAuth Client Secret: value of `OAUTH_CLIENT_SECRET`
7. Click **Add** → follow the OAuth flow → enter your Holded API key

## Submitting to the official Anthropic directory

Once the server is in production and tested:

1. Make sure you meet all requirements in the [MCP Directory Policy](https://support.claude.ai/en/articles/11697096-anthropic-mcp-directory-policy)
2. Prepare:
   - Public MCP server URL (`https://claude.verifactu.business/mcp`)
   - Privacy Policy at HTTPS URL (`https://holded.verifactu.business/privacy`)
   - Data Processing Agreement URL (`https://holded.verifactu.business/dpa`)
   - Test Holded account with dummy data for Anthropic QA
3. Submit the [directory submission form](https://docs.google.com/forms/d/e/1FAIpQLSeafJF2NDI7oYx1r8o0ycivCSVLNq92Mpc1FPxMKSw1CzDkqA/viewform)

## Pre-submission checklist

- [ ] All tools have `readOnlyHint: true` or `destructiveHint: true/false`
- [ ] Server publicly accessible via HTTPS
- [ ] `/.well-known/oauth-authorization-server` responds correctly
- [ ] Privacy Policy URL active
- [ ] DPA URL active
- [ ] Test account prepared with dummy data
- [ ] Rate limiting configured
- [ ] Production logs working

## Environment variables

| Variable                          | Description                    | Example                             |
| --------------------------------- | ------------------------------ | ----------------------------------- |
| `PORT`                            | Server port                    | `3000`                              |
| `BASE_URL`                        | Public server URL              | `https://claude.verifactu.business` |
| `OAUTH_JWT_SECRET`                | JWT signing secret (≥32 chars) | `openssl rand -hex 32`              |
| `OAUTH_TOKEN_TTL_SECONDS`         | Access token TTL               | `3600`                              |
| `OAUTH_REFRESH_TOKEN_TTL_SECONDS` | Refresh token TTL              | `2592000`                           |
| `OAUTH_CLIENT_ID`                 | Client ID for Claude           | `claude-holded-connector`           |
| `OAUTH_CLIENT_SECRET`             | Client secret for Claude       | `openssl rand -hex 24`              |
| `HOLDED_API_BASE`                 | Holded API base URL            | `https://api.holded.com`            |
| `RATE_LIMIT_WINDOW_MS`            | Rate limit window              | `60000`                             |
| `RATE_LIMIT_MAX_REQUESTS`         | Max requests per window        | `100`                               |
| `LOG_LEVEL`                       | Log verbosity                  | `info`                              |

## ⚠️ Production: use Redis for token storage

The current server stores tokens in memory (`Map`). For production with multiple instances, replace `auth.ts` to use **Redis** or **PostgreSQL**:

```typescript
// Example with Redis (install: pnpm add ioredis)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
// tokenStore.set(userId, record) → redis.setex(userId, TTL, JSON.stringify(record))
// tokenStore.get(userId) → JSON.parse(await redis.get(userId))
```

## License

MIT — verifactu.business
