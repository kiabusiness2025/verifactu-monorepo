# Final Review Readiness Report

Date: 2026-04-29 (initial) · 2026-05-15 (controlled-errors wave + preset realignment)
App: Holded Connector

## 🟢 2026-05-15 update — runtime/manifest aligned, only ChatGPT manual QA pending

After the second wave of soporte testing (four cases returned `-32000 Internal MCP error` instead of controlled errors) and the discovery that production exposed a wider tool surface than the signed manifest (22 vs 14), the connector is now in a verified-aligned state:

- ✅ Runtime exposes exactly the **14 tools** declared in `tool-hint-justifications.json` (`DEFAULT_PUBLIC_SCOPE_PRESET = openai_review_v2` in [apps/app/lib/oauth/mcp.ts:97](../../apps/app/lib/oauth/mcp.ts)).
- ✅ Annotations on every runtime tool match the manifest (`readOnlyHint`, `destructiveHint`, `openWorldHint`).
- ✅ The four soporte-reported regressions return controlled errors:
  - `holded_get_invoice` / `holded_get_project` / `holded_list_project_tasks` with non-existent or malformed ids → `structuredContent.error = "not_found"`.
  - `holded_create_invoice_draft` with `confirm: false` → `structuredContent.error = "confirmation_required"`.
- ✅ 401 (revoked credential) and 403 (module not contracted in the Holded plan) are now separated; a 403 on a single tool no longer marks the whole integration as revoked.
- ✅ Latency safeguards: `HOLDED_HISTORY_SCAN_BUDGET_MS` (7s default) limits the historical document scan, `holded_list_accounts` paginates by default (25/page) — both prevent the silent "ChatGPT cut the tool call" symptom soporte reported as "blocked by security".
- ✅ All 10 public URLs return 200 (landing, docs, privacy, terms, dpa, demo, MCP endpoint, OAuth discovery, protected-resource metadata).
- ✅ OAuth discovery JSON is well-formed with every field OpenAI looks for (issuer, authorization/token/registration endpoints, scopes, response_types, grant_types, S256).

