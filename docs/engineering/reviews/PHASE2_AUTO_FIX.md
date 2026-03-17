# Phase 2: Auto-Fix Common Errors

**Status**: ✅ **IMPLEMENTED**  
**Date**: January 20, 2026  
**Workflow**: `.github/workflows/auto-fix-errors.yml`

---

## 🎯 Overview

Phase 2 provides automated fixing of common deployment errors. When issues are detected, the system attempts to resolve them automatically and commits the fixes.

## 🔧 Features Implemented

### 1. Missing Dependencies Auto-Fix

- Detects missing critical dependencies
- Runs `npm install` in affected apps
- Commits package.json and package-lock.json changes

### 2. Security Vulnerabilities Fix

- Runs `npm audit` to detect vulnerabilities
- Applies `npm audit fix` for fixable issues
- Commits security updates

### 3. Automated Commit & Push

- Creates descriptive commit messages
- Pushes fixes directly to PR branch
- Triggers re-validation automatically

### 4. PR Comments

- Posts detailed comment on what was fixed
- Provides links to auto-generated commits
- Guides developers on next steps

---

## 🚀 How to Use

### Manual Trigger (Recommended)

When a PR has failed checks and you want to attempt auto-fix:

```bash
# Via GitHub CLI
gh workflow run auto-fix-errors.yml -f pr_number=<PR_NUMBER>

# Example
gh workflow run auto-fix-errors.yml -f pr_number=30
```

### Via GitHub UI

1. Go to **Actions** tab
2. Select **Auto-Fix Common Errors** workflow
3. Click **Run workflow**
4. Enter PR number
5. Click **Run workflow** button

### Automatic Trigger (Future)

Currently disabled. Will be enabled in future update to trigger automatically when Pre-Deployment Validation fails.

---

## 📋 What Gets Fixed

### ✅ Automatically Fixable

- **Missing Dependencies**: Detected via `check-dependencies.js`
- **Security Vulnerabilities**: Auto-applied via `npm audit fix`
- **Package Lock Mismatches**: Resolved via `npm install`

### ⚠️ Requires Manual Fix

- **TypeScript Errors**: Code logic issues
- **Build Failures**: Syntax errors, missing files
- **Import Errors**: Incorrect module paths
- **Configuration Issues**: Wrong settings in config files

---

## 🔄 Workflow Steps

```
1. Trigger (manual or automatic)
   ↓
2. Get PR information
   ↓
3. Checkout PR branch
   ↓
4. Run dependency validation
   ↓
5. Install missing dependencies (if found)
   ↓
6. Run security audit
   ↓
7. Apply security fixes (if applicable)
   ↓
8. Check for changes
   ↓
9. Commit & push fixes
   ↓
10. Comment on PR with results
   ↓
11. Trigger re-validation
```

---

## 📊 Example Scenarios

### Scenario 1: Missing Dependency

**Problem**: Developer forgot to install `lucide-react`

**Auto-Fix Process**:

1. ✅ Detects missing `lucide-react`
2. ✅ Runs `npm install lucide-react@^0.469.0`
3. ✅ Commits changes
4. ✅ Comments: "✅ Installed missing dependencies"
5. ✅ Re-runs validation

**Result**: PR checks pass, ready to merge

### Scenario 2: Security Vulnerabilities

**Problem**: Package has known vulnerabilities

**Auto-Fix Process**:

1. ✅ Runs `npm audit`
2. ✅ Applies `npm audit fix`
3. ✅ Commits security updates
4. ✅ Comments: "✅ Fixed security vulnerabilities"
5. ✅ Re-runs validation

**Result**: Vulnerabilities patched automatically

### Scenario 3: TypeScript Error

**Problem**: Developer has syntax error in code

**Auto-Fix Process**:

1. ⚠️ Cannot auto-fix code errors
2. 💬 Comments: "Manual intervention required"
3. 📋 Provides guidance on what to fix

**Result**: Developer must fix manually

---

## 🔐 Security & Permissions

### Required Permissions

```yaml
permissions:
  contents: write # To commit fixes
  pull-requests: write # To comment on PRs
  issues: write # To create comments
```

### Bot Identity

