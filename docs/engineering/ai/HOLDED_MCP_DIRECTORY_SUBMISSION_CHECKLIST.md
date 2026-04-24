# Holded MCP Directory Submission Checklist

Target server:

- `https://claude.verifactu.business`

MCP endpoint:

- `https://claude.verifactu.business/mcp`

## Policy Compliance Checklist

- [x] OAuth 2.0 required for all Holded tools
- [x] Unauthenticated MCP calls fail safely
- [x] Invalid bearer tokens fail safely
- [x] Invalid Holded API keys fail safely during authorization
- [x] Most tools are read-only
- [x] The only write-capable tool is `create_invoice_draft`
- [x] `create_invoice_draft` is explicitly draft-only
- [x] No payment execution
- [x] No money movement
- [x] No crypto
- [x] No destructive operations
- [x] No cross-service automation

## Technical Requirements Checklist

- [x] Canonical `BASE_URL` is `https://claude.verifactu.business`
- [x] OAuth metadata returns canonical HTTPS endpoints
- [x] Dynamic client registration is available
- [x] Authorization endpoint is available
- [x] Token endpoint is available
- [x] Revocation endpoint is available
- [x] MCP endpoint requires bearer auth
- [x] CORS preflight is handled for Claude browser auth flows
- [x] Favicon and public docs are served over HTTPS
- [ ] Production `DATABASE_URL` configured in Railway
- [ ] Production `OAUTH_DATA_ENCRYPTION_SECRET` configured in Railway

## Documentation Requirements Checklist

- [x] Public server overview
- [x] Public MCP endpoint documented
- [x] Claude.ai setup steps documented
- [x] OAuth flow documented
- [x] Public tool list with human-readable descriptions
- [x] Safety model documented
- [x] Public documentation link published
- [x] Privacy Policy link published
- [x] DPA link published where applicable
- [x] Support contact published
- [x] Troubleshooting section published

Public pages:

- `https://holded.verifactu.business/claude`
- `https://holded.verifactu.business/privacy`
- `https://holded.verifactu.business/dpa`
- `mailto:soporte@verifactu.business`

## Testing Requirements Checklist

- [x] Exact `tools/list` production surface covered
- [x] Safety annotations covered
- [x] Read-only tools marked `readOnlyHint: true`
- [x] Read-only tools marked `destructiveHint: false`
- [x] `create_invoice_draft` marked non-destructive and non-idempotent
- [x] Unauthenticated calls fail
- [x] Invalid auth fails
- [x] OAuth metadata returns canonical HTTPS URLs
- [x] CORS preflight works for Claude origins
- [x] No payment or destructive tools are exposed
- [ ] Production smoke test after final Railway deploy
- [ ] Verify Google favicon cache shows Holded logo after recrawl

## Exact Exposed Tools

Read-only:

- `list_documents`
- `get_document`
- `list_contacts`
- `get_contact`
- `list_crm_funnels`
- `list_leads`
- `list_products`
- `get_product`
- `list_warehouses`
- `list_projects`
- `get_project`
- `list_project_tasks`
- `list_time_records`
- `get_chart_of_accounts`
- `get_journal`
- `get_daily_book`
- `list_employees`
- `get_employee`
- `list_treasury_accounts`

Write-capable:

- `create_invoice_draft`

## Exact MCP Resources

- None exposed

## Exact MCP Prompts

- None exposed

## Known Non-goals

- no money movement
- no crypto
- no payment execution
- no destructive operations
- no cross-service automation

## Manual Submission Notes

- Anthropic form should declare that resources are not exposed.
- Anthropic form should declare that prompts are not exposed.
- Anthropic public documentation link should use `https://holded.verifactu.business/claude`.
- Anthropic privacy link should use `https://holded.verifactu.business/privacy`.
- Anthropic DPA link should use `https://holded.verifactu.business/dpa`.
- Server Logo URL should be verified against `https://www.google.com/s2/favicons?domain=claude.verifactu.business&sz=64`.
- If the Google favicon is stale, wait for recrawl after the latest favicon deploy before submission.
