# Vercel Redeployment Guide

This guide explains how to redeploy a specific commit to Vercel production or preview environments.

## Overview

The verifactu-monorepo uses Vercel for continuous deployment. Deployments are automatically triggered on pushes to the `main` branch. However, you can also manually trigger a redeployment of any specific commit.

## Methods for Redeployment

### Method 1: Using the Helper Script (Recommended)

We provide a helper script that simplifies the redeployment process:

```bash
./scripts/redeploy.sh <commit_hash> [environment]
```

**Parameters:**
- `commit_hash`: The git commit hash to redeploy (e.g., `940af1c8`)
- `environment`: Target environment (optional, default: `production`)
  - `production`: Deploy to production
  - `preview`: Deploy to preview environment

**Example:**
```bash
# Redeploy commit 940af1c8 to production
./scripts/redeploy.sh 940af1c8 production

# Redeploy commit abc1234 to preview
./scripts/redeploy.sh abc1234 preview
```

### Method 2: Using GitHub Actions UI

1. Navigate to the repository on GitHub
2. Go to **Actions** tab
3. Select **Deploy to Vercel** workflow
4. Click **Run workflow** button
5. Fill in the parameters:
   - **commit_hash**: Enter the commit hash (e.g., `940af1c8`)
   - **environment**: Select `production` or `preview`
6. Click **Run workflow** to trigger the deployment

### Method 3: Using GitHub CLI

If you have the GitHub CLI installed:

```bash
gh workflow run deploy.yml \
  -f commit_hash=940af1c8 \
  -f environment=production
```

### Method 4: Via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Deployments** tab
4. Find the deployment with commit hash `940af1c8`
5. Click the **...** (three dots) menu on that deployment
6. Select **Redeploy to Production** or **Promote to Production**

## Specific Case: Redeploying Commit 940af1c8

To redeploy the specific commit mentioned in your request (940af1c8):

```bash
./scripts/redeploy.sh 940af1c8 production
```

This commit contains: "chore: update SECURITY policy with contact"

## Verifying Deployment

After triggering a redeployment:

1. **Check GitHub Actions:**
   ```bash
   gh run list --workflow=deploy.yml
   ```

2. **Check Vercel Dashboard:**
   - Visit your project on [Vercel Dashboard](https://vercel.com/dashboard)
   - Look for the new deployment in the Deployments list

3. **Check Deployment URL:**
   - Production: Your production domain
   - Preview: Vercel will provide a preview URL

## Troubleshooting

- **Commit not found:** Ensure the commit hash exists in the repository
  ```bash
  git log --oneline | grep 940af1c8
  ```

- **Workflow not triggering:** Check GitHub Actions permissions in repository settings

- **Vercel deployment not starting:** Ensure Vercel integration is properly configured with your GitHub repository

## Notes

- Vercel automatically deploys all commits pushed to the `main` branch
- Manual redeployments are useful for rolling back to a specific version or promoting a tested commit
- The workflow uses Vercel's GitHub integration, so ensure it's properly configured
