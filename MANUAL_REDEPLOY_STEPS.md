# Manual Steps to Redeploy Commit 940af1c8 to Production

## Vercel Team Access

You have been invited to the Vercel team. Use this link to accept the invite:
**https://vercel.com/teams/invite/4vgTRfAiJJIp4987lkvFwnGZ6HoIMrbl**

## Step-by-Step Instructions to Redeploy

### 1. Accept Vercel Team Invite
1. Open your web browser
2. Navigate to: `https://vercel.com/teams/invite/4vgTRfAiJJIp4987lkvFwnGZ6HoIMrbl`
3. Sign in to Vercel (or create an account if needed)
4. Accept the team invitation

### 2. Locate the Deployment with Hash 940af1c8

1. Once in the Vercel dashboard, go to the **verifactu-monorepo** project
2. Click on the **Deployments** tab
3. Look through the deployment list to find the one with commit hash `940af1c8`
   - You can use Ctrl+F (or Cmd+F on Mac) to search for "940af1c8"
   - The deployment should show: "chore: update SECURITY policy with contact"
   - It should be from the `main` branch

### 3. Redeploy to Production

Once you've found the deployment with hash 940af1c8:

1. Click on the deployment to open its details
2. Look for the **three dots menu** (⋮) or the **Actions** menu
3. Click on **"Redeploy"** or **"Redeploy to Production"**
4. Confirm the redeployment when prompted

### Visual Guide

```
Vercel Dashboard
├── Select Project: verifactu-monorepo
├── Go to: Deployments tab
├── Find: Deployment with hash "940af1c8"
│   └── Commit message: "chore: update SECURITY policy with contact"
│   └── Branch: main
└── Click: "Redeploy to Production"
```

### Expected Result

After clicking "Redeploy to Production":
- Vercel will create a new deployment
- The deployment will use the exact code from commit 940af1c8
- You'll see a new deployment appear in the deployments list
- Once completed, it will be live on your production domain

### Verification

To verify the redeployment:
1. Check the deployments list - you should see a new "Production" deployment
2. The new deployment should reference commit 940af1c8
3. Visit your production URL to confirm the changes are live

## Alternative: Using Automated Tools

If you prefer automation over manual UI interaction, you can use:

1. **GitHub Actions Workflow:**
   ```bash
   # Go to GitHub Actions and manually trigger the workflow
   # Or use GitHub CLI:
   gh workflow run deploy.yml -f commit_hash=940af1c8 -f environment=production
   ```

2. **Helper Script:**
   ```bash
   ./scripts/redeploy.sh 940af1c8 production
   ```

3. **Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   # Then follow Vercel CLI documentation for redeployment
   ```

## Troubleshooting

**Can't find the deployment?**
- Ensure you're looking at the correct project (verifactu-monorepo)
- Check you're in the "Deployments" tab, not "Settings" or other tabs
- Use the search/filter functionality if available
- The deployment might be on page 2 or later if there are many deployments

**No "Redeploy" button?**
- Ensure you have the correct permissions (the team invite should grant these)
- Try refreshing the page
- Some Vercel plans might have different UI layouts

**Need Help?**
- Refer to [Vercel Documentation](https://vercel.com/docs)
- Check the REDEPLOY_GUIDE.md for more information
- Contact Vercel support if permissions issues persist

## Commit 940af1c8 Details

```
Commit: 940af1c858dd677a78f300cfc6c370b4956e64d0
Author: Ksenia ILICHEVA <soy@kseniailicheva.com>
Date: Thu Dec 25 12:13:31 2025 +0100
Message: chore: update SECURITY policy with contact
```
