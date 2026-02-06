# Deployment Guide - Scenario A (Unified PostgreSQL Auth)

**Date**: January 21, 2026  
**Status**: Ready for Production Deployment

## Overview

This guide covers the deployment of Scenario A implementation to production (Vercel), including:

- Prisma Accelerate configuration
- Environment variables setup
- Vercel deployment
- Production security hardening
- Monitoring and validation

---

## Prerequisites

✅ **Completed:**

- Cloud SQL database configured (verifactu_production)
- Migrations applied successfully
- Code committed and pushed to GitHub
- Local testing verified (code compiles without errors)

🔲 **Required Access:**

- Vercel account (kiabusiness2025/verifactu team)
- Prisma Cloud account (for Accelerate)
- Google Cloud Console access (for Cloud SQL)
- GitHub repository access

---

## Step 1: Configure Prisma Accelerate

Prisma Accelerate provides connection pooling, essential for serverless deployments.

### 1.1 Access Prisma Cloud Console

```
URL: https://console.prisma.io/
Login with your Prisma account
```

### 1.2 Create/Update Project

**If no project exists:**

1. Click "New Project"
2. Name: `verifactu-production`
3. Region: Select closest to your Cloud SQL instance
   - Cloud SQL (verifactu-business): `us-east-1` region
   - Recommended Accelerate region: `us-east-1`

**If project exists:**

1. Navigate to existing project
2. Go to Settings → Database Connection

### 1.3 Configure Database Connection

**Backend Connection String** (Cloud SQL direct):

```
postgres://verifactu_user:AcUvSl2K8Vdt5Q9PMIFoXziJp407YHRD@34.14.99.83:5432/verifactu_production?sslmode=require
```

**Settings:**

- Connection pooling: Enabled
- Max connections: `10` (adjust based on Cloud SQL tier)
- Timeout: `10s`
- SSL: Required

### 1.4 Get Accelerate Connection String

After configuration, Prisma will provide:

```
prisma://accelerate.prisma-data.net/?api_key=eyJhb...YOUR_API_KEY
```

**⚠️ IMPORTANT:** Copy this string - you'll need it for Vercel env vars.

**Test Connection:**

```bash
# Install Prisma CLI if needed
npm install -g prisma

# Test Accelerate connection
prisma db pull --url="prisma://accelerate.prisma-data.net/?api_key=YOUR_KEY"
```

---

## Step 2: Configure Vercel Environment Variables

You need to update env vars for **3 projects**:

1. `verifactu-app` (client dashboard)
2. `verifactu-admin` (admin panel)
3. `verifactu-landing` (if using shared DB)

### 2.1 Access Vercel Dashboard

```
URL: https://vercel.com/kiabusiness2025
Navigate to each project → Settings → Environment Variables
```

### 2.2 Required Variables for `verifactu-app`

**Database:**

```bash
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

**Firebase Admin SDK:**

```bash
FIREBASE_ADMIN_PROJECT_ID=verifactu-business-480212
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@verifactu-business-480212.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...YOUR_KEY...END PRIVATE KEY-----\n"
```

**⚠️ Note on Private Key:**

- Must be in quotes
- Newlines as `\n` (literal backslash-n, not actual newlines)
- Copy from your local `.env.local` file

**Next.js Config:**

```bash
NEXT_PUBLIC_API_URL=https://verifactu-app.vercel.app
NODE_ENV=production
```

**Environment Selection:**

- Production: ✅
- Preview: ✅ (recommended)
- Development: ❌ (use local .env.local)

### 2.3 Required Variables for `verifactu-admin`

**Database:**

```bash
DATABASE_URL=prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

**NextAuth:**

```bash
NEXTAUTH_URL=https://verifactu-admin.vercel.app
NEXTAUTH_SECRET=<generate_new_secure_random_string>
```

Generate secret:

```bash
openssl rand -base64 32
```

**Google OAuth (Workspace):**

```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

**Gmail API (if using):**

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=api-drive-gmail-calendario@verifactu-business-480212.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...END PRIVATE KEY-----\n"
```

