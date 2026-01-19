# Dependabot Configuration & Management

## 📦 What is Dependabot?

Dependabot is GitHub's automated dependency management service. It:
- Scans your repositories for outdated dependencies
- Creates pull requests automatically with updates
- Tests updates with your CI/CD pipeline
- Groups updates intelligently
- Can auto-merge if tests pass

## ⚙️ Configuration

**File:** `.github/dependabot.yml`

### Current Setup

```yaml
version: 2
updates:
  # NPM Dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 5
    reviewers:
      - "kiabusiness2025"
    ignore:
      - dependency-name: "next"
        versions: ["15.*"]
      - dependency-name: "typescript"
        versions: ["6.*"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
    open-pull-requests-limit: 5
    reviewers:
      - "kiabusiness2025"
```

### Key Settings

| Setting | Value | Meaning |
|---------|-------|---------|
| package-ecosystem | npm, github-actions | What to monitor |
| interval | weekly | Check once per week |
| day | monday | On Monday |
| time | 03:00 | At 3am UTC |
| open-pull-requests-limit | 5 | Max 5 open PRs |
| ignore | next@15.*, ts@6.* | Skip major versions (manual) |
| reviewers | @kiabusiness2025 | Assign to code owner |

---

## 🔔 How It Works

### 1. Scheduled Scan

**Every Monday at 3am UTC:**
- Dependabot scans `package.json` and `pnpm-lock.yaml`
- Checks for available updates on npm registry
- Compares installed versions with latest available

### 2. Create PR

If updates available:
- Creates PR with updated dependencies
- Title: `"chore(deps): bump package from X to Y"`
- Description includes:
  - Release notes
  - Changelog
  - Links to security advisories (if any)

### 3. Run Tests

GitHub Actions automatically:
- ✓ Runs ESLint
- ✓ Runs TypeScript check
- ✓ Builds project
- ✓ Runs tests
- ✓ Deploys to preview (Vercel)

### 4. Review & Merge

You can:
- Review Dependabot PR like any other PR
- Wait for tests to pass
- Merge when comfortable
- Auto-merge if enabled

### 5. Delete Branch

After merge, GitHub suggests branch cleanup.

---

## 🔍 Finding Dependabot PRs

### In VS Code

1. Click GitHub icon (left sidebar)
2. Scroll to "Pull Requests"
3. Look for PRs with title `"chore(deps): bump ..."`

### On GitHub Web

1. Go to https://github.com/kiabusiness2025/verifactu-monorepo/pulls
2. Filter by label "dependencies" (if configured)
3. Or search: `is:pr author:dependabot`

### In GitHub CLI

```bash
# View all Dependabot PRs
gh pr list --search "author:dependabot"

# View specific Dependabot PR
gh pr view 123

# Merge Dependabot PR
gh pr merge --auto 123
```

---

## 📋 PR Workflow with Dependabot

### Standard Flow

```
Monday 3am: Dependabot scans
       ↓
Dependabot creates PR
       ↓
GitHub Actions runs tests (5 min)
       ↓
Tests pass ✓
       ↓
You review changes (usually automatic)
       ↓
You merge (or set auto-merge)
       ↓
Branch auto-deleted
```

### Example Dependabot PR

```
Title: chore(deps): bump next from 14.2.0 to 14.3.0

Description:
Bumps next from 14.2.0 to 14.3.0.

Commits:
- Release notes link
- Changelog
- Related commits

Files Changed:
package.json
pnpm-lock.yaml

Checks: ✓ All passed
```

---

## ✅ Reviewing Dependabot Updates

### What to Check

1. **Release Notes**
   - Click link in PR description
   - Review breaking changes
   - Check security fixes

2. **CI/CD Status**
   - Green ✓ = Safe to merge
   - Red ✗ = May be incompatible

3. **Changelog**
   - Look for deprecations
   - Check bug fixes
   - Review new features

4. **Security Advisories**
   - Dependabot highlights these
   - Usually critical to merge

### Example Review

```
Package: tailwindcss 3.2.0 → 3.3.0

Type: Patch update (safe)

Checks: ✓ Lint, ✓ Build, ✓ Test, ✓ Deploy

Action: APPROVE & MERGE
```

---

## 🚫 Ignored Versions

### Why We Ignore Major Versions

```yaml
ignore:
  - dependency-name: "next"
    versions: ["15.*"]
  - dependency-name: "typescript"
    versions: ["6.*"]
```

**Reason:** Major versions often require code changes.

### Updating Manually

```bash
# Check available versions
npm view next versions --json

# Update to specific version
pnpm update next@15.0.0 --latest

# Test thoroughly
pnpm typecheck
pnpm build
pnpm test

# Create PR manually
git checkout -b chore/upgrade-next-15
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade next to 15.x"
git push origin chore/upgrade-next-15
# Then create PR on GitHub
```

---

## 🔧 Configuration Adjustments

### Change Update Frequency

