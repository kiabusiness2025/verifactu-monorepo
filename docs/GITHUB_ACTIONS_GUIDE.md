# GitHub Actions Workflows

## 📋 Configured Workflows

### 1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)

Runs on every push to `main` branch.

**Jobs:**
1. **Lint** (2 min)
   - ESLint checks for code quality
   - Catches style inconsistencies
   - Must pass to proceed

2. **TypeCheck** (3 min)
   - TypeScript strict mode validation
   - Catches type errors
   - Must pass to proceed

3. **Build** (5 min)
   - Builds Next.js application
   - Optimizes for production
   - Must pass to proceed

4. **Test** (2 min)
   - Runs Jest unit tests
   - Validates functionality
   - Must pass to proceed

5. **Deploy** (2 min)
   - Deploys to Vercel staging
   - Creates preview URL
   - Final step (auto on main)

**Total Time:** ~15 minutes

**When It Runs:**
- ✓ Every push to `main` branch
- ✓ Every pull request (blocks merge if fails)
- ✗ Manual branches (only if PR created)

### 2. **Dependabot** (`.github/workflows/dependabot.yml`)

Runs automatically based on schedule.

**Schedule:**
- **NPM:** Monday 3am UTC
- **GitHub Actions:** Monday 4am UTC

**Actions:**
- Creates PR with updated dependencies
- Runs CI/CD pipeline on PR
- Auto-assigns to @kiabusiness2025

---

## 📊 Workflow Status

### View Status

**In VS Code:**
```
Click GitHub icon → Actions tab
See status of all workflows
```

**On GitHub Web:**
```
https://github.com/kiabusiness2025/verifactu-monorepo/actions
```

**In GitHub CLI:**
```bash
# View recent workflow runs
gh run list

# View specific run details
gh run view <run-id>

# View logs for job
gh run view <run-id> --log
```

---

## 🔍 Monitoring Workflows

### Real-Time Monitoring

**In VS Code:**
1. Open PR or view main branch
2. Click "Actions" tab
3. See running jobs with progress bars
4. Click job for detailed logs

**Example Output:**
```
ci-cd.yml / Lint
├─ Lint
  ├─ Setup Node.js 20 ✓
  ├─ Install dependencies ✓
  ├─ Run ESLint ✓
  └─ PASSED (2 min)

TypeCheck
├─ Setup Node.js 20 ✓
├─ Install dependencies ✓
├─ Run TypeScript ✓
└─ PASSED (3 min)

Build
├─ Setup Node.js 20 ✓
├─ Install dependencies ✓
├─ Build Next.js ✓
└─ PASSED (5 min)

Test
├─ Setup Node.js 20 ✓
├─ Install dependencies ✓
├─ Run Jest ✓
└─ PASSED (2 min)

Deploy
├─ Setup Node.js 20 ✓
├─ Deploy to Vercel ✓
├─ Check deployment ✓
└─ PASSED (2 min)
```

### Checking Specific Job

```bash
# Get failing job logs
gh run view <run-id> --log --job <job-id>

# Or filter by status
gh run list --status failure
gh run list --status success
```

---

## ⚙️ Workflow Configuration

### Default Settings

**File:** `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  lint:
    runs-on: ubuntu-latest
    # ... ESLint configuration

  typecheck:
    needs: lint
    runs-on: ubuntu-latest
    # ... TypeScript configuration

  build:
    needs: typecheck
    runs-on: ubuntu-latest
    # ... Build configuration

  test:
    needs: build
    runs-on: ubuntu-latest
    # ... Test configuration

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    # ... Deploy configuration
```

### Key Configuration

| Setting | Value | Meaning |
|---------|-------|---------|
| `on.push.branches` | main | Trigger on main push |
| `on.pull_request` | main | Trigger on PR |
| `runs-on` | ubuntu-latest | Use GitHub runner |
| `needs` | [previous-job] | Job dependency |
| `if` | Conditional | Only run if condition met |

---

