# Pull Request Workflow Guide

## 🔄 Complete PR Lifecycle

### 1. Create Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Or for bug fixes
git checkout -b fix/bug-description

# Or for docs
git checkout -b docs/what-docs
```

### 2. Develop & Commit

```bash
# Make changes
pnpm dev  # Test locally

# Run validations
pnpm validate:all

# Commit (with git hooks)
git add .
git commit -m "feat: description"
```

### 3. Push & Create PR

```bash
# Push branch
git push origin feature/my-feature

# GitHub will show option to create PR
# Or use: gh pr create --web
```

### 4. PR Description

Fill in the PR template with:
- **Description**: What changed and why
- **Type**: Bug fix, Feature, etc.
- **Related Issues**: Link to issues
- **Testing**: How you tested it
- **Checklist**: Confirm all items

### 5. Automated Checks

GitHub Actions automatically runs:
- ✓ ESLint validation
- ✓ TypeScript check
- ✓ Build verification
- ✓ Test suite
- ✓ Code coverage

**PR blocked if any check fails** ❌

### 6. Code Review

- Code owner review is **required** ✓
- Reviewer can:
  - **Approve**: PR can merge
  - **Request changes**: Fix issues
  - **Comment**: Suggestions

### 7. Address Feedback

If reviewer requests changes:

```bash
# Make changes
git add .
git commit -m "fix: address review feedback"

# Push (automatically updates PR)
git push origin feature/my-feature
```

Checks rerun automatically. Stale approvals are dismissed.

### 8. Merge

Once approved and all checks pass:

```bash
# Option 1: Via GitHub UI (recommended)
# Click "Merge pull request"

# Option 2: Via GitHub CLI
gh pr merge feature/my-feature

# Option 3: Via Git
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main
```

**Auto-cleanup**: Branch is deleted after merge ✓

### 9. Deploy

After merge to `main`:

- GitHub Actions deploys to **Vercel** automatically 🚀
- Check deployment status in GitHub
- View live at https://app.verifactu.business

---

## 📋 PR Template Sections

### Description
```markdown
## Description
Clear explanation of what changed and why.

Fixes #123
```

### Type of Change
```markdown
- [x] Bug fix
- [ ] New feature
- [ ] Documentation update
```

### Testing
```markdown
## How Has This Been Tested?
- [x] Unit tests
- [x] Manual testing in dev

## Testing Details
Steps to reproduce/test the changes
```

### Checklist
```markdown
- [x] My code follows style guidelines
- [x] Tests pass locally
- [x] No new warnings
- [x] Documentation updated
```

---

## 🚨 Common Issues

### "PR blocked by failing checks"

```bash
# Check which check failed
# Fix locally
pnpm validate:all

# Commit and push
git add .
git commit -m "fix: resolve lint errors"
git push origin feature/my-feature
# Checks rerun automatically
```

### "Changes requested by reviewer"

1. Make changes locally
2. Commit: `git commit -m "fix: address feedback"`
3. Push: `git push`
4. **Don't force push** - maintain history

### "Merge conflict"

```bash
# Update branch
git fetch origin
git rebase origin/main

# Fix conflicts in VS Code
# Stage resolved files
git add .
git rebase --continue

# Force push (safe because your branch)
git push origin feature/my-feature --force-with-lease
```

### "PR is outdated"

```bash
# Sync with main
git fetch origin
git rebase origin/main
git push origin feature/my-feature --force-with-lease
```

---

## ✅ PR Best Practices

### ✓ Do's

- ✓ Create PRs early and often
- ✓ Keep PRs focused and small (<400 lines)
- ✓ Write clear commit messages
- ✓ Include tests with code changes
- ✓ Update documentation
- ✓ Link related issues
- ✓ Respond to review feedback promptly
- ✓ Use draft PRs for work-in-progress

### ✗ Don'ts

- ✗ Don't commit directly to main
- ✗ Don't merge failing builds
- ✗ Don't ignore review feedback
- ✗ Don't create huge PRs (>500 lines)
- ✗ Don't use force push without reason
- ✗ Don't merge without approvals
- ✗ Don't forget to resolve conversations
- ✗ Don't skip tests

---

## 📊 Code Review Checklist

**For Reviewers:**

```markdown
## Code Quality
- [ ] Code is clean and readable
- [ ] No unnecessary complexity
- [ ] Follows project conventions
- [ ] No console.logs or debug code

## Functionality
- [ ] Changes match PR description
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] No breaking changes

## Testing
- [ ] Tests are included
- [ ] Tests pass
- [ ] Coverage is adequate

## Documentation
- [ ] Code is commented
- [ ] README updated if needed
- [ ] Types are correct

## Performance
- [ ] No performance regressions
- [ ] No memory leaks
- [ ] Efficient queries
```

---

## 🔐 Branch Protection Rules

**Main branch is protected**:
- ✓ Require PR review
- ✓ Require status checks
- ✓ Require code owner approval
- ✓ Require up to date branch
- ✓ Require conversation resolution

See [BRANCH_PROTECTION_RULES.md](BRANCH_PROTECTION_RULES.md)

---

## 🚀 Auto-Deployment

**After merge to main**:

1. GitHub Actions builds app
2. Tests run automatically
3. Vercel deployment triggered
4. Live at https://app.verifactu.business

Check status in:
- GitHub: Deployments tab
- Vercel: Project dashboard

---

## 📱 GitHub Mobile

View and approve PRs on mobile:

1. GitHub app
2. Pull requests tab
3. Review code and approve
4. Receive notifications for comments

---

## 🎯 Quick Reference

```bash
# Create PR
git checkout -b feature/name
git push origin feature/name
# Create PR via GitHub

# Address feedback
git add .
git commit -m "fix: feedback"
git push

# Merge PR
gh pr merge feature/name
# Or click merge button on GitHub

# Delete branch
git branch -d feature/name
```

---

Last updated: January 2026