**Environment Selection:**

- Production: ✅
- Preview: ✅
- Development: ❌

### 2.4 Update Existing Variables

If you already have `DATABASE_URL` set (pointing to old DB or Vercel Postgres):

1. **Edit** the variable (don't add new one)
2. Replace value with Prisma Accelerate URL
3. Save changes

---

## Step 3: Deploy to Vercel

### 3.1 Automatic Deployment (Recommended)

Since you pushed to `main` branch, Vercel should auto-deploy:

1. Check Vercel dashboard: https://vercel.com/kiabusiness2025
2. Look for "Building..." status on projects
3. Wait for deployment to complete (~5-10 minutes)

### 3.2 Manual Deployment (If Needed)

**Via Vercel CLI:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy app
cd apps/app
vercel --prod

# Deploy admin
cd ../admin
vercel --prod
```

**Via Vercel Dashboard:**

1. Go to project → Deployments tab
2. Click "Redeploy" on latest deployment
3. Check "Use existing Build Cache": ❌ (force fresh build)
4. Click "Redeploy"

### 3.3 Verify Build Logs

Check build logs for errors:

**Common Issues:**

**Issue:** `Cannot find module '@verifactu/db'`

```bash
# Solution: Ensure pnpm workspace is configured
# Check vercel.json has installCommand
```

**Issue:** `Prisma Client not generated`

```bash
# Solution: Ensure prebuild script in package.json:
"prebuild": "prisma generate"
```

**Issue:** `Database connection failed`

```bash
# Solution: Verify Prisma Accelerate URL is correct
# Test connection from local machine first
```

---

## Step 4: Production Security Hardening

### 4.1 Restrict Cloud SQL Access

**Current State:** Local development IP authorized (88.18.47.193)

**Production:** Remove dev IPs, add only Vercel IPs

**Option A: Use Vercel IP Ranges**

```bash
# Vercel IP ranges (check latest: https://vercel.com/docs/concepts/security/secure-compute)
# Example IPs (update with actual Vercel ranges):
76.76.21.0/24
64.252.128.0/18

# Update Cloud SQL authorized networks
gcloud sql instances patch app-fdc \
  --authorized-networks="76.76.21.0/24,64.252.128.0/18" \
  --project=verifactu-business
```

**Option B: Use Private IP (Recommended for production)**

```bash
# Enable Private IP for Cloud SQL
gcloud sql instances patch app-fdc \
  --network=projects/verifactu-business/global/networks/default \
  --no-assign-ip \
  --project=verifactu-business

# Then connect via Private IP from Vercel
# Requires Vercel Enterprise or VPC setup
```

**For now (testing):** Keep current IP authorized, add Vercel IPs

### 4.2 Update Database User Permissions

**Create Read-Only User for Analytics/Reporting:**

```bash
gcloud sql users create verifactu_readonly \
  --instance=app-fdc \
  --password="<SECURE_PASSWORD>" \
  --project=verifactu-business

# Grant read-only access via SQL
psql "postgres://verifactu_user:PASSWORD@34.14.99.83:5432/verifactu_production?sslmode=require" <<EOF
GRANT CONNECT ON DATABASE verifactu_production TO verifactu_readonly;
GRANT USAGE ON SCHEMA public TO verifactu_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO verifactu_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO verifactu_readonly;
EOF
```

### 4.3 Enable Cloud SQL Backups

**Automated Daily Backups:**

```bash
gcloud sql instances patch app-fdc \
  --backup-start-time=03:00 \
  --backup-location=us \
  --retained-backups-count=7 \
  --project=verifactu-business
```

**Manual Backup (Before Major Changes):**

```bash
gcloud sql backups create \
  --instance=app-fdc \
  --description="Pre-deployment backup - Scenario A" \
  --project=verifactu-business
```

### 4.4 Enable Audit Logging

**Database Audit Logs:**

```bash
gcloud sql instances patch app-fdc \
  --database-flags=log_statement=all,log_min_duration_statement=100 \
  --project=verifactu-business
```

**Application Audit Trail:**
Already implemented in Prisma schema (AuditLog model).
Ensure admin actions are logged.

---

## Step 5: Monitoring & Validation

### 5.1 Check Deployment Status

**Vercel:**

```
Apps:
- https://verifactu-app.vercel.app
- https://verifactu-admin.vercel.app
- https://verifactu-landing.vercel.app

Check:
- [ ] All deployments successful (green checkmarks)
- [ ] No build errors
- [ ] Functions deployed correctly
```

**Cloud SQL:**

```bash
# Check instance status
gcloud sql instances describe app-fdc \
  --project=verifactu-business \
  --format="value(state,connectionName)"

# Should show: RUNNABLE
```

**Prisma Accelerate:**

```
Console: https://console.prisma.io/
Check:
- [ ] Connection status: Active
- [ ] Query cache: Enabled
- [ ] No connection errors
```

### 5.2 Test Authentication Flows

**Test 1: Firebase Authentication**

```bash
# Get Firebase token from client app
# Replace with your deployed URL

curl -H "Authorization: Bearer <FIREBASE_TOKEN>" \
  https://verifactu-app.vercel.app/api/app/me

# Expected: 200 OK with user data
```

**Test 2: Admin Panel Login**

```bash
# Browser test:
1. Navigate to https://verifactu-admin.vercel.app
2. Sign in with @verifactu.business account
3. Verify dashboard loads
4. Check Users section shows data
```

**Test 3: Company Creation**

```bash
curl -X POST https://verifactu-app.vercel.app/api/tenants \
  -H "Authorization: Bearer <FIREBASE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Company","nif":"B12345678"}'

