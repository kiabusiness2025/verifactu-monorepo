#!/bin/bash
# FASE 1: Deploy manual repetible a Cloud Run
# Uso: ./scripts/deploy-cloud-run-phase1.sh [dev|prod]

set -e

# Variables
PROJECT_ID="verifactu-business"
REGION="europe-west1"
ARTIFACT_REGISTRY="europe-west1-docker.pkg.dev"
SERVICE_NAME="verifactu-backend"
ENVIRONMENT="${1:-dev}"  # dev o prod (default: dev)

# Validar ambiente
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "❌ Ambiente inválido. Usar: dev o prod"
  exit 1
fi

# Configurar nombre del servicio según ambiente
if [[ "$ENVIRONMENT" == "dev" ]]; then
  CLOUD_RUN_SERVICE="verifactu-app-dev"
  IMAGE_TAG="dev"
else
  CLOUD_RUN_SERVICE="verifactu-app"
  IMAGE_TAG="latest"
fi

IMAGE_URL="${ARTIFACT_REGISTRY}/${PROJECT_ID}/verifactu/${SERVICE_NAME}:${IMAGE_TAG}"

echo "=========================================="
echo "FASE 1: Deploy Manual a Cloud Run"
echo "=========================================="
echo "Proyecto: ${PROJECT_ID}"
echo "Región: ${REGION}"
echo "Ambiente: ${ENVIRONMENT}"
echo "Servicio Cloud Run: ${CLOUD_RUN_SERVICE}"
echo "Imagen: ${IMAGE_URL}"
echo ""

# Paso 1: Autenticación
echo "📋 Paso 1: Configurar autenticación GCP..."
gcloud auth login
gcloud config set project ${PROJECT_ID}
gcloud auth configure-docker ${ARTIFACT_REGISTRY}

# Paso 2: Build de imagen Docker
echo ""
echo "🔨 Paso 2: Construir imagen Docker..."
docker build -t ${IMAGE_URL} -f apps/api/Dockerfile .

# Paso 3: Push a Artifact Registry
echo ""
echo "📤 Paso 3: Subir imagen a Artifact Registry..."
docker push ${IMAGE_URL}

# Paso 4: Deploy a Cloud Run
echo ""
echo "🚀 Paso 4: Desplegar a Cloud Run..."

gcloud run deploy ${CLOUD_RUN_SERVICE} \
  --image ${IMAGE_URL} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars="NODE_ENV=${ENVIRONMENT},PORT=8080" \
  --set-secrets="ISAAK_API_KEY=isaak-api-key:latest,ISAAK_ASSISTANT_ID=isaak-assistant-id:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"

echo ""
echo "✅ Deploy completado!"
echo ""
echo "Servicio disponible en:"
gcloud run services describe ${CLOUD_RUN_SERVICE} --region ${REGION} --format='value(status.url)'

