# GitHub + VS Code Cheat Sheet

## 🔐 Authentication
```bash
# First time
Ctrl+Shift+P → "GitHub: Sign in"

# Or CLI
gh auth login
```

## 🌿 Create & Push Branch
```bash
git checkout -b feature/your-feature
# Make changes...
git add .
git commit -m "feat: description"
git push origin feature/your-feature
```

## 📝 Create PR
```bash
# Option 1: VS Code (Recommended)
Ctrl+Shift+P → "GitHub: Create Pull Request"

# Option 2: GitHub CLI
gh pr create

# Option 3: GitHub Web
# https://github.com/kiabusiness2025/verifactu-monorepo
# Click "Compare & pull request"
```

## 👀 View PR Status
| Location | Action |
|----------|--------|
| VS Code Panel | Click GitHub icon → Pull Requests |
| VS Code Command | Ctrl+Shift+P → "View Pull Requests" |
| GitHub Web | https://github.com/kiabusiness2025/verifactu-monorepo/pulls |

## ✅ Check CI/CD Status

In VS Code PR:
1. Click "Checks" tab
2. See 5 jobs: Lint → TypeCheck → Build → Test → Deploy
3. Green ✓ = All good, ready to merge
4. Red ✗ = Fix errors locally and push again
5. Yellow ⏳ = Still running

## 💬 Comment on PR

**In VS Code:**
1. Open PR in "Changes" tab
2. Hover over line → Click **+**
3. Type comment
4. Submit

**On GitHub Web:**
1. Click line number
2. Type comment in box
3. Click "Comment"

## 🔄 Address Review Feedback

```bash
# 1. Fix errors locally
git add .

# 2. Commit (squash into previous if minor fix)
git commit -m "fix: address review feedback"
# OR
git commit --amend --no-edit

# 3. Push (normal push or force-with-lease for ammend)
git push
# or
git push --force-with-lease

# 4. Checks run again automatically
# 5. Comment on resolved feedback
```

## ✓ Approve & Merge

**In VS Code PR:**
1. Click "Review Changes" (top right)
2. Select:
   - ✓ Approve (ready to merge)
   - 💬 Comment (feedback only)
   - 🚫 Request Changes (must fix)
3. Click "Submit Review"

**Then Merge:**
1. Click "Merge Pull Request"
2. Choose merge type:
   - Squash: Single commit (recommended)
   - Merge: Preserve all commits
   - Rebase: Linear history
3. Confirm

## 🔍 Review Someone Else's PR

```
1. Panel → Pull Requests → Click PR
2. Click "Changes" tab
3. Hover over line → Click "+" → Add comment
4. Click "Review Changes" when done
5. Select "Approve" or "Request Changes"
6. Submit Review
```

## 🚫 Merge Blocked? Fix It

| Issue | Solution |
|-------|----------|
| ❌ Lint failed | `pnpm lint --fix` |
| ❌ TypeCheck failed | `pnpm typecheck` |
| ❌ Build failed | `pnpm build` (check logs) |
| ❌ Tests failed | `pnpm test` (check logs) |
| ❌ Needs approval | Wait for @kiabusiness2025 |
| ❌ Comments unresolved | Click "Resolve" on each |
| ⏳ Checks running | Wait ~5-10 min |

## 📋 PR Checklist Template

```markdown
## PR Template (Auto-filled)

### Description
What does this PR do?

### Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Docs
- [ ] Chore

### Related Issues
Closes #123

### Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] No breaking changes

### Checklist
- [ ] Code reviewed
- [ ] ESLint passes
- [ ] TypeScript strict
- [ ] Tests pass
- [ ] Docs updated
```

## 📊 Useful Commands

| Command | Purpose |
|---------|---------|
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+B` | Toggle Sidebar |
| Click GitHub icon | GitHub Panel |
| `Ctrl+Shift+G` | Source Control |
| `gh pr view` | View current PR |
| `gh pr checks` | View check status |
| `gh pr review -a` | Approve PR |
| `gh pr merge` | Merge PR |

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Verifactu Repo | https://github.com/kiabusiness2025/verifactu-monorepo |
| Pull Requests | https://github.com/kiabusiness2025/verifactu-monorepo/pulls |
| Actions | https://github.com/kiabusiness2025/verifactu-monorepo/actions |
| Issues | https://github.com/kiabusiness2025/verifactu-monorepo/issues |

## 🎯 Example: Complete Feature Flow

```bash
# 1. Start feature
git checkout main
git pull
git checkout -b feature/add-email-template

# 2. Make changes
code src/email-template.ts
# ... edit file ...

# 3. Test locally
pnpm dev
# http://localhost:3000/dashboard/admin
# Test feature...

# 4. Lint & format
pnpm lint --fix
pnpm format

# 5. Commit
git add .
git commit -m "feat: add email template system"

# 6. Push
git push origin feature/add-email-template

# 7. Create PR
# VS Code: Ctrl+Shift+P → "Create Pull Request"
# Fill: Title, Description, Type=Feature, Testing notes

# 8. GitHub Actions runs (5 min)
# Check each job: Lint → TypeCheck → Build → Test → Deploy

# 9. Wait for review from @kiabusiness2025
# Respond to any comments

# 10. Make fixes if needed
git add .
git commit -m "fix: address review feedback"
git push

# 11. Merge when approved
# Click "Merge Pull Request" → Squash and merge

# 12. Delete branch (optional)
# GitHub suggests deletion after merge

# 13. Local cleanup
git checkout main
git pull
git branch -d feature/add-email-template
```

## ⚠️ Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Commit to main | Can't create PR | Create feature branch, cherry-pick commit, reset main |
| Force push to main | Breaks history | Only for hotfixes, ask before doing |
| Don't resolve comments | Can't merge | Click "Resolve" on each comment |
| Large unrelated changes | Slow review | Split into multiple PRs |
| No tests | CI/CD fails | Add tests before committing |
| Merge before CI passes | Deploy fails | Wait for all ✓ checks |

## 🆘 When Things Go Wrong

```bash
# View GitHub Actions logs
# 1. VS Code PR → Checks tab → Click failing job
# 2. Or: GitHub Web → Actions tab → Click workflow → Click job

# Rerun failed checks
# GitHub Web → Checks section → "Re-run failed jobs"

# Force rerun all checks
# GitHub Web → Checks section → "Re-run all jobs"

# Cancel stuck workflow
# GitHub Web → Actions → Click workflow → "Cancel workflow"
```

---

**Pro Tip:** Keep this in your VS Code workspace for quick reference! 📌
