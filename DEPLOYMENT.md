# Deployment Guide - Google Cloud Run

This guide explains how to deploy the verifactu applications to Google Cloud Run.

## Prerequisites

1. Google Cloud account with billing enabled
2. Google Cloud CLI (`gcloud`) installed
3. Docker installed locally (for testing)
4. Project created in Google Cloud Console

## Initial Setup

### 1. Configure Google Cloud CLI

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 2. Set up Secret Manager

Store sensitive credentials in Secret Manager:

```bash
# Create secrets for NextAuth
echo -n "YOUR_NEXTAUTH_SECRET" | gcloud secrets create nextauth-secret --data-file=-

# Create secrets for Google OAuth
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create google-client-id --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create google-client-secret --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding nextauth-secret \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-client-id \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding google-client-secret \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Deployment Options

### Option 1: Automated Deployment with Cloud Build

Use the included `cloudbuild.yaml` file for automated builds and deployments:

```bash
# Deploy from repository
gcloud builds submit --config=cloudbuild.yaml

# Or trigger from Cloud Build triggers (recommended for CI/CD)
gcloud builds triggers create github \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

### Option 2: Manual Deployment

#### Deploy verifactu-landing:

```bash
# Build Docker image
cd apps/landing
docker build -t gcr.io/YOUR_PROJECT_ID/verifactu-landing:latest .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/verifactu-landing:latest

# Deploy to Cloud Run
gcloud run deploy verifactu-landing \
  --image gcr.io/YOUR_PROJECT_ID/verifactu-landing:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-secrets="NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --set-env-vars="NEXTAUTH_URL=https://verifactu.business"
```

#### Deploy verifactu-app:

```bash
# Build Docker image
cd apps/app
docker build -t gcr.io/YOUR_PROJECT_ID/verifactu-app:latest .

# Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/verifactu-app:latest

# Deploy to Cloud Run
gcloud run deploy verifactu-app \
  --image gcr.io/YOUR_PROJECT_ID/verifactu-app:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi
```

## Environment Variables

Configure the following environment variables in Cloud Run:

### verifactu-landing:
- `NEXTAUTH_URL`: Your production domain (e.g., https://verifactu.business)
- `NEXTAUTH_SECRET`: Secret from Secret Manager
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID from Secret Manager
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret from Secret Manager
- `DATABASE_URL`: PostgreSQL connection string (when database is set up)

### verifactu-app:
- `NODE_ENV`: production
- Add other environment variables as needed

## Testing Locally

Test Docker images locally before deploying:

```bash
# Build and run landing locally
cd apps/landing
docker build -t verifactu-landing:local .
docker run -p 8080:8080 \
  -e NEXTAUTH_URL=http://localhost:8080 \
  -e NEXTAUTH_SECRET=test-secret \
  verifactu-landing:local

# Build and run app locally
cd apps/app
docker build -t verifactu-app:local .
docker run -p 8081:8080 verifactu-app:local
```

## Monitoring and Logs

View logs in Cloud Run:

```bash
# View logs for landing
gcloud run services logs read verifactu-landing --region europe-west1

# View logs for app
gcloud run services logs read verifactu-app --region europe-west1

# Stream logs in real-time
gcloud run services logs tail verifactu-landing --region europe-west1
```

## Custom Domain Setup

Map a custom domain to your Cloud Run services:

```bash
# Map domain to landing
gcloud run domain-mappings create \
  --service verifactu-landing \
  --domain verifactu.business \
  --region europe-west1

# Map domain to app
gcloud run domain-mappings create \
  --service verifactu-app \
  --domain app.verifactu.business \
  --region europe-west1
```

## Troubleshooting

### Build Failures
- Check Cloud Build logs: `gcloud builds log --region=europe-west1`
- Verify Dockerfile syntax and paths
- Ensure all dependencies are in package.json

### Deployment Issues
- Verify service account permissions
- Check Secret Manager access
- Review Cloud Run service logs

### Memory Issues
- Increase memory allocation: `--memory 1Gi` or `--memory 2Gi`
- Monitor memory usage in Cloud Run metrics

## Cost Optimization

- Set minimum instances to 0 for cost savings
- Use `--cpu-throttling` for services with variable load
- Monitor costs in Google Cloud Console
- Set up budget alerts

## Next Steps

1. Set up Cloud SQL for PostgreSQL database
2. Configure Cloud Armor for DDoS protection
3. Set up Cloud CDN for static assets
4. Enable Cloud Monitoring and alerting
5. Implement proper backup strategies
