# FASE 1: Deploy manual a Cloud Run (Windows/PowerShell)
# Uso: .\scripts\deploy-cloud-run-phase1.ps1 -Environment dev
# Uso: .\scripts\deploy-cloud-run-phase1.ps1 -Environment prod

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Environment
)

# Variables
$ProjectId = "verifactu-business"
$Region = "europe-west1"
$ArtifactRegistry = "europe-west1-docker.pkg.dev"
$ServiceNameBackend = "verifactu-backend"

# Configurar según ambiente
if ($Environment -eq "dev") {
    $CloudRunService = "verifactu-app-dev"
    $ImageTag = "dev"
    $NodeEnv = "development"
} else {
    $CloudRunService = "verifactu-app"
    $ImageTag = "latest"
    $NodeEnv = "production"
}

$ImageUrl = "${ArtifactRegistry}/${ProjectId}/verifactu/${ServiceNameBackend}:${ImageTag}"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FASE 1: Deploy Manual a Cloud Run" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Proyecto: $ProjectId"
Write-Host "Región: $Region"
Write-Host "Ambiente: $Environment"
Write-Host "Servicio: $CloudRunService"
Write-Host "Imagen: $ImageUrl"
Write-Host ""

# Paso 1: Autenticación
Write-Host "📋 Paso 1: Configurar autenticación GCP..." -ForegroundColor Yellow
gcloud auth login
gcloud config set project $ProjectId
gcloud auth configure-docker $ArtifactRegistry
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en autenticación" -ForegroundColor Red
    exit 1
}

# Paso 2: Build Docker
Write-Host ""
Write-Host "🔨 Paso 2: Construir imagen Docker..." -ForegroundColor Yellow
docker build -t $ImageUrl -f apps/api/Dockerfile .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en build Docker" -ForegroundColor Red
    exit 1
}

# Paso 3: Push a Artifact Registry
Write-Host ""
Write-Host "📤 Paso 3: Subir imagen a Artifact Registry..." -ForegroundColor Yellow
docker push $ImageUrl
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en push Docker" -ForegroundColor Red
    exit 1
}

# Paso 4: Deploy a Cloud Run
Write-Host ""
Write-Host "🚀 Paso 4: Desplegar a Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $CloudRunService `
    --image $ImageUrl `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=${NodeEnv},PORT=8080" `
    --set-secrets="ISAAK_API_KEY=isaak-api-key:latest,ISAAK_ASSISTANT_ID=isaak-assistant-id:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en deploy a Cloud Run" -ForegroundColor Red
    exit 1
}

# Paso 5: Mostrar resultado
Write-Host ""
Write-Host "✅ Deploy completado!" -ForegroundColor Green
Write-Host ""
Write-Host "Servicio disponible en:" -ForegroundColor Cyan
$ServiceUrl = (gcloud run services describe $CloudRunService --region $Region --format='value(status.url)') 2>$null
if ($ServiceUrl) {
    Write-Host $ServiceUrl -ForegroundColor Green
} else {
    Write-Host "(use 'gcloud run services describe $CloudRunService --region $Region' para obtener URL)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Ver logs:" -ForegroundColor Cyan
Write-Host "  gcloud run logs read $CloudRunService --region $Region --follow"
