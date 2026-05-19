# Holded Connector OpenAI Review Test Audit

> ⚠️ **HISTÓRICO — 2026-04-29.** Este audit habla del preset `holded_priority1` como default del código, lo cual ya no es cierto: el default actual en [`apps/app/lib/oauth/mcp.ts`](../../apps/app/lib/oauth/mcp.ts) es `openai_review_invoicing_v1` (10 tools). También se refiere al app como "Holded Connector"; el display name en el portal es "Holded". Los hallazgos de este audit están todos cerrados — se conserva como traza histórica. **Para el estado actual usar [`OPENAI_RESUBMISSION_CHECKLIST.md`](OPENAI_RESUBMISSION_CHECKLIST.md) y [`HOLDED_REVIEW_TEST_MATRIX.md`](HOLDED_REVIEW_TEST_MATRIX.md).**

Date: 2026-04-29
App: Holded Connector
Purpose: prepare a narrow, deterministic re-submission pack for OpenAI App Review.

## Executive Summary

This audit found the expected Holded validation scripts and existing OpenAI review docs. After the demo key was provided by the user, it was loaded only into the process environment and live demo-tenant validation was executed.

To respect the security rule for this review, the key was not printed, committed, or written to tracked files. Live commands were run with `HOLDED_TEST_API_KEY` set in `process.env`.

Local mocked MCP/OAuth contract tests passed:

- `pnpm holded:ci:contract`: 1 suite, 30 tests passed.
- `pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/mcp/holded/route.test.ts lib/oauth/mcp.test.ts lib/integrations/holdedMcpScopes.test.ts`: 3 suites, 23 tests passed.

Live demo validation passed:

- `pnpm holded:demo:validate -- --smoke-only`: 105 checks passed, 0 failed.

API-level positive review cases passed against the demo tenant. The pack is still not ready for final OpenAI re-submit until ChatGPT web and mobile validation pass.

## OpenAI Review Guidance Checked

Official OpenAI sources checked on 2026-04-29:

- Submit and maintain your app: https://developers.openai.com/apps-sdk/deploy/submission
- App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines

Relevant review implications:

- Submission requires app metadata, MCP/tool information, screenshots, test prompts and expected responses.
- Rejections commonly happen when test cases do not produce correct results or do not pass on both ChatGPT web and mobile.
- Authenticated apps need a fully featured demo account with sample data and no inaccessible extra login steps.
- Tool names, descriptions, inputs, and annotations must match actual behavior.
- Side effects must be explicit, and read-only/write/destructive/open-world hints must be accurate.

## Available Package Scripts

| Script                 | Command                                                                                                    | What it validates                                                                                                                                                                         | Uses live Holded API | Mutates data                                                                                   | Safe for demo                                                                | Useful for OpenAI review                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `holded:ci:contract`   | `pnpm --filter verifactu-app test -- --runInBand --runTestsByPath lib/integrations/holdedMcpTools.test.ts` | MCP tool catalog alignment, scope map alignment, review preset alignment, argument normalization, daily ledger bounded range guard, list accounts default, write-tool confirmation guard. | No                   | No                                                                                             | Yes                                                                          | Yes. Fast local gate before every re-submit.                             |
| `holded:demo:seed`     | `node scripts/seed-holded-demo.mjs`                                                                        | Creates or verifies demo contacts, contact groups, products, services, and draft documents needed for demos.                                                                              | Yes                  | Yes, persistent but intended to be idempotent                                                  | Yes only against the internal demo tenant and only with the explicit env key | Useful only if demo data is missing. Do not use as a reviewer test case. |
| `holded:demo:smoke`    | `node scripts/holded-full-smoke.mjs`                                                                       | Broad live API smoke over many Holded endpoints, including reads and CRUD cleanup checks.                                                                                                 | Yes                  | Yes, creates/updates/deletes temporary records; some Holded resources archive or cannot delete | Safe only for internal demo tenant, not customer tenants                     | Useful for internal release confidence, too broad for OpenAI review.     |
| `holded:demo:validate` | `node scripts/holded-demo-regression.mjs`                                                                  | Runs seed plus smoke by default. Supports `--seed-only`, `--smoke-only`, `--dry-run-seed`.                                                                                                | Yes                  | Yes by default                                                                                 | Safe only with explicit env key and demo tenant                              | Useful before re-submit, but not as a public reviewer test case.         |

