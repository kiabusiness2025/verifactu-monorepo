# Cloud Run PORT Configuration Fix

## Problem

Cloud Run deployment fails with error:
```
The user-provided container failed to start and listen on the port defined provided by the PORT=3000 environment variable
```

## Root Cause

This error occurs when there's a mismatch between:
1. The port the application listens on inside the container
2. The port Cloud Run expects the application to use
3. Any existing environment variables from previous deployments

## Solution

### 1. Clean Up Existing Service (Recommended)

If you have an existing service with wrong PORT configuration:

```bash
# Delete the existing service
gcloud run services delete verifactu-landing --region=europe-west1 --quiet

# Redeploy with correct configuration
gcloud builds submit --config=cloudbuild.yaml
```

### 2. Update Existing Service Manually

If you prefer to update the existing service:

```bash
# Update the service with correct port configuration
gcloud run services update verifactu-landing \
  --port=8080 \
  --region=europe-west1 \
  --clear-env-vars
```

**Note**: The `--clear-env-vars` flag removes any custom PORT variable that might have been set incorrectly.

### 3. Verify Container Configuration

Check that your Dockerfile has the correct configuration:

```dockerfile
# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
```

### 4. Verify Cloud Build Configuration

Check that `cloudbuild.yaml` explicitly sets the port:

```yaml
- name: 'gcr.io/cloud-builders/gcloud'
  args:
    - 'run'
    - 'deploy'
    - 'verifactu-landing'
    - '--port'
    - '8080'
    # ... other args
```

## How Cloud Run PORT Works

1. **Cloud Run automatically sets `PORT` environment variable** to `8080` (by default)
2. **Your application must listen on this port** (`0.0.0.0:8080`)
3. **Never manually set PORT in Cloud Run** environment variables (it's reserved)
4. **Use `--port` flag** in deployment to explicitly declare the container port

## Verification Steps

### Step 1: Check Current Service Configuration

```bash
gcloud run services describe verifactu-landing \
  --region=europe-west1 \
  --format="yaml(spec.template.spec.containers[0].ports)"
```

Expected output:
```yaml
spec:
  template:
    spec:
      containers:
      - ports:
        - containerPort: 8080
```

### Step 2: Check Environment Variables

```bash
gcloud run services describe verifactu-landing \
  --region=europe-west1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

**PORT should NOT appear in the env list** (it's set automatically by Cloud Run).

### Step 3: Test Local Docker Image

```bash
# Build the image
cd apps/landing
docker build -t verifactu-landing-test .

# Run locally (Cloud Run will use PORT=8080 automatically)
docker run -p 8080:8080 -e PORT=8080 verifactu-landing-test

# Test in browser
curl http://localhost:8080
```

### Step 4: Check Deployment Logs

```bash
# View recent logs
gcloud run services logs read verifactu-landing \
  --region=europe-west1 \
  --limit=50

# Look for these successful patterns:
# - "Server listening on port 8080"
# - "Ready on http://0.0.0.0:8080"
# - No "EADDRINUSE" or "port already in use" errors
```

## Complete Redeployment Process

If all else fails, perform a complete redeployment:

```bash
# 1. Delete existing service
gcloud run services delete verifactu-landing --region=europe-west1 --quiet

# 2. Delete existing images (optional, for complete fresh start)
gcloud container images delete gcr.io/verifactu-business-480212/verifactu-landing:latest --quiet

# 3. Rebuild and redeploy
gcloud builds submit --config=cloudbuild.yaml

# 4. Verify deployment
gcloud run services describe verifactu-landing \
  --region=europe-west1 \
  --format="value(status.url)"
```

## Common Mistakes to Avoid

1. ❌ **Don't set PORT in `--set-env-vars`**
   ```bash
   # WRONG:
   gcloud run deploy ... --set-env-vars PORT=3000
   ```

2. ❌ **Don't use different ports in Dockerfile and deployment**
   ```dockerfile
   # Dockerfile says 8080
   EXPOSE 8080
   ```
   ```bash
   # But deployment says 3000 - MISMATCH!
   gcloud run deploy ... --port 3000
   ```

3. ❌ **Don't hardcode PORT in application code**
   ```javascript
   // WRONG:
   const PORT = 3000;
   
   // CORRECT:
   const PORT = process.env.PORT || 8080;
   ```

## Next.js Standalone Specifics

Next.js standalone server automatically reads `PORT` from environment:

```javascript
// This is handled automatically in server.js
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0');
```

**Important**: Cloud Run always sets `PORT=8080`, so the default `3000` is never used in production.

## Troubleshooting Checklist

- [ ] Dockerfile has `ENV PORT=8080`
- [ ] Dockerfile has `EXPOSE 8080`
- [ ] cloudbuild.yaml has `--port 8080`
- [ ] No custom PORT in `--set-env-vars`
- [ ] Application listens on `0.0.0.0` (not just `localhost`)
- [ ] Deleted old service with wrong configuration
- [ ] Timeout is sufficient (at least 300 seconds)
- [ ] Container starts within the timeout period
- [ ] No errors in application startup logs

## Additional Resources

- [Cloud Run Container Contract](https://cloud.google.com/run/docs/container-contract)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [Troubleshooting Cloud Run](https://cloud.google.com/run/docs/troubleshooting)
- [Next.js Standalone Mode](https://nextjs.org/docs/pages/api-reference/next-config-js/output#automatically-copying-traced-files)

## Quick Fix Command

```bash
# One-command fix for PORT issues
gcloud run services update verifactu-landing \
  --port=8080 \
  --timeout=300 \
  --clear-env-vars \
  --region=europe-west1 && \
gcloud run services update verifactu-landing \
  --set-env-vars=NODE_ENV=production \
  --region=europe-west1
```

This command:
1. Sets the correct port (8080)
2. Increases timeout to 5 minutes
3. Clears all environment variables (including any wrong PORT)
4. Re-adds only the necessary NODE_ENV variable