## 🔧 Customizing Workflows

### Add New Job

```yaml
my-custom-job:
  needs: lint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: My Custom Step
      run: echo "Hello, World!"
```

### Run on Schedule

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am UTC
```

### Skip Workflow

Add to commit message:
```bash
git commit -m "fix: bug [skip ci]"
```

### Manual Trigger

Add to workflow:
```yaml
on:
  workflow_dispatch:
```

Then: GitHub UI → Actions → Select workflow → "Run workflow" → "Run"

---

## 🚀 Advanced Features

### Environment Variables

```yaml
env:
  NODE_ENV: production
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
```

### Secrets

```yaml
with:
  FIREBASE_KEY: ${{ secrets.FIREBASE_KEY }}
```

**Note:** Secrets configured in GitHub Settings → Secrets and variables

### Conditional Steps

```yaml
- name: Deploy to Vercel
  if: github.ref == 'refs/heads/main'
  run: vercel --prod
```

### Matrix Builds

```yaml
strategy:
  matrix:
    node-version: [18, 20]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Artifacts

```yaml
- name: Upload build
  uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: .next

- name: Download artifact
  uses: actions/download-artifact@v4
  with:
    name: build-output
```

---

## 📈 Performance Optimization

### Cache Dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
```

Saves ~1-2 minutes per run.

### Parallel Jobs

Jobs with no dependencies run simultaneously:
```
Job A ─┐
       ├─> Job C (depends on A)
Job B ─┤
       └─> Job D (depends on B)
```

### Skip Build Artifacts

For PR checks, don't upload:
```yaml
- name: Build
  if: github.ref == 'refs/heads/main'
  run: pnpm build
```

---

## 🔔 Notifications

### PR Check Badges

In README:
```markdown
![CI/CD](https://github.com/kiabusiness2025/verifactu-monorepo/workflows/CI%2FCD%20Pipeline/badge.svg)
```

### Slack Notifications (Optional)

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Workflow failed on main branch"
      }
```

---

## 🐛 Troubleshooting

### Workflow Stuck

**Solution:**
1. GitHub → Actions → Select workflow
2. Click "..." → "Delete all workflow runs"
3. Push new commit to trigger

### Job Timeout

If job runs > 6 hours:

```yaml
timeout-minutes: 30  # Set max 30 min
```

### Permission Denied

Check: Settings → Actions → General
- "Actions permissions" = Allow all actions
- "Workflow permissions" = Read & Write

### Secrets Not Working

```bash
# Verify secret exists
gh secret list

# Add missing secret
gh secret set MY_SECRET --body "value"
```

---

## 📊 Cost & Limits

### GitHub Actions Usage

**Free tier includes:**
- 2,000 minutes per month
- Runner: ubuntu-latest
- No cost for public repos

**Verifactu usage:**
- ~15 min per run
- ~30 runs/month (daily + PRs)
- ≈ 450 min/month (well within limit)

### Monitor Usage

Settings → Billing and plans → Usage

---

## 🎯 Best Practices

### ✓ Do's
- ✓ Keep workflows fast (< 5 min per job)
- ✓ Use caching for dependencies
- ✓ Run linting before expensive builds
- ✓ Set meaningful job names
- ✓ Document non-obvious steps
- ✓ Use environments for secrets

### ✗ Don'ts
- ✗ Don't run slow tests on every PR
- ✗ Don't duplicate steps across workflows
- ✗ Don't hardcode secrets
- ✗ Don't ignore workflow failures
- ✗ Don't create overly complex jobs

---

## 📚 Related Documentation

- [CI/CD Pipeline Details](.github/workflows/ci-cd.yml)
- [GitHub Integration Guide](GITHUB_INTEGRATION.md)
- [Pull Request Workflow](PULL_REQUEST_WORKFLOW.md)
- [Development Setup](DEVELOPMENT.md)

---

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Available Actions Marketplace](https://github.com/marketplace?type=actions)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides)

---

Last updated: January 2026