# Expected: 200 OK with company data
```

**Test 4: Cross-App Data Visibility**

```bash
1. Create company via client app (Test 3)
2. Login to admin panel
3. Navigate to Companies section
4. Verify new company appears immediately (same DB)
```

### 5.3 Monitor Performance

**Prisma Accelerate Dashboard:**

- Query latency (should be < 100ms p95)
- Cache hit rate (target > 80%)
- Active connections (should be < max configured)

**Vercel Functions:**

```bash
# Check function logs
vercel logs verifactu-app --prod

# Filter for errors
vercel logs verifactu-app --prod | grep ERROR
```

**Cloud SQL Metrics:**

```bash
# CPU usage
gcloud sql instances describe app-fdc \
  --project=verifactu-business \
  --format="value(currentCpuUtilization)"

# Active connections
gcloud sql instances describe app-fdc \
  --project=verifactu-business \
  --format="value(currentConnections)"
```

### 5.4 Check Error Rates

**Expected Behavior:**

- 401 errors: Normal (invalid/expired tokens)
- 500 errors: Should be 0% or < 0.1%
- Database errors: Should be 0%

**If high error rates:**

1. Check Vercel function logs
2. Verify env vars are correct
3. Test Prisma Accelerate connection
4. Check Cloud SQL instance status

---

## Step 6: Rollback Plan (If Issues Arise)

### 6.1 Immediate Rollback

**Via Vercel Dashboard:**

1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"
4. Confirm promotion

**Via Vercel CLI:**

```bash
vercel rollback <deployment-url> --prod
```

### 6.2 Revert Database Changes

**If migration causes issues:**

```bash
# Connect to Cloud SQL
psql "postgres://verifactu_user:PASSWORD@34.14.99.83:5432/verifactu_production?sslmode=require"

# Check migration history
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;

# If needed, manually revert (CAREFUL!):
# Restore from backup taken in Step 4.3
gcloud sql backups restore <BACKUP_ID> \
  --backup-instance=app-fdc \
  --backup-project=verifactu-business \
  --instance=app-fdc \
  --project=verifactu-business