**More frequent (daily):**
```yaml
schedule:
  interval: "daily"
  time: "03:00"
```

**Less frequent (monthly):**
```yaml
schedule:
  interval: "monthly"
  day: "monday"
```

### Limit Open PRs

**Reduce to 3:**
```yaml
open-pull-requests-limit: 3
```

**Disable (0):**
```yaml
open-pull-requests-limit: 0
```

### Auto-Merge Minor Updates

```yaml
# npm
- package-ecosystem: "npm"
  directory: "/"
  auto-merge: "auto"
  # Only patch versions auto-merge
  allow:
    - dependency-type: "indirect"
    - dependency-type: "direct"
```

### Group Updates

```yaml
groups:
  - dependency-type: "indirect"
    allow:
      - dependency-type: "indirect"
  - dependency-type: "direct"
    exclude-paths:
      - "apps/*/package.json"
```

---

## 🔐 Security Updates

### Priority

Dependabot prioritizes security updates:
- ⚠️ Critical vulnerabilities: Create ASAP
- 🔴 High: Create immediately
- 🟡 Medium: Create on schedule
- 🔵 Low: Create on schedule

### Example Security PR

```
Title: chore(deps): bump vulnerable-pkg from 1.0.0 to 1.0.1

⚠️ SECURITY UPDATE

Description:
This PR addresses security vulnerability CVE-2024-1234

Severity: High
Score: 8.5

Recommendation: Merge ASAP
```

### Responding to Security

1. **Review PR immediately**
2. **Check if tests pass** ✓
3. **Merge without delay**
4. **Deploy to production** (automatic via Vercel)

---

## 📊 Dependabot Dashboard

### GitHub Settings

**Path:** Settings → Code security → Dependabot

### Enable Dependabot

1. Go to Settings → Code security
2. Enable "Dependabot version updates"
3. Enable "Dependabot security updates"
4. Enable "Dependabot alerts"

### View Alerts

**Path:** Settings → Code security → Dependabot alerts

Shows:
- Detected vulnerabilities
- Severity level
- Remediation steps
- Dependabot PR (if created)

---

## 🤖 Automation & Integration

### Auto-Merge

Enable auto-merge for safe updates:

```bash
# Merge when tests pass
gh pr merge 123 --auto --squash

# Or via GitHub UI
# PR → "Enable auto-merge" → Select strategy
```

### Label Management

Dependabot creates PRs with labels:
- `dependencies` - Auto added by Dependabot
- Custom labels (if configured)

Use to:
- Filter PRs
- Trigger workflows
- Organize work

### Slack Integration (Optional)

Can notify team:
- New Dependabot PRs
- Security updates
- Merge notifications

Requires: GitHub App + Slack workspace setup

---

## ⚠️ Troubleshooting

### Dependabot Not Creating PRs

**Check 1: Is it enabled?**
```
Settings → Code security → Dependabot version updates
Should be ON ✓
```

**Check 2: Configuration valid?**
```bash
# Validate YAML
cat .github/dependabot.yml
# No syntax errors
```

**Check 3: Schedule passed?**
```
Currently Monday 3am UTC?
Check GitHub → Actions → Dependabot workflows
```

**Check 4: No conflicting PRs?**
```
Open PRs count < open-pull-requests-limit (5)
```

### PR Checks Failing

**Reason 1: Incompatible update**
```
Solution: Manual update, adjust code, commit separately
```

**Reason 2: TypeScript error**
```
Solution: Update code to match new types
Run: pnpm typecheck
```

**Reason 3: Test failure**
```
Solution: Check test logs, fix compatibility issue
Run: pnpm test
```

### Can't Merge Dependabot PR

**Reason 1: Branch protection**
```
Solution: Wait for code owner review or approve
```

**Reason 2: Checks still running**
```
Solution: Wait 5-10 minutes for all checks to complete
```

**Reason 3: Conversation unresolved**
```
Solution: Click "Resolve" on all comments
```

---

## 🎯 Best Practices

### ✓ Do's
- ✓ Review Dependabot PRs weekly
- ✓ Merge security updates ASAP
- ✓ Check release notes for breaking changes
- ✓ Test thoroughly before merging
- ✓ Keep limit at 5 open PRs (prevents overwhelming)

### ✗ Don'ts
- ✗ Never ignore security updates
- ✗ Don't force merge without tests passing
- ✗ Don't disable Dependabot
- ✗ Don't bypass branch protection
- ✗ Don't update manually if Dependabot PR pending

---

## 📚 Related Documentation

- [GitHub PR Workflow](PULL_REQUEST_WORKFLOW.md)
- [Branch Protection Rules](BRANCH_PROTECTION_RULES.md)
- [GitHub Integration Guide](GITHUB_INTEGRATION.md)

---

## 🔗 Resources

- [GitHub Dependabot Docs](https://docs.github.com/en/code-security/dependabot)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-dependency-updates)
- [Security Advisories](https://docs.github.com/en/code-security/security-advisories)

---

Last updated: January 2026
