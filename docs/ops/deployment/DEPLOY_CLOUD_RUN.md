# Deploy a Google Cloud Run - Guía Rápida

## 📋 Resumen

- **Proyecto GCP**: `verifactu-business`
- **Región**: `europe-west1`
- **Servicio (DEV)**: `verifactu-app-dev`
- **Servicio (PROD)**: `verifactu-app`
- **Registro**: `europe-west1-docker.pkg.dev/verifactu-business/verifactu/`

---

## FASE 1: Deploy Manual (Rápido, sin Cloud Build)

**Ideal para**: Testing rápido, deploy inicial, debugging.

### Requisitos previos

```bash
# 1. Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# 2. Verificar gcloud
gcloud --version

# 3. Instalar Docker
# https://docs.docker.com/get-docker/
```

### Paso 1: Setup inicial (una sola vez)

```bash
# Autenticarse en GCP
gcloud auth login

# Configurar proyecto
gcloud config set project verifactu-business

# Configurar Docker para Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Paso 2: Build & Push de imagen

```bash
# Variables
PROJECT_ID="verifactu-business"
REGION="europe-west1"
ARTIFACT_REGISTRY="europe-west1-docker.pkg.dev"
IMAGE_URL="${ARTIFACT_REGISTRY}/${PROJECT_ID}/verifactu/verifactu-backend:latest"

# Build imagen Docker
docker build -t ${IMAGE_URL} -f apps/api/Dockerfile .

# Push a Artifact Registry
docker push ${IMAGE_URL}
```

### Paso 3: Crear/actualizar secrets (si no existen)

```bash
# Crear secrets en Secret Manager (si no existen)
gcloud secrets create isaak-api-key --project=verifactu-business --replication-policy="automatic"
gcloud secrets create isaak-assistant-id --project=verifactu-business --replication-policy="automatic"
gcloud secrets create stripe-secret-key --project=verifactu-business --replication-policy="automatic"

# Actualizar valores (interactivo)
gcloud secrets versions add isaak-api-key --data-file=-
# (Pegar valor y Ctrl+D)

gcloud secrets versions add isaak-assistant-id --data-file=-
gcloud secrets versions add stripe-secret-key --data-file=-
```

### Paso 4: Deploy a Cloud Run (DEV)

```bash
gcloud run deploy verifactu-app-dev \
  --image europe-west1-docker.pkg.dev/verifactu-business/verifactu/verifactu-backend:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars="NODE_ENV=development,PORT=8080" \
  --set-secrets="ISAAK_API_KEY=isaak-api-key:latest,ISAAK_ASSISTANT_ID=isaak-assistant-id:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"
```

### Paso 5: Verificar deploy

```bash
# Ver URL del servicio
gcloud run services describe verifactu-app-dev --region europe-west1 --format='value(status.url)'

# Ver logs en tiempo real
gcloud run logs read verifactu-app-dev --region europe-west1 --limit 50 --follow
```

---

## FASE 2: Deploy Automatizado (Cloud Build + GitHub)

**Ideal para**: Producción, CI/CD automático, commits en GitHub triggeran deploy.

### Prerequisitos

1. **Conectar GitHub a Google Cloud**:

   ```bash
   # En Cloud Console > Cloud Build > Manage repositories
   # O en Cloud Shell:
   gcloud builds connect --region=europe-west1 --name=verifactu-monorepo
   ```

2. **Dar permisos a Cloud Build Service Account**:

   ```bash
   # Obtener número de proyecto
   PROJECT_NUMBER=$(gcloud projects describe verifactu-business --format='value(projectNumber)')

   # Dar permisos de Secret Manager
   gcloud projects add-iam-policy-binding verifactu-business \
     --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"

   # Dar permisos de Cloud Run
   gcloud projects add-iam-policy-binding verifactu-business \
     --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/run.admin"

   # Dar permisos de Service Account
   gcloud iam service-accounts add-iam-policy-binding \
     "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

### Crear Cloud Build Trigger