## Script Details

### `scripts/holded-env.mjs`

This loader checks credentials in this order:

1. `process.env.HOLDED_TEST_API_KEY`
2. `process.env.HOLDED_API_KEY`
3. `apps/holded/.env.local`
4. root `.env.local`

For this review, only step 1 is allowed. Because the env variable is missing and local env files exist, live commands were intentionally not executed.

### `scripts/seed-holded-demo.mjs`

Seed data declared by the script:

- Contacts:
  - Demo Retail Norte SL, code `DEMO-001`
  - Servicios Delta Tech SL, code `DEMO-002`
  - Construcciones Bahia 2030 SL, code `DEMO-003`
  - Clinica Horizonte Madrid, code `DEMO-004`
  - Logistica Atlas Demo SL, code `DEMO-005`
  - Studio Naranja Creative SL, code `DEMO-006`
- Contact groups:
  - Clientes recurrentes
  - Prospects asesoria
- Products and services:
  - Pack asesoria fiscal mensual
  - Migracion inicial de datos
  - Revision de tesoreria
  - Acompanamiento de cierre mensual
- Draft/demo documents:
  - Invoice for `DEMO-001`
  - Invoice for `DEMO-002`
  - Estimate for `DEMO-004`

This script mutates persistent demo data and should be run only if the demo tenant lacks stable data.

### `scripts/holded-full-smoke.mjs`

The smoke runner validates many APIs outside the OpenAI review scope:

- Reads: invoices/documents, contacts, products, chart of accounts, services, expense accounts, sales channels, warehouses, contact groups, treasury, payments, payment methods, remittances, taxes, numbering series.
- CRUD: contacts, products, services, expense accounts, sales channels, warehouses, contact groups, documents, numbering series, treasury, payments.

This is release-useful but too broad and mutating for the app submission test pack.

## Existing Review Documentation

