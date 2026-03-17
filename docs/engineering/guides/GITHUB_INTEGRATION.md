# GitHub Integration for Verifactu

## 📋 Overview

This document outlines how to use GitHub features integrated into VS Code and GitHub Actions for Verifactu.business development.

## 🔧 What's Configured

### 1. **GitHub Pull Requests Extension**
- Built into VS Code
- Manage PRs without leaving editor
- Comment, approve, request changes
- See GitHub Actions status in real-time

### 2. **GitHub Actions CI/CD**
```yaml
5 Concurrent Jobs:
├─ Lint (ESLint)
├─ TypeCheck (TypeScript)
├─ Build (Next.js + Turbo)
├─ Test (Unit tests)
└─ Deploy (to Vercel)
```

### 3. **Branch Protection Rules**
- Require PR review
- Require status checks (all 5 jobs)
- Require code owner approval
- Require conversation resolution
- Require linear history

### 4. **Code Owners**
- @kiabusiness2025 owns all code
- Automatically assigned as reviewer
- Can enforce blocking reviews

### 5. **PR Templates**
- Auto-populate when creating PR
- Sections: Description, Type, Issues, Testing, Performance, DB, Env vars, Deployment

### 6. **Issue Templates**
- Bug Report: 8 required fields
- Feature Request: 7 required fields
- Ensures consistent issue documentation

### 7. **Dependabot**
- Weekly NPM updates (Monday 3am)
- Weekly GitHub Actions updates (Monday 4am)
- Max 5 open PRs
- Ignores major Next.js/TypeScript updates (manual)

---

## 🚀 Quick Start

### Authenticate with GitHub

**First time only:**
```bash
# Command Palette (Ctrl+Shift+P)
GitHub: Sign in

# Or via terminal
gh auth login
```

### Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### Make Changes
```bash
# Edit files
code src/myfile.ts

# Stage changes
git add src/myfile.ts

# Pre-commit hooks run automatically
# ESLint fixes, Prettier formats

# Commit
git commit -m "feat: add new feature"

# Push
git push origin feature/your-feature-name
```

### Create Pull Request

**Option 1: VS Code (Recommended)**
```bash
# Command Palette (Ctrl+Shift+P)
GitHub: Create Pull Request

# Fill in template and submit
```

**Option 2: GitHub CLI**
```bash
gh pr create --title "feat: add new feature" --body "Description here"
```

**Option 3: GitHub Web**
- Go to https://github.com/kiabusiness2025/verifactu-monorepo
- Click "Compare & pull request"

### What Happens Next

1. **PR Template Auto-Populated** ✓
   - Checklist appears
   - Fill in all sections

2. **GitHub Actions Run** (5 min)
   ```
   Lint → TypeCheck → Build → Test → Deploy
   ```

3. **Code Owner Review** 
   - @kiabusiness2025 auto-assigned
   - Approval required to merge

4. **Status Checks Visible**
   - Green ✓ = All good
   - Red ✗ = Needs fixes
   - Yellow ⏳ = Running

5. **Merge When Ready**
   - Click "Merge Pull Request"
   - Deploy to Vercel automatic

---

## 📊 Monitoring Checks

### In VS Code

**Pull Requests Panel:**
1. Click GitHub icon (left sidebar)
2. See "Pull Requests" section
3. Click your PR
4. View "Checks" tab
5. Each job shows:
   - ✓ Status
   - ⏱ Duration
   - 📝 Logs (click to view)

### Example Check Output
```
Lint (2 min)           ✓ PASSED
  → ESLint checked 50+ files

TypeCheck (3 min)      ✓ PASSED
  → TypeScript strict mode

Build (5 min)          ✓ PASSED
  → Turbo cached 8 packages

Test (2 min)           ✓ PASSED
  → All 42 tests passing

Deploy (2 min)         ✓ PASSED
  → Vercel preview live
```

### If Check Fails

1. **Click failing check**
2. **View detailed logs**
3. **Common issues:**
   - `Lint failed`: Run `pnpm lint --fix`
   - `TypeCheck failed`: Run `pnpm typecheck`
   - `Build failed`: Check error message, run `pnpm build`
   - `Test failed`: Run `pnpm test`
4. **Fix locally:**
   ```bash
   # Make fixes
   git add .
   git commit -m "fix: resolve lint errors"
   git push
   # Checks re-run automatically
   ```

---

## 💬 Code Review Workflow

### Receiving Feedback

1. **Reviewer comments**
   - Appears in PR Timeline
   - You get notification

2. **View Comment in VS Code**
   - Click "Changes" tab
   - Scroll to commented line
   - Green highlight shows comment
   - Click to expand

3. **Reply to Comment**
   ```
   Click reply box → Type response → Submit
   ```

4. **Resolve Comment**
   ```
   When you fix: Click "Resolve" button
   Comment marked as resolved
   ```

### Making Changes After Review

```bash
# Make fixes based on feedback
git add .
git commit -m "fix: address review feedback"

# OR for squashing into previous commit
git commit --amend --no-edit
git push --force-with-lease

# Checks re-run automatically
```

### Approval & Merge

```bash
# 1. When approved:
# Merge button becomes green

# 2. Click "Merge Pull Request"
Merge or Squash or Rebase (your choice)

# 3. Confirm delete branch (optional)

# 4. Deploy happens automatically
```

---

## 🔍 Reviewing Others' PRs

### Open PR for Review

**In VS Code:**
1. GitHub panel (left sidebar)
2. "Pull Requests" section
3. Click PR you need to review

### Review Code