**Option A: Desde Cloud Console (recomendado)**

1. Ir a **Cloud Build > Triggers > Create Trigger**
2. Conectar repositorio GitHub
3. Configurar:
   - **Nombre**: `verifactu-backend-deploy`
   - **Rama**: `^main$` (o cualquier patrón)
   - **Archivo de configuración**: `cloudbuild-backend.yaml`
4. Guardar

**Option B: Desde gcloud**

```bash
gcloud builds triggers create github \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-backend.yaml \
  --name=verifactu-backend-deploy \
  --region=europe-west1
```

### Flujo automático

```
Commit push a GitHub (rama main)
    ↓
Cloud Build Trigger se activa automáticamente
    ↓
1. Build imagen Docker
2. Push a Artifact Registry
3. Deploy a `verifactu-app` (PROD) en Cloud Run
    ↓
Servicio actualizado en minutos
```

Para otras ramas (develop, staging, etc.), configurar triggers adicionales que desplieguen a `verifactu-app-dev`.

---

## 🔍 Monitoreo & Debugging

### Ver logs en tiempo real

```bash
# DEV
gcloud run logs read verifactu-app-dev --region europe-west1 --limit 50 --follow

# PROD
gcloud run logs read verifactu-app --region europe-west1 --limit 50 --follow
```

### Ver estado del servicio

```bash
gcloud run services describe verifactu-app-dev --region europe-west1

# O para todas las builds:
gcloud builds log <BUILD_ID> --stream
```

### Revertir a versión anterior

```bash
# Listar revisiones
gcloud run revisions list --service=verifactu-app-dev --region=europe-west1

# Tráfico a revisión anterior
gcloud run services update-traffic verifactu-app-dev \
  --to-revisions=<REVISION_ID>=100 \
  --region=europe-west1
```

---

## ⚙️ Variables de Entorno & Secrets

### En Cloud Run (Backend)

- **PÚBLICO** (`--set-env-vars`):
  - `NODE_ENV`: `development` | `production`
  - `PORT`: `8080`

- **PRIVADO** (`--set-secrets` desde Secret Manager):
  - `ISAAK_API_KEY`
  - `ISAAK_ASSISTANT_ID`
  - `STRIPE_SECRET_KEY`

### En Vercel (Frontend)

Solo variables `NEXT_PUBLIC_*`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_API_URL` (apuntar a Cloud Run)

---

## 📊 Costos estimados

- **Cloud Run**: ~$0.40/millón requests (con free tier 2M/mes)
- **Artifact Registry**: ~$0.10/GB/mes
- **Secret Manager**: $0.06/secret/mes
- **Cloud Build**: $0.003/build-min (free tier 120 min/día)

---

## ✅ Checklist de Deploy

### Antes de PROD

- [ ] Código compilado y tests pasando (`pnpm -w build && pnpm -w test`)
- [ ] Imagen Docker construida y testeada localmente
- [ ] Secrets configurados en Secret Manager
- [ ] Variables de entorno correctas
- [ ] Cloud Run limits configurados (memory, timeout, max instances)
- [ ] Logs configurados (Cloud Logging habilitado)

### Después de Deploy

- [ ] Servicio responde en su URL
- [ ] Logs limpios (sin errores)
- [ ] Endpoints de health check funcionan
- [ ] Secrets accesibles (si no salen en logs, están bien)
- [ ] Tráfico fluye correctamente

---

## 🆘 Troubleshooting

| Problema                                        | Solución                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `ERROR: (gcloud.run.deploy) Permissions denied` | Verificar IAM roles del service account                            |
| `Image not found in Artifact Registry`          | Verificar que `docker push` completó sin errores                   |
| `Secret not found`                              | Usar `gcloud secrets list` para verificar nombres exactos          |
| `Cannot pull image`                             | Revisar permisos de Cloud Run service account en Artifact Registry |
| `Pod does not stay running`                     | Ver logs: `gcloud run logs read`                                   |

---

## 📚 Referencias

- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Artifact Registry](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)
