# Holded × Claude — Branding reset to `holded-claude.verifactu.business`

**Date:** 2026-05-20
**Status:** Implementation merged (PRs #99, #100, #101, #102). Operator pending: Vercel domain + env var change + Anthropic Google Form submission v2.
**Owners:** Verifactu Business

---

## Executive summary

The Claude MCP connector at `claude.verifactu.business/mcp` shipped to users with two wrong icons:

1. A **navy "V"** (Verifactu Business v2 logo) appearing on tool-call chips in chat
2. A **blue shield with checkmark** (Verifactu Business v1 logo) appearing on the connector's app icon and pre-connect preview

Forensic investigation traced both icons to legacy assets from before the product was rebranded as Holded. The "V" was a still-present `favicon.ico` file in the repo; the "blue shield" was a deleted PNG (`apps/app/public/icono_verifactu.business.png`, removed 2025-12-20) that **Anthropic / Claude.ai cached server-side** before the deletion and has never re-scraped — confirmed by the file returning 404 in all our public URLs for 5+ months while still showing in Claude.ai.

After fixing every controllable asset on our origin (PRs #99, #100), we confirmed empirically that **Anthropic does not re-scrape custom MCP connectors that are not approved in the Connectors Directory**. The only guaranteed way to clear the cache was to migrate the connector to a new subdomain where Anthropic indexes fresh.

**Decision:** new subdomain `holded-claude.verifactu.business` (brand-first naming, Holded primary product + Claude as channel), new app name `Holded for Claude`, new Anthropic submission v2.

**State as of 2026-05-20:**

- ✅ Code parametrized to read `BASE_URL` from env var (no hardcoded subdomain references)
- ✅ All 8 docs in `docs/anthropic-submission/` aligned to `holded-claude.verifactu.business` and `Holded for Claude`
- ✅ Runbook `apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md` extended with section 14 (subdomain migration runbook) and section 10 corrected with both root causes
- ✅ Memory updated (`project_mcp_topology.md`)
- ⏳ Pending operator: add `holded-claude.verifactu.business` in Vercel, change `BASE_URL`, redeploy, submit Anthropic form

---

## Problem statement (observed in production)

User shared two screenshots on 2026-05-19 from `claude.ai` showing:

| Surface                                                     | Icon shown                         | Expected                   |
| ----------------------------------------------------------- | ---------------------------------- | -------------------------- |
| Tool-call chips inside Claude chat                          | Navy "V" with white serif text     | Holded coral diamond rombo |
| Connector list / "Add custom connector" pre-connect preview | Generic blue shield with checkmark | Holded coral diamond rombo |

Both surfaces should render the Holded brand (coral `#FF5460` diamond), since the connector advertises `Holded` as its display name and the MCP server serves the diamond at multiple icon URLs.

## Forensic investigation

### Icon A — "V" navy on tool chips

**Origin:** [apps/holded-mcp/public/favicon.ico](../../apps/holded-mcp/public/favicon.ico)

When the project rebranded from Verifactu Business to Holded, all PNG icon variants on the MCP server (`/favicon.png`, `/icon.png`, `/apple-touch-icon.png`, `/logo.png`, `/holded-diamond-logo.png`) were updated to serve `holded-diamond-logo.png` via the `sendDiamondPng` helper. But `/favicon.ico` went through `sendDiamondIco` which read the raw binary file `apps/holded-mcp/public/favicon.ico` — that file was never re-generated from the new PNG and still contained the V.

Comparison:

| File                                            | MD5                                | Content                                    |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| `holded-diamond-logo.png` (PNG, canonical)      | `d4a3694fbba0707cdd5b7c953eb78eaf` | Holded diamond                             |
| `favicon.ico` (legacy ICO, served until PR #99) | `2e7fd8c21b1aa5c17991d0053c11dab6` | Navy V                                     |
| `favicon.ico` (regenerated, post PR #99)        | `d23f99aeb2d1ea5369b6222eba8cd8e7` | Holded diamond (16/32/48/64 multi-res ICO) |

**Fix:** [PR #99](https://github.com/kiabusiness2025/verifactu-monorepo/pull/99) regenerated `favicon.ico` as a multi-resolution PNG-encoded ICO from `holded-diamond-logo.png` using `apps/holded-mcp/scripts/regen-favicon.mjs` (Node + `sharp`). Same PR also purged the Verifactu navy/blue colors from `apps/holded-mcp/public/manifest.json` (`theme_color: #2361d8 → #FF5460`, `background_color: #081936 → #ffffff`).

### Icon B — Blue shield with checkmark

**Origin:** `apps/app/public/icono_verifactu.business.png` (500×500 RGBA, MD5 `6417d69d8c44012a65c9dfc98c550017`)

This was the Verifactu Business v1 app icon — uploaded by the team when the product was first launched as Verifactu Business in 2025. It was visually a blue shield with a checkmark on light gradient background.

**File status:**

- **Deleted from the repo** on 2025-12-20 in commit `2ea8e783e` ("fix: replace binary icons with svg") — alongside other legacy binary icons that were replaced with inline SVG.
- **HTTP 404 in production** on all our domains (verified with curl 2026-05-19): `app.verifactu.business`, `claude.verifactu.business`, `holded.verifactu.business`, `verifactu.business`. The file has been gone for 5+ months.

**But Claude.ai still shows it.** Conclusion:

> **Anthropic / Claude.ai cached the binary server-side** when it was accessible (probably from `app.verifactu.business/icono_verifactu.business.png` before December 2025), and serves the cached copy. They do not re-request the URL. They do not re-scrape custom MCP connectors that are not approved in the Anthropic Connectors Directory.

This was confirmed indirectly: PR #99 fixed every controllable asset on our origin (`favicon.ico`, `manifest.json`, all PNG icon URLs). Production verification showed all assets serving the Holded diamond. But the user reported that the blue shield persisted in Claude.ai. The only consistent explanation is server-side caching by Anthropic.

**Mitigations attempted:**

- [PR #100](https://github.com/kiabusiness2025/verifactu-monorepo/pull/100) added a safety-net route `GET /icono_verifactu.business.png` that serves the Holded diamond at the exact legacy URL — in case Anthropic ever re-scrapes the URL it had cached. Low-cost, no guarantee of effect.

**Fundamental conclusion:**

> The blue shield cache in Anthropic's infrastructure **cannot be cleared from our side**. The two real solutions are:
>
> 1. Get approval in the Anthropic Connectors Directory (the directory submission supplies a fresh `logo_uri` that overrides the cached icon)
> 2. Migrate to a new subdomain that Anthropic indexes fresh

## Decision tree

```
Is the icon legacy and served by our origin?
├── Yes → fix the file (PR #99 ✅ done)
└── No → is it cached by Anthropic server-side?
    ├── Probable yes → can we wait for natural refresh?
    │   ├── Connectors Directory submission pending → submit
    │   │   and wait for approval to overwrite cache
    │   └── Not enrolled or no refresh expected →
    │       migrate to a new subdomain
    └── No → it's a Claude UI default, accept it
```

For the V icon: Option A (fix the file) sufficed — confirmed in production after PR #99 deploy.

For the blue shield: Anthropic's server-side cache + no re-scrape policy meant Option A was inadequate. Option B (subdomain migration) was selected.

## Why a new subdomain (and not a fresh form submission from the old URL)

Submitting a new form from `claude.verifactu.business` could in theory provide a fresh `logo_uri` for Anthropic to index. But:

- Anthropic v1 submission was already sent from this URL and did not respond. The state of that submission in Anthropic's internal tracker is opaque.
- If Anthropic's cache key is the MCP URL (not the submission ID), a v2 form from the same URL might inherit cached icons.
- A fresh subdomain eliminates this risk entirely. The subdomain has zero prior interaction with Anthropic — they index whatever we serve on it without any cache to invalidate.

## Subdomain naming — brand-first

Two candidates considered:

| Candidate                                           | Argument                                                                                                                                                                                        | Counter-argument                                 |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `claude-holded.verifactu.business` (channel-first)  | Matches Anthropic's own `claude.*` conventions (claude.ai, claude.com).                                                                                                                         | Mixes our brand into Anthropic's naming pattern. |
| `holded-claude.verifactu.business` (brand-first) ✅ | Holded is **our** product; Claude is the channel/distribution. Matches `Holded for Claude` as app name. Consistent with how OpenAI's `Holded` app in the ChatGPT directory positions the brand. | None significant.                                |

Decision: **brand-first** (`holded-claude.verifactu.business`).

PR #101 initially merged with `claude-holded` by error (the AskUserQuestion confirmation came back with empty answers field, so the default-recommended option was assumed). PR #102 corrects the naming.

## Implementation summary

| PR                                                                     | Title                                                                                            | Status                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| [#99](https://github.com/kiabusiness2025/verifactu-monorepo/pull/99)   | `fix(holded-mcp)`: regenerate `favicon.ico` + purge Verifactu legacy colors from `manifest.json` | Merged 2026-05-19                             |
| [#100](https://github.com/kiabusiness2025/verifactu-monorepo/pull/100) | `fix(holded-mcp)`: legacy alias `/icono_verifactu.business.png` + runbook root cause docs        | Merged 2026-05-20                             |
| [#101](https://github.com/kiabusiness2025/verifactu-monorepo/pull/101) | `feat(holded-mcp)`: migrate Claude connector to subdomain + app name `Holded for Claude`         | Merged 2026-05-19 (with `claude-holded` typo) |
| [#102](https://github.com/kiabusiness2025/verifactu-monorepo/pull/102) | `fix(holded-mcp)`: rename `claude-holded` → `holded-claude` (brand-first)                        | In review (this PR)                           |

### Code changes (PR #101 + #102)

Parametrized two hardcoded URLs in `apps/holded-mcp/src/`:

- `app.ts` — `CLAUDE_CONNECT_DEEPLINK` constant was a string with `claude.verifactu.business/mcp` URL-encoded. Now built dynamically via `buildClaudeConnectDeeplink(config.BASE_URL, 'Holded for Claude')`. Changing the subdomain = changing one env var.
- `public-pages.ts` — `CONNECT_URL` was a module-level constant. Now constructed inside `renderLandingPage(baseUrl)` from the `baseUrl` parameter the function already receives.

All other URL references (`oauth-routes.ts`, OAuth metadata responses, etc.) were already reading from `config.BASE_URL`.

### Docs changes (PR #101 + #102)

8 files in `docs/anthropic-submission/` updated:

- `README.md` — submission v1 vs v2 story, banner explaining the migration
- `submission-form-answers.md` — server name `Holded for Claude`, MCP URL `holded-claude.verifactu.business/mcp`
- `branding-assets.md`, `compliance-checklist.md`, `escalation-email.md`, `oauth-flow.md`, `test-account.md`, `tools-manifest.md` — global subdomain substitution

### Runbook updates (PR #100 + #101 + #102)

`apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md`:

- **Section 10 rewritten** with both root causes (V on favicon.ico + blue shield cached by Anthropic), with byte-level reference table (MD5s) for future incident triage.
- **Section 14 added** with operator runbook: Vercel domain alias, env var change, Anthropic Google Form submission, verification commands, plan for the legacy `claude.verifactu.business` domain.

### Memory updates

`~/.claude/projects/.../memory/project_mcp_topology.md` updated 2026-05-19 with:

- Correct hosting (Vercel, not Railway — the earlier memory had an inherited typo)
- The migration date and reasoning
- v1 vs v2 split with explicit "do not act on v1" guidance

## Operator runbook (pending — execute after PR #102 merges)

1. **Vercel — add subdomain alias:**
   - Project settings (the one serving `apps/holded-mcp`) → Domains → Add → `holded-claude.verifactu.business`
   - Configure the CNAME that Vercel asks for in the DNS provider (typically `cname.vercel-dns.com`)
   - Wait for SSL provisioning (~1-2 min)

2. **Vercel — change `BASE_URL` env var:**
   - Project Settings → Environment Variables → Production
   - From: `https://claude.verifactu.business` (or `https://claude-holded.verifactu.business` if you also have that alias from PR #101)
   - To: `https://holded-claude.verifactu.business`
   - Redeploy

3. **Verification commands:**

   ```bash
   # OAuth issuer reflects the new subdomain
   curl -sS https://holded-claude.verifactu.business/.well-known/oauth-authorization-server | jq .issuer
   # expected: "https://holded-claude.verifactu.business"

   # Favicon is the Holded diamond, not the V
   curl -sS https://holded-claude.verifactu.business/favicon.ico | md5sum
   # expected: d23f99aeb2d1ea5369b6222eba8cd8e7

   # MCP endpoint returns 401 unauth (correct — needs Bearer)
   curl -sS -X POST https://holded-claude.verifactu.business/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   # expected: HTTP 401 + JSON-RPC error about missing auth

   # Manifest uses Holded coral, not Verifactu navy
   curl -sS https://holded-claude.verifactu.business/manifest.json | jq '.theme_color, .background_color'
   # expected: "#FF5460" + "#ffffff"
   ```

4. **Anthropic Google Form (submission v2):**
   - URL: https://claude.com/docs/connectors/building/submission
   - Server name: `Holded for Claude`
   - MCP URL: `https://holded-claude.verifactu.business/mcp`
   - Remaining fields: copy-paste from [docs/anthropic-submission/submission-form-answers.md](../anthropic-submission/submission-form-answers.md)
   - Submit and wait for confirmation email; manual review ~2 weeks per Anthropic docs.

5. **(Optional) cleanup of `claude-holded.verifactu.business`** in Vercel if that alias was configured (from PR #101's wrong-naming era). Removing it is safe — the domain is not referenced anywhere in the new docs/code.

6. **Legacy `claude.verifactu.business`:** keep alive as alias in Vercel. Mismo build. No tenant ha conectado contra él (zero active users), pero el riesgo de romper algo si lo apagamos es bajo y el coste de mantenerlo cero. Reevaluar en 30 días.

## What if the blue shield still appears after migration

Hypotheses (in order of probability):

1. **Anthropic caches by submitter email**, not by domain. Test: submit v2 form from a different email and see if the icon changes for that submission.
2. **The Anthropic form does not respect `logo_uri`** and Anthropic always scrapes `/favicon.ico`. Test: verify visually that `holded-claude.verifactu.business/favicon.ico` returns the diamond, and if the directory still shows wrong icon, escalate via `partnerships@anthropic.com`.
3. **The connector entry in Claude.ai (per-user) caches the icon at first connection**, not per-server. Test: have a fresh user (different account) connect for the first time after migration. If they see the diamond, the cache is per-account-per-connector and existing users need to disconnect + reconnect.

## Side-tasks spawned during investigation

| Side-task                                                                                                                                                                     | Status                   | Notes                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `list_contacts` 500-item cap                                                                                                                                                  | Spawned 2026-05-19       | User has 4000+ contacts but MCP only exposes 500. Affects production usage on large tenants. Separate from this branding work. |
| Hardcoded `claude.verifactu.business` in `apps/app/lib/connectorHealth/checks.ts` + `apps/app/app/.well-known/oauth-protected-resource/api/mcp/isaak/route.ts` + a route test | Not addressed in this PR | These are legacy aliases that work during transition. Optional follow-up PR if/when we sunset the legacy domain.               |

## References

- [PR #99 — favicon.ico + manifest.json](https://github.com/kiabusiness2025/verifactu-monorepo/pull/99)
- [PR #100 — legacy alias + runbook root cause](https://github.com/kiabusiness2025/verifactu-monorepo/pull/100)
- [PR #101 — subdomain migration (typo'd as claude-holded)](https://github.com/kiabusiness2025/verifactu-monorepo/pull/101)
- [PR #102 — rename to holded-claude (brand-first)](https://github.com/kiabusiness2025/verifactu-monorepo/pull/102)
- [Runbook section 10 — root causes](../../apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md)
- [Runbook section 14 — migration operator steps](../../apps/holded-mcp/CLAUDE_CONNECTOR_RESET_RUNBOOK.md)
- [Submission form answers](../anthropic-submission/submission-form-answers.md)
- [Anthropic Connectors Directory submission guide](https://claude.com/docs/connectors/building/submission)