**Changes Tab:**
1. See all modified files
2. Hover over line for comment
3. Click **+** to add comment
4. Type comment
5. Submit

**Example Comment:**
```
This function needs error handling.
Consider wrapping in try/catch.
```

### Submit Review

**Overview Tab:**
1. Click "Review Changes" (top right)
2. Select:
   - ✓ **Approve** - OK to merge
   - 💬 **Comment** - Just feedback
   - 🚫 **Request Changes** - Must fix
3. Add summary message
4. Click "Submit Review"

---

## 🔐 Branch Protection Rules

### Active Rules

```
✓ Require pull request reviews (1)
✓ Require status checks (5):
  - Lint
  - TypeCheck
  - Build
  - Test
  - Deploy
✓ Require code owner approval
✓ Require conversation resolution
✓ Require linear history (no merge commits)
```

### What This Means

| Rule | Effect |
|------|--------|
| PR Review | Can't merge without review ✓ |
| Status Checks | Can't merge if checks fail ✗ |
| Code Owner | @kiabusiness2025 must approve |
| Resolve Comments | All comments must be marked resolved |
| Linear History | Keeps git history clean |

### Bypassing Rules (Not Recommended)

Rules can only be bypassed by repo admins in emergencies.

---

## 📦 Dependabot

### What It Does

Every Monday:
- **3am UTC**: Checks for NPM updates
- **4am UTC**: Checks for GitHub Actions updates
- Creates PR if updates available

### Example Dependabot PR

```
Title: "chore(deps): bump next from 14.2.0 to 14.3.0"

Description:
Bumps next from 14.2.0 to 14.3.0.

Commits:
- Release notes
- Changelog
- Commits

Merge with: Squash and merge
```

### Handling Dependabot PRs

1. **Review changes** in PR
2. **Approve** (usually auto-approved)
3. **Merge** when ready
4. **Delete branch**

### Ignored Updates

Dependabot ignores major version bumps for:
- Next.js (handle manually)
- TypeScript (handle manually)

These require manual PR for safety.

---

## 🎯 Common Workflows

### 1. Add New Feature

```bash
# 1. Create branch
git checkout -b feature/new-email-feature

# 2. Make changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "feat: add email templates"
git push origin feature/new-email-feature

# 4. Create PR
# VS Code: Ctrl+Shift+P → GitHub: Create Pull Request

# 5. Fill PR template
# Title, Description, Type: Feature, etc.

# 6. Wait for checks and review
# GitHub Actions runs 5 jobs

# 7. Address feedback
# ... make changes ...
git commit -m "fix: address review"
git push

# 8. Merge when approved
```

### 2. Fix Bug in Production

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-email-bug

# 2. Make minimal change
# ... fix bug only ...

# 3. Commit and push
git add .
git commit -m "fix: resolve critical email bug"
git push origin hotfix/critical-email-bug

# 4. Create PR with [HOTFIX] label
# VS Code: Create PR

# 5. Fast-track review
# Mark as urgent in description

# 6. Merge and deploy
```

### 3. Update Dependencies

```bash
# Dependabot creates PR automatically
# Just review and merge

# For manual updates:
pnpm update package-name --latest
git add pnpm-lock.yaml
git commit -m "chore(deps): update package-name"
git push
# Create PR
```

### 4. Refactor Code

```bash
# 1. Create refactor branch
git checkout -b refactor/email-api

# 2. Make changes
# ... refactor code ...

# 3. Ensure tests pass
pnpm test

# 4. Commit
git commit -m "refactor: simplify email API"

# 5. Create PR with type "Refactor"
```

---

## 🐛 Troubleshooting

### PR Template Not Showing

```bash
# 1. Check file exists
.github/pull_request_template.md ✓

# 2. Refresh VS Code
# Ctrl+Shift+P → Developer: Reload Window

# 3. Try GitHub web
# https://github.com/kiabusiness2025/verifactu-monorepo/compare
```

### Can't Merge PR

**Reason: Status checks failing**
```bash
# 1. Click failing check
# 2. View logs
# 3. Fix locally
pnpm lint --fix
pnpm typecheck
pnpm build
# 4. Commit and push
git add .
git commit -m "fix: resolve check failures"
git push
```

**Reason: Needs approval**
```bash
# Wait for @kiabusiness2025 to review
# Or request changes
```

**Reason: Conversation not resolved**
```bash
# 1. Go to Comments/Timeline
# 2. Click "Resolve" on each comment
```

### Code Owner Not Assigned

```bash
# 1. Check CODEOWNERS file exists
# 2. Verify format:
#    * @kiabusiness2025

# 3. Re-create PR if already created

# 4. Force assignment:
# GitHub → PR → Reviewers → Add @kiabusiness2025
```

### Checks Running Forever

```bash
# Wait up to 10 minutes

# If still running:
# 1. Cancel workflow in GitHub Actions
# 2. Close and reopen PR
# 3. Rerun failed checks
```

---

## 📚 Related Documentation

- [PR Workflow Guide](PULL_REQUEST_WORKFLOW.md)
- [Branch Protection Rules](BRANCH_PROTECTION_RULES.md)
- [GitHub PR VS Code Guide](GITHUB_PR_VSCODE_GUIDE.md)
- [Development Setup](DEVELOPMENT.md)
- [Debugging Guide](DEBUGGING_GUIDE.md)

---

## 🔗 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub Pull Requests VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github)
- [GitHub Dependabot](https://dependabot.com)
- [Verifactu Repository](https://github.com/kiabusiness2025/verifactu-monorepo)

---

Last updated: January 2026