```

### 6.3 Communication Plan

**If rollback is required:**

1. Notify team via Slack/email
2. Update status page (if applicable)
3. Document issue and resolution
4. Plan remediation for next deployment

---

## Post-Deployment Checklist

### Functional Testing

- [ ] Firebase users can sign in via client app
- [ ] Admin users can sign in via Google Workspace
- [ ] Companies created via app appear in admin panel
- [ ] User profile endpoint returns correct data
- [ ] No Firestore writes (verify Firebase console)
- [ ] All queries hitting PostgreSQL (check Cloud SQL metrics)

### Performance

- [ ] API response times < 500ms (p95)
- [ ] Prisma Accelerate cache hit rate > 70%
- [ ] Cloud SQL CPU usage < 50%
- [ ] No connection pool exhaustion
- [ ] Function cold starts < 2s

### Security

- [ ] Only necessary IPs authorized on Cloud SQL
- [ ] HTTPS enabled on all endpoints
- [ ] Firebase tokens validated correctly
- [ ] Admin RBAC enforced (@verifactu.business only)
- [ ] No sensitive data in logs/errors

### Monitoring

- [ ] Vercel error tracking enabled
- [ ] Cloud SQL monitoring alerts configured
- [ ] Prisma Accelerate monitoring active
- [ ] Backup schedule verified (daily at 3 AM)

---

## Troubleshooting Common Issues

### Issue: "Prisma Client validation error"

**Symptom:** Functions fail with Prisma validation errors

**Cause:** Prisma Client not regenerated after schema changes

**Solution:**

```bash
# Regenerate in packages/db
cd packages/db
npx prisma generate

# Commit and redeploy
git add .
git commit -m "chore: regenerate Prisma Client"
git push origin main
```

### Issue: "Connection timeout to database"

**Symptom:** 500 errors, "Connection timeout" in logs

**Cause:** Prisma Accelerate or Cloud SQL unreachable

**Solution:**

1. Check Cloud SQL instance is running
2. Verify Prisma Accelerate URL is correct
3. Test connection from local machine
4. Check Vercel IPs are authorized

### Issue: "Firebase token verification failed"

**Symptom:** All client app requests return 401

**Cause:** Wrong Firebase Admin credentials in Vercel

**Solution:**

1. Verify `FIREBASE_ADMIN_*` env vars in Vercel
2. Check private key has correct newline escaping (`\n`)
3. Ensure project ID matches Firebase console
4. Redeploy after fixing env vars

### Issue: "Module '@verifactu/db' not found"

**Symptom:** Build fails with module not found error

**Cause:** Workspace dependencies not resolved

**Solution:**

```bash
# Ensure apps/app/package.json includes:
"dependencies": {
  "@verifactu/db": "file:../../packages/db"
}

# Run pnpm install
pnpm install

# Commit lockfile changes
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
git push origin main
```

---

## Next Actions

### Immediate (Today)

1. ✅ Configure Prisma Accelerate
2. ✅ Update Vercel environment variables
3. ✅ Deploy to production
4. ✅ Run smoke tests

### Short-term (This Week)

5. Set up monitoring alerts
6. Restrict Cloud SQL IPs to Vercel only
7. Enable automated backups
8. Document any issues encountered

### Medium-term (This Month)

9. Migrate existing Firestore data (if any)
10. Set up staging environment
11. Configure CI/CD pipeline
12. Performance optimization review

---

## Support & Resources

**Documentation:**

- [SCENARIO_A_IMPLEMENTATION.md](./SCENARIO_A_IMPLEMENTATION.md) - Implementation details
- [TESTING_AUTH_FLOWS.md](./TESTING_AUTH_FLOWS.md) - Testing scenarios
- [CLOUD_SQL_SETUP.md](./CLOUD_SQL_SETUP.md) - Database setup

**External Resources:**

- Prisma Accelerate: https://www.prisma.io/docs/accelerate
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Cloud SQL Security: https://cloud.google.com/sql/docs/postgres/security

**Team Contacts:**

- Database issues: Check Cloud SQL console
- Deployment issues: Check Vercel dashboard
- Auth issues: Review Firebase Admin SDK logs

---

**Deployment Status**: 🟡 Ready to Deploy (Pending Prisma Accelerate + Vercel Setup)  
**Est. Time**: 30-60 minutes for full deployment  
**Risk Level**: Medium (database migration, new auth flow)  
**Rollback**: Quick (< 5 minutes via Vercel)