| File                                                            | Finding                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/engineering/HOLDED_CONNECTOR_OPENAI_REVIEW_CHECKLIST.md`  | Already defines a narrow prompt list that matches the requested review direction. Needs live pass/fail evidence and web/mobile completion.                                                                                                                                    |
| `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md`             | Contains OpenAI registration values, tool annotation justifications, scope notes, and operational notes. It includes both historical `app.verifactu.business` and current `holded.verifactu.business` references, so reviewer-facing copy should be kept concise and current. |
| `docs/engineering/ai/HOLDED_DEMO_REGRESSION.md`                 | Documents the demo regression scripts and the distinction between local contract tests and live demo regression. It allows `.env.local`, which is not allowed for this re-submit task.                                                                                        |
| `docs/ops/runbooks/HOLDED_CHATGPT_LOGIN_FIRST_QA_2026-04-15.md` | Useful manual flow checklist for ChatGPT login-first, API key connection, and OAuth return.                                                                                                                                                                                   |
| `docs/ops/runbooks/HOLDED_CHATGPT_FLOW_STATUS_2026-04-15.md`    | Historical status document showing login-first and OAuth + API key activation changes.                                                                                                                                                                                        |

## Local Test Execution

### Passed

Command:

```powershell
pnpm holded:ci:contract
```

Result:

- Test suites: 1 passed.
- Tests: 30 passed.
- Coverage type: mocked/local contract only.
- Live Holded API: no.
- Mutations: no.

Command:

```powershell
pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/mcp/holded/route.test.ts lib/oauth/mcp.test.ts lib/integrations/holdedMcpScopes.test.ts
```

Result:

- Test suites: 3 passed.
- Tests: 23 passed.
- Coverage type: mocked/local MCP route, OAuth metadata helpers, scope presets.
- Live Holded API: no.
- Mutations: no.

### Not Run

Command:

```powershell
pnpm holded:demo:validate
```

Status: not run in default mode.

Reason: default mode runs seed plus smoke. To avoid unnecessary persistent demo-data mutation, the safer `--smoke-only` mode was used first.

Command:

```powershell
pnpm holded:demo:seed
```

Status: not run.

Reason: seed was not required. The demo tenant already has invoices, contacts, accounting accounts, and daily ledger data.

Command:

```powershell
pnpm holded:demo:smoke
```

Status: run through `pnpm holded:demo:validate -- --smoke-only`.

Result: 105 passed, 0 failed.

## Live Demo Validation Results

Command:

```powershell
pnpm holded:demo:validate -- --smoke-only
```

Result:

- Summary: 105 passed, 0 failed, 105 total checks.
- Live Holded API: yes.
- Key source in script output: `process.env`.
- Mutations: yes, temporary smoke-test entities were created and cleaned up where Holded allows cleanup.

Important observations:

- Invoices list returned 5 items.
- Contacts list returned 60 items.
- Chart of accounts returned 206 accounts when queried with `includeEmpty=1`.
- Daily ledger has a stable positive range from `2026-03-01` to `2026-03-31`, returning 82 entries.
- Daily ledger range `2026-04-01` to `2026-04-30` returned a successful empty result.
- Holded rejects ranges that exceed its maximum range policy, so review prompts must use a bounded explicit range.

## Demo Tenant Data Validation Status

Validated at API level in this run.

Confirmed data:

- At least one invoice exists. Example: `F0030` for `Kappa Digital Zaragoza SL`.
- At least one contact exists. Example: `Kappa Digital Zaragoza SL`.
- A valid contact suitable for invoice draft creation exists: `Kappa Digital Zaragoza SL`.
- Accounting accounts are available: 206 accounts returned.
- Daily ledger positive range: `2026-03-01` to `2026-03-31`, 82 entries returned.

Validated candidate data:

- Invoice detail test: use invoice `F0030` from the invoice list.
- Contact detail test: use `Kappa Digital Zaragoza SL` from the contacts list.
- Draft invoice test: use `Kappa Digital Zaragoza SL`.
- Daily ledger test: use `2026-03-01` to `2026-03-31`.

These candidates are API-level validated. They still need ChatGPT web and mobile validation before final submission.

## Scope and Release Risk

Important finding:

- `apps/app/lib/oauth/mcp.ts` currently sets `DEFAULT_PUBLIC_SCOPE_PRESET` to `holded_priority1` unless `MCP_PUBLIC_SCOPE_PRESET` is set.
- The requested review pack is narrower than `holded_priority1`.
- Existing docs say the re-submit should use `MCP_PUBLIC_SCOPE_PRESET=openai_review_v2`.

Release requirement before re-submit:

- Confirm production-like environment has `MCP_PUBLIC_SCOPE_PRESET=openai_review_v2`, or explicitly request the same narrow scopes in OpenAI Platform.
- Verify `tools/list` from ChatGPT only exposes the intended review-safe tool set for the token granted to the reviewer.
- Do not rely on code default if the production env can omit `MCP_PUBLIC_SCOPE_PRESET`.

## Security Notes

- No API key was printed.
- No API key was committed.
- No API key was written to tracked files.
- No logs containing the key were generated in this run.
- The key was loaded into `process.env` for the live commands and was not printed.
- After live testing, rotate the demo Holded API key before final re-submit or immediately after review completes.

## Recommendation

Do not re-submit until manual ChatGPT web and mobile QA is complete.

Next required gate:

1. Confirm production-like scope is narrowed to `openai_review_v2` or equivalent submitted scopes.
2. Run the positive and negative test matrix in ChatGPT web.
3. Run the same matrix in ChatGPT mobile.
4. Promote only consistently passing web and mobile cases into the OpenAI submission form.
5. Rotate the demo key after testing and/or after review.