- **Name**: `github-actions[bot]`
- **Email**: `github-actions[bot]@users.noreply.github.com`
- **Commits**: Clearly marked as auto-generated

### Safety Measures

- Only runs on PR branches (never on main)
- Creates descriptive commit messages
- All changes are reviewable before merge
- Cannot bypass branch protection rules

---

## 🧪 Testing

### Test Phase 2 with a Demo PR

```bash
# 1. Create test branch
git checkout -b test/auto-fix-demo

# 2. Remove a dependency
npm uninstall lucide-react --workspace=apps/app

# 3. Commit and push
git add .
git commit -m "test: remove dependency to test auto-fix"
git push -u origin test/auto-fix-demo

# 4. Create PR
gh pr create --title "Test Auto-Fix" --body "Testing Phase 2"

# 5. Wait for validation to fail (~2 minutes)

# 6. Trigger auto-fix manually
gh workflow run auto-fix-errors.yml -f pr_number=<PR_NUMBER>

# 7. Wait for auto-fix (~2 minutes)

# 8. Check PR for new commit and comment
gh pr view <PR_NUMBER>

# 9. Validation should re-run and pass
```

---

## 📈 Metrics & Success Criteria

### Phase 2 Success Metrics

- ✅ Workflow syntax valid
- ✅ Manual trigger working
- ✅ Dependency detection accurate
- ✅ Auto-install functional
- ✅ Commits created correctly
- ✅ PR comments posted
- ⏳ Automatic trigger (future)

### Expected Performance

- **Detection Time**: < 30 seconds
- **Fix Time**: 1-2 minutes (npm install)
- **Total Time**: ~2-3 minutes
- **Success Rate**: ~70% of common errors

---

## 🔄 Integration with Phase 1

Phase 2 builds on Phase 1:

1. **Phase 1** validates and detects errors
2. **Phase 2** attempts to fix errors automatically
3. **Phase 1** re-validates after fixes
4. If successful → ready to merge
5. If not → manual intervention required

---

## 🚧 Known Limitations

### Current Limitations

1. **Automatic Trigger**: Disabled due to `workflow_run` complexity
   - Requires both workflows on default branch
   - PR workflows not accessible
   - **Solution**: Use manual trigger for now

2. **Code Errors**: Cannot fix TypeScript/syntax errors
   - These require human understanding
   - Bot provides guidance instead

3. **Complex Dependencies**: May not resolve all dependency conflicts
   - Some require specific versions
   - May need manual `package.json` edits

### Future Improvements

- Enable automatic triggering after validation fails
- Add more fix strategies (linting, formatting)
- Implement smarter dependency resolution
- Add retry logic for transient failures

---

## 🎓 Best Practices

### When to Use Auto-Fix

✅ Missing dependencies  
✅ Security vulnerabilities  
✅ Package lock issues  
✅ Simple, mechanical fixes

### When NOT to Use Auto-Fix

❌ Complex code errors  
❌ Logic bugs  
❌ Breaking changes  
❌ Major refactoring

### Developer Workflow

1. Create PR
2. Wait for validation
3. If fails → Check if auto-fixable
4. Trigger auto-fix if appropriate
5. Review auto-generated commit
6. Merge if checks pass

---

## 📖 Related Documentation

- [Phase 1: Pre-Deployment Validation](./PRE_DEPLOYMENT_VALIDATION.md)
- [Phase 1 Complete](./PHASE1_COMPLETE.md)
- [Automated Deployment Strategy](./AUTOMATED_DEPLOYMENT_STRATEGY.md)
- [Branch Protection Config](./BRANCH_PROTECTION_CONFIG.md)

---

## 🔗 Quick Commands

```bash
# Manual trigger auto-fix
gh workflow run auto-fix-errors.yml -f pr_number=30

# Check workflow status
gh run list --workflow="Auto-Fix Common Errors" --limit 5

# View latest run
gh run view --workflow="Auto-Fix Common Errors"

# Watch run in progress
gh run watch

# View PR checks
gh pr checks <PR_NUMBER>
```

---

**Phase 2 Status**: ✅ **READY FOR USE**

Phase 2 auto-fix system is implemented and can be triggered manually to fix common errors automatically. Automatic triggering will be enabled in a future iteration.

**Next**: Phase 3 - Automatic Rollback (when ready)
