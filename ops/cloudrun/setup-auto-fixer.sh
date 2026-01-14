#!/bin/bash
# Setup seguro para Vercel Auto-Fixer en Google Cloud Run

set -e

PROJECT_ID="verifactu-business"
REGION="us-central1"
FUNCTION_NAME="vercel-auto-fixer"
SERVICE_ACCOUNT="vercel-auto-fixer@${PROJECT_ID}.iam.gserviceaccount.com"

echo "📋 Vercel Auto-Fixer Setup"
echo "=================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Paso 1: Crear service account
echo "1️⃣ Creating service account..."
gcloud iam service-accounts create vercel-auto-fixer \
  --display-name="Vercel Auto-Fixer Bot" \
  --project=$PROJECT_ID || true

# Paso 2: Otorgar permisos
echo "2️⃣ Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet

# Paso 3: Almacenar tokens en Secret Manager
echo ""
echo "3️⃣ Storing secrets in Secret Manager..."
echo "Enter your GitHub token (will not be displayed):"
read -s GITHUB_TOKEN

echo "Enter your Vercel token (will not be displayed):"
read -s VERCEL_TOKEN

# Crear/actualizar secretos
echo -n "$GITHUB_TOKEN" | gcloud secrets create github-token \
  --replication-policy="automatic" \
  --data-file=- \
  --project=$PROJECT_ID 2>/dev/null || \
echo -n "$GITHUB_TOKEN" | gcloud secrets versions add github-token \
  --data-file=- \
  --project=$PROJECT_ID

echo -n "$VERCEL_TOKEN" | gcloud secrets create vercel-token \
  --replication-policy="automatic" \
  --data-file=- \
  --project=$PROJECT_ID 2>/dev/null || \
echo -n "$VERCEL_TOKEN" | gcloud secrets versions add vercel-token \
  --data-file=- \
  --project=$PROJECT_ID

# Paso 4: Grant service account access to secrets
echo "4️⃣ Granting service account access to secrets..."
gcloud secrets add-iam-policy-binding github-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID \
  --quiet

gcloud secrets add-iam-policy-binding vercel-token \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID \
  --quiet

# Paso 5: Deploy Cloud Function
echo "5️⃣ Deploying Cloud Function..."
cd "$(dirname "$0")"

gcloud functions deploy $FUNCTION_NAME \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=vercel_auto_fixer \
  --service-account=${SERVICE_ACCOUNT} \
  --set-env-vars="GCP_PROJECT=${PROJECT_ID}" \
  --region=$REGION \
  --project=$PROJECT_ID \
  --source=. \
  --timeout=600

# Paso 6: Obtener URL del webhook
echo ""
echo "6️⃣ Cloud Function deployed!"
WEBHOOK_URL=$(gcloud functions describe $FUNCTION_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(httpsTrigger.url)')

echo ""
echo "✅ Setup complete!"
echo "=================================="
echo ""
echo "🔗 Webhook URL:"
echo "$WEBHOOK_URL"
echo ""
echo "Next steps:"
echo "1. Go to Vercel dashboard"
echo "2. Project settings → Integrations"
echo "3. Add webhook:"
echo "   - URL: $WEBHOOK_URL"
echo "   - Events: Deployment failed"
echo ""
echo "The auto-fixer will now trigger on build failures! 🚀"
