# 🎯 Comandos Rápidos - Cloud Run Deploy

## Autenticación (Una sola vez)

```powershell
gcloud auth login
gcloud config set project verifactu-business
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

---

## FASE 1: Deploy Manual (10 minutos)

### Opción A: Script automático (Recomendado)

```powershell
# DEV
.\scripts\deploy-cloud-run-phase1.ps1 -Environment dev

# PROD
.\scripts\deploy-cloud-run-phase1.ps1 -Environment prod
```

### Opción B: Manual paso a paso

```powershell
# Variables
$PROJECT = "verifactu-business"
$REGION = "europe-west1"
$IMAGE = "europe-west1-docker.pkg.dev/${PROJECT}/verifactu/verifactu-backend:latest"

# Build
docker build -t $IMAGE -f apps/api/Dockerfile .

# Push
docker push $IMAGE

# Deploy DEV
gcloud run deploy verifactu-app-dev `
    --image $IMAGE `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=development,PORT=8080"

# Deploy PROD
gcloud run deploy verifactu-app `
    --image $IMAGE `
    --region $REGION `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=production,PORT=8080"
```

---

## FASE 2: Secrets (5 minutos)

### Crear secrets

```bash
gcloud secrets create isaak-api-key --replication-policy="automatic"
gcloud secrets create isaak-assistant-id --replication-policy="automatic"
gcloud secrets create stripe-secret-key --replication-policy="automatic"
```

### Actualizar con valores

```bash
# Interactivo: pega valor y Ctrl+D
echo "tu-valor-aqui" | gcloud secrets versions add isaak-api-key --data-file=-
echo "tu-valor-aqui" | gcloud secrets versions add isaak-assistant-id --data-file=-
echo "tu-valor-aqui" | gcloud secrets versions add stripe-secret-key --data-file=-
```

### Re-deploy con secrets

```powershell
gcloud run deploy verifactu-app-dev `
    --image $IMAGE `
    --region europe-west1 `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=development,PORT=8080" `
    --set-secrets="ISAAK_API_KEY=isaak-api-key:latest,ISAAK_ASSISTANT_ID=isaak-assistant-id:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"
```

---

## FASE 3: Automatización (30 minutos)

### 1. Conectar GitHub

```bash
gcloud builds connect --region=europe-west1
# Sigue instrucciones interactivas
```

### 2. Crear Trigger

```bash
gcloud builds triggers create github \
  --name=verifactu-backend-deploy \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-backend.yaml \
  --region=europe-west1
```

### 3. Configurar IAM

```bash
PROJECT_NUMBER=$(gcloud projects describe verifactu-business --format='value(projectNumber)')

gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## 📊 Monitoreo

### Ver logs en vivo

```bash
# DEV
gcloud run logs read verifactu-app-dev --region europe-west1 --follow

# PROD
gcloud run logs read verifactu-app --region europe-west1 --follow
```

### Ver estado

```bash
gcloud run services describe verifactu-app-dev --region europe-west1
gcloud run revisions list --service=verifactu-app-dev --region=europe-west1
```

### Ver builds

```bash
gcloud builds list --region=europe-west1
gcloud builds log <BUILD_ID> --region=europe-west1
```

---

## 🔄 Redeploy / Rollback

### Redeploy (última imagen)

```powershell
gcloud run deploy verifactu-app-dev `
    --image $IMAGE `
    --region europe-west1 `
    --platform managed
```

### Ver revisiones anteriores

```bash
gcloud run revisions list --service=verifactu-app-dev --region=europe-west1 --limit 5
```

### Rollback a revisión anterior

```bash
gcloud run services update-traffic verifactu-app-dev \
    --to-revisions=<REVISION_ID>=100 \
    --region=europe-west1
```

---

## 🗑️ Limpiar recursos

### Eliminar servicio

```bash
gcloud run services delete verifactu-app-dev --region europe-west1
```

### Eliminar imagen

```bash
gcloud artifacts docker images delete \
    europe-west1-docker.pkg.dev/verifactu-business/verifactu/verifactu-backend:latest
```

### Eliminar secret

```bash
gcloud secrets delete isaak-api-key
```

---

## ✅ Checklist de Deploy

- [ ] Build local: `pnpm -w build` ✅
- [ ] Tests: `pnpm -w test` ✅
- [ ] Lint: `pnpm -w lint` ✅
- [ ] Docker auth: `gcloud auth configure-docker`
- [ ] Build Docker: `docker build ...`
- [ ] Push Docker: `docker push ...`
- [ ] Deploy CR: `gcloud run deploy ...`
- [ ] Verificar URL
- [ ] Verificar logs: `gcloud run logs read ...`

---

## 🆘 Troubleshooting Rápido

| Error | Solución |
|-------|----------|
| `Permission denied` | `gcloud auth login && gcloud auth configure-docker` |
| `Image not found` | Verificar `docker push` completó |
| `Pod does not stay running` | Ver logs: `gcloud run logs read <service>` |
| `Secret not found` | Verificar nombre exacto: `gcloud secrets list` |
| `Build failed` | Ver log completo: `gcloud builds log <BUILD_ID> --stream` |

---

**Más detalles en [DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md)**

