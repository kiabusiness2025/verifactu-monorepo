# Branch Protection Configuration

**Status**: ✅ **ACTIVE**  
**Configured**: January 20, 2026  
**Branch**: `main`

---

## 🛡️ Protection Rules Applied

### Required Status Checks

✅ **Strict mode enabled** - Branch must be up to date before merging

**Required Checks**:

- ✅ `Pre-Deployment Validation / Validate App Build` - Ensures apps/app compiles successfully
- ✅ `Pre-Deployment Validation / Validate Landing Build` - Ensures apps/landing compiles successfully
- ✅ `Build Check - Admin Panel / Build Admin Panel` - Ensures apps/admin compiles successfully

### Other Settings

- ❌ Enforce for administrators: **Disabled** (admins can bypass in emergencies)
- ❌ Required pull request reviews: **Not required** (optional for now)
- ❌ Required linear history: **Disabled**
- ❌ Force push: **Blocked**
- ❌ Branch deletion: **Blocked**

---

## 📋 What This Means

### For Pull Requests

1. **Cannot merge** until both validation checks pass
2. Must wait for GitHub Actions to complete (~2 minutes)
3. PR will show "Merging is blocked" if checks fail
4. Clear feedback via automated comments

### For Direct Pushes to Main

- Still allowed (no PR review required)
- However, validation workflow runs on push
- Failed deployments will be caught in CI

### For Emergency Fixes

- Admins can bypass if absolutely necessary
- Use with extreme caution
- Document reason in commit message

---

## 🎯 Benefits

✅ **Prevents broken deployments** - Bad code can't reach Vercel  
✅ **Catches errors early** - Before they affect production  
✅ **Maintains code quality** - Type safety enforced  
✅ **Clear feedback** - Developers know exactly what's wrong  
✅ **Protects main branch** - Stable baseline preserved

---

## 🔧 Modifying Protection Rules

### Via GitHub CLI

```bash
# View current rules
gh api repos/kiabusiness2025/verifactu-monorepo/branches/main/protection

# Update rules (create JSON file first)
gh api repos/kiabusiness2025/verifactu-monorepo/branches/main/protection \
  -X PUT --input protection-config.json
```

### Via GitHub Web Interface

1. Go to: https://github.com/kiabusiness2025/verifactu-monorepo/settings/branches
2. Click "Edit" on `main` branch rule
3. Modify settings as needed
4. Save changes

---

## 📊 Configuration Details

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Pre-Deployment Validation / Validate App Build",
      "Pre-Deployment Validation / Validate Landing Build",
      "Build Check - Admin Panel / Build Admin Panel"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

### Context Names

These must match exactly the workflow/job names:

- `Pre-Deployment Validation / Validate App Build` → `.github/workflows/pre-deployment-check.yml` / `validate-app`
- `Pre-Deployment Validation / Validate Landing Build` → `.github/workflows/pre-deployment-check.yml` / `validate-landing`
- `Build Check - Admin Panel / Build Admin Panel` → `.github/workflows/build-admin.yml` / `build-admin`

---

## 🧪 Testing Protection Rules

### Test with a PR

```bash
# Create test branch
git checkout -b test/branch-protection

# Make a breaking change (e.g., remove a dependency)
npm uninstall lucide-react --workspace=apps/app

# Commit and push
git add .
git commit -m "test: verify branch protection blocks bad code"
git push -u origin test/branch-protection

# Create PR
gh pr create --title "Test: Branch Protection" --body "Testing branch protection rules"

# Observe: PR should show "Merging is blocked" with failed checks
```

### Expected Behavior

1. ✅ Workflow triggers automatically
2. ❌ Build fails due to missing dependency
3. 🤖 Bot comments on PR with error details
4. 🚫 "Merge" button is disabled
5. ✅ Must fix issue and push again

---

## 🔄 Updating Required Checks

If you rename workflow jobs or add new required checks:

```bash
# Update protection rules
cat > protection-update.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Validate App Build",
      "Validate Landing Build",
      "New Check Name Here"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

gh api repos/kiabusiness2025/verifactu-monorepo/branches/main/protection \
  -X PUT --input protection-update.json
```

---

## 📖 Related Documentation

- [Phase 1 Testing Results](./PHASE1_TESTING_RESULTS.md)
- [Pre-Deployment Validation Guide](./PRE_DEPLOYMENT_VALIDATION.md)
- [Automated Deployment Strategy](./AUTOMATED_DEPLOYMENT_STRATEGY.md)

---

## ⚠️ Important Notes

1. **Strict Mode**: PRs must be updated with latest main before merging
2. **Admin Bypass**: Available but should be used only in emergencies
3. **Check Names**: Must exactly match workflow job names
4. **Timeout**: Checks have 60-minute timeout (current execution: ~2 minutes)

---

**Protection Status**: ✅ **ACTIVE AND ENFORCED**

Your main branch is now protected and will reject any PR that doesn't pass validation checks.