PRs merged for this wave:
- [#80](https://github.com/kiabusiness2025/verifactu-monorepo/pull/80) — controlled errors + preset revert (deployed via Vercel 2026-05-15 18:57 UTC).
- [#81](https://github.com/kiabusiness2025/verifactu-monorepo/pull/81) — CI infrastructure (pnpm version, jest ESM, prisma scope, build-admin path filter, Resend dummy env) — prerequisite for #80 to reach `main`.

What's left before clicking Resubmit:

1. **Manual ChatGPT web validation** of POS-01..POS-07B + NEG-01..NEG-06 (no automated substitute — OpenAI tests the actual ChatGPT flow).
2. **Same manual run on ChatGPT mobile.** Mobile-specific rendering issues were the bulk of the 2026-05-04 rejection.
3. (Optional) **Rotate the demo Holded API key** before/after the review.

There are no remaining code, infra, or doc gaps identifiable from outside ChatGPT's UI.

---

## 2026-04-29 baseline — What Was Tested

Local mocked contract and MCP/OAuth tests were executed:

- MCP tool catalog and scope alignment.
- Public OpenAI review preset alignment.
- Daily ledger required timestamp range.
- Chart of accounts include-empty default.
- Draft invoice payload normalization.
- Write-tool `confirm=true` guard.
- MCP route authentication behavior.
- OAuth metadata helper behavior.
- Scope preset behavior.

Official OpenAI submission guidance was checked for review requirements, common rejection reasons, test credential requirements, and tool annotation expectations.

Live demo-tenant API validation was also executed:

- Broad Holded smoke validation.
- Positive review API checks for invoices, invoice details, contacts, contact details, accounting accounts, daily ledger, and draft invoice creation after confirmation.

## What Passed

Command:

```powershell
pnpm holded:ci:contract
```

Result:

- 1 test suite passed.
- 30 tests passed.

Command:

```powershell
pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/mcp/holded/route.test.ts lib/oauth/mcp.test.ts lib/integrations/holdedMcpScopes.test.ts
```

Result:

- 3 test suites passed.
- 23 tests passed.

Confirmed locally:

- The tool wrapper requires `startTimestamp` and `endTimestamp` for `holded_list_daily_ledger`.
- The tool wrapper uses `includeEmpty=true` for account listing by default.
- Write tools use `confirm=true` guards.
- OAuth-mode MCP calls resolve credentials by tenant and do not fall back to env test keys when the OAuth tenant has no Holded connection.
- Missing scope prevents tool execution.

Command:

```powershell
pnpm holded:demo:validate -- --smoke-only
```

Result:

- 105 checks passed.
- 0 checks failed.

Confirmed against the demo tenant:

- Invoice list returned 5 invoices.
- Invoice detail returned for `F0030`.
- Contact list returned 60 contacts.
- Contact detail returned for `Kappa Digital Zaragoza SL`.
- Chart of accounts returned 206 accounts.
- Daily ledger range `2026-03-01` to `2026-03-31` returned 82 entries.
- One draft invoice was created only in the confirmed write step. No send, issue, charge, email, finalize, or delete action was executed.

## What Failed or Was Blocked

Blocked:

- ChatGPT web validation was not run from Codex.
- ChatGPT mobile validation was not run from Codex.
- Production-like scope still needs explicit confirmation as `openai_review_v2` or equivalent submitted scopes.

Not executed:

- `pnpm holded:demo:validate`
- `pnpm holded:demo:seed`

Reason:

The default validation command runs seed plus smoke. Seed was not needed because the demo tenant already has stable data. Smoke was executed through the safer `--smoke-only` path.

## Recommended Test Cases for Submission

None yet for final submission.

The candidate positive test cases passed API-level validation, but none is marked final-safe because ChatGPT web and ChatGPT mobile were not validated.

## Candidate Test Cases to Promote After Live QA

Promote only after each passes on production-like, ChatGPT web, and ChatGPT mobile:

- POS-01: list latest 5 invoices with `holded_list_invoices`.
- POS-02: get invoice `F0030` by id with `holded_get_invoice`.
- POS-03: list contacts and include `Kappa Digital Zaragoza SL` with `holded_list_contacts`.
- POS-04: get `Kappa Digital Zaragoza SL` by id with `holded_get_contact`.
- POS-05: list accounting accounts with `holded_list_accounts`.
- POS-06: list daily ledger from `2026-03-01` to `2026-03-31` with `holded_list_daily_ledger`.
- POS-07A/POS-07B: create invoice draft only after explicit confirmation with `holded_create_invoice_draft`.

## Excluded Test Cases and Why

Excluded from the main submission pack:

- Bookings: not deterministic enough for this review pack.
- Projects and project tasks: explicitly outside the requested review priority.
- PDF generation: broader binary/file behavior, not needed for this re-submit.
- Sending invoices: external side effect, out of scope.
- Issuing/finalizing invoices: out of scope and higher risk.
- Charging/registering payments: out of scope and higher risk.
- Deleting invoices or documents: destructive, out of scope.
- Broad accounting reconciliation: too broad and unsupported.
- Isaak product behavior: separate product behavior, not part of Holded Connector review.

## Remaining Risks

1. Production scope may be broader than the review pack if `MCP_PUBLIC_SCOPE_PRESET` is not set to `openai_review_v2`.
2. The code default in `apps/app/lib/oauth/mcp.ts` is `holded_priority1`, which is broader than the requested review scope.
3. Existing `openai_review_v2` still includes bookings/projects/project tasks in the allowed tool set, although they are intentionally excluded from the submitted review tests.
4. ChatGPT may choose different tool arguments than expected unless prompts are bounded and tested on both web and mobile.
5. Natural-language answers may include unnecessary identifiers unless the model output is manually reviewed.
6. Demo credentials may fail review if they require inaccessible MFA, email verification, SMS, or admin approval.
7. The draft invoice test creates one persistent draft in the demo tenant each time it is fully confirmed.

## Exact Next Steps Before Re-Submit

1. Confirm production-like scope:

- `MCP_PUBLIC_SCOPE_PRESET=openai_review_v2`, or
- OpenAI Platform scopes are explicitly narrowed to the candidate review tools.

2. Run a guarded env check before any additional live commands:

```powershell
if ([string]::IsNullOrWhiteSpace($env:HOLDED_TEST_API_KEY)) { throw 'HOLDED_TEST_API_KEY must be set in process.env' }
```

3. Run local contract tests again:

```powershell
pnpm holded:ci:contract
pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/mcp/holded/route.test.ts lib/oauth/mcp.test.ts lib/integrations/holdedMcpScopes.test.ts
```

4. Run live demo validation safely if code or data changed:

```powershell
pnpm holded:demo:validate -- --smoke-only
```

5. If required demo data is missing, run a dry-run seed first:

```powershell
pnpm holded:demo:validate -- --seed-only --dry-run-seed
```

6. If the dry-run is safe, seed the demo tenant:

```powershell
pnpm holded:demo:seed
```

7. Re-run live validation:

```powershell
pnpm holded:demo:validate -- --smoke-only
```

8. Use the stable IDs and date range validated in this run:

- invoice: `F0030`
- contact/customer: `Kappa Digital Zaragoza SL`
- daily ledger: `2026-03-01` to `2026-03-31`

9. Verify production-like scope:

- `MCP_PUBLIC_SCOPE_PRESET=openai_review_v2`
- OpenAI Platform default scopes match the intended review scope.
- `tools/list` from the reviewer token does not expose broad write/destructive tools.

10. Run the positive and negative test matrix on ChatGPT web.
11. Run the same matrix on ChatGPT mobile.
12. Update `OPENAI_SUBMISSION_COPY_PASTE_PACK.md` so only passed and safe positive tests appear in the final recommended submission section.
13. Rotate the demo Holded API key after testing and/or after review completes.

## Readiness Decision

The app is API-level ready but not ready for OpenAI re-submission until manual ChatGPT web/mobile QA passes.

Reason:

- ChatGPT web validation is missing.
- ChatGPT mobile validation is missing.
- Production-like scope must be verified as narrowed for review.

READY_AFTER_MANUAL_WEB_MOBILE_QA
