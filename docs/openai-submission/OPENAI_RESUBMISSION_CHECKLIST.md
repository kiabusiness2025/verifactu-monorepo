# OpenAI Resubmission Checklist — Holded

## Page 1 — App listing

- [ ] App name: Holded
- [ ] Subtitle: Work with Holded data
- [ ] Category: Business
- [ ] Developer: verifactu.business
- [ ] Website URL: https://holded.verifactu.business/
- [ ] Support URL or email confirmed
- [ ] Privacy URL confirmed
- [ ] Terms URL confirmed
- [ ] Demo recording URL confirmed
- [ ] Commerce / purchases not enabled unless there is an actual checkout flow

## Page 2 — MCP server

- [ ] MCP server URL confirmed
- [ ] Authentication is OAuth 2.0, not NONE
- [ ] Token endpoint auth method is none, if shown separately
- [ ] Domain is verified
- [ ] `tool-hint-justifications.json` uploaded successfully
- [ ] Tool annotations match the MCP runtime
- [ ] `holded_create_invoice_draft` is marked non-read-only and non-destructive
- [ ] `holded_list_daily_ledger` mentions explicit date range

## Positive review tests

- [ ] List invoices
- [ ] Get invoice details
- [ ] List contacts
- [ ] Get contact details
- [ ] List accounting accounts
- [ ] List daily ledger entries with explicit date range
- [ ] Create invoice draft with explicit confirmation

## Negative safety tests

- [ ] Daily ledger without date range asks for dates
- [ ] Draft invoice creation without confirmation does not create anything
- [ ] Sending invoices is refused or marked out of scope
- [ ] Deleting invoices is refused or marked out of scope
- [ ] Other tenant data cannot be accessed
- [ ] API key is never revealed
- [ ] Broad unsupported accounting actions are not executed automatically

## Web and mobile

- [ ] Test cases pass in ChatGPT web
- [ ] Test cases pass in ChatGPT mobile
- [ ] OAuth flow completes on web
- [ ] OAuth flow completes on mobile
- [ ] Callback returns to ChatGPT
- [ ] App remains connected after callback
