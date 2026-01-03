# 📊 Resumen Ejecutivo: Deploy a Cloud Run

**Fecha**: 3 de Enero de 2026  
**Proyecto**: Verifactu Business  
**Servicios**: Backend (apps/api) a Google Cloud Run  

---

## ✅ Estado Actual

✨ **Código listo para producción:**
- Build: ✅ (landing, app, backend compilando)
- Tests: ✅ (7 tests backend, 1 test app)
- Lint: ✅ (sin errores)
- Documentación: ✅ (guías completas)

📦 **Infraestructura GCP lista:**
- Proyecto: `verifactu-business`
- Región: `europe-west1`
- Artifact Registry: `europe-west1-docker.pkg.dev/verifactu-business/verifactu/`
- Secret Manager: (para crear secrets)

---

## 🚀 Próximos Pasos (En orden)

### FASE 1: Deploy Manual (Hoy - 30 minutos)

**Objetivo**: Desplegar backend a Cloud Run de forma manual (sin automatización).

**Comando único** (desde tu máquina o Cloud Shell):

```powershell
.\scripts\deploy-cloud-run-phase1.ps1 -Environment dev
```

O **paso a paso**:

```powershell
# 1. Auth
gcloud auth login
gcloud config set project verifactu-business
gcloud auth configure-docker europe-west1-docker.pkg.dev

# 2. Build & Push
$IMAGE = "europe-west1-docker.pkg.dev/verifactu-business/verifactu/verifactu-backend:latest"
docker build -t $IMAGE -f apps/api/Dockerfile .
docker push $IMAGE

# 3. Deploy
gcloud run deploy verifactu-app-dev `
    --image $IMAGE `
    --region europe-west1 `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=development,PORT=8080"
```

**Resultado**: Servicio en vivo en `https://verifactu-app-dev-XXXXX.run.app`

---

### FASE 2: Setup Secrets (Mañana - 15 minutos)

**Objetivo**: Agregar credenciales privadas (ISAAK_API_KEY, Stripe, etc.)

```bash
# Crear secrets en Secret Manager
gcloud secrets create isaak-api-key --replication-policy="automatic" --project=verifactu-business
gcloud secrets create isaak-assistant-id --replication-policy="automatic" --project=verifactu-business
gcloud secrets create stripe-secret-key --replication-policy="automatic" --project=verifactu-business

# Actualizar con valores reales (interactivo)
gcloud secrets versions add isaak-api-key --data-file=-
# (pegar valor, Ctrl+D)

gcloud secrets versions add isaak-assistant-id --data-file=-
gcloud secrets versions add stripe-secret-key --data-file=-

# Re-deploy con secrets
gcloud run deploy verifactu-app-dev `
    --image $IMAGE `
    ... (igual al anterior)
    --set-secrets="ISAAK_API_KEY=isaak-api-key:latest,ISAAK_ASSISTANT_ID=isaak-assistant-id:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest"
```

---

### FASE 3: Deploy Automático (En 1 semana - 30 minutos)

**Objetivo**: Cada push a GitHub → Deploy automático en Cloud Run (sin manual).

**Pasos**:

1. **Conectar GitHub a Cloud Build**:
   ```bash
   gcloud builds connect --region=europe-west1
   # (Sigue instrucciones interactivas)
   ```

2. **Crear Cloud Build Trigger**:
   ```bash
   gcloud builds triggers create github \
     --name=verifactu-backend-deploy \
     --repo-name=verifactu-monorepo \
     --repo-owner=kiabusiness2025 \
     --branch-pattern="^main$" \
     --build-config=cloudbuild-backend.yaml \
     --region=europe-west1
   ```

3. **Configurar permisos**:
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

4. **Probar**: Hacer un commit pequeño a `main` y verificar que Cloud Run se actualiza automáticamente.

---

## 📚 Documentación Disponible

| Guía | Propósito | Tiempo |
|------|-----------|--------|
| [QUICKSTART_CLOUD_RUN.md](./QUICKSTART_CLOUD_RUN.md) | Deploy rápido (10 min) | 10 min |
| [DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md) | Manual completo (manual + auto) | 30 min |
| [GITHUB_CLOUD_BUILD_SETUP.md](./GITHUB_CLOUD_BUILD_SETUP.md) | Automatización GitHub → GCP | 30 min |

---

## 🎯 Decisiones Clave

### 1. Arquitectura de Deploy

```
Branch main → Cloud Run PROD (verifactu-app)
Branch dev  → Cloud Run DEV  (verifactu-app-dev)
```

✅ `cloudbuild-backend.yaml` **ya está preparado** para esto.

### 2. Secrets Management

- **NO guardar secrets en código** ✅
- **Usar Secret Manager de GCP** ✅
- **Cloud Run inyecta automáticamente** ✅

### 3. Imágenes Docker

- **Artifact Registry**: `europe-west1-docker.pkg.dev/verifactu-business/verifactu/`
- **Tags**: `latest`, `dev`, `prod`, `git-sha` (para trazabilidad)

---

## 💰 Costos Estimados (Mes)

| Servicio | Uso | Costo |
|----------|-----|-------|
| Cloud Run | 100K requests/mes | $0.04 |
| Artifact Registry | 5GB | $0.50 |
| Secret Manager | 3 secrets | $0.18 |
| Cloud Build | 300 min | $0.90 |
| **TOTAL** | | **~$1.62/mes** |

*(Con free tier: 2M requests, 120 build-min, primeros 3 secrets gratis)*

---

## 🔒 Seguridad

- ✅ Secrets en Secret Manager (no en env vars públicas)
- ✅ Cloud Run con `--allow-unauthenticated` (agregar auth si necesario)
- ✅ Imagen Docker minimalista (Node 18 Alpine)
- ✅ Build automático = código revisado en GitHub antes de deploy

---

## ⚠️ Pre-requisitos No Completados (Acciones del Usuario)

1. **Valores de Secrets**: Necesito que proporciones:
   - `ISAAK_API_KEY`
   - `ISAAK_ASSISTANT_ID`
   - `STRIPE_SECRET_KEY`

2. **Conexión GitHub**: Si quieres FASE 3 (automático), necesitas:
   - Acceso a https://console.cloud.google.com
   - Permisos de administrador en repo GitHub

3. **Dominio personalizado** (opcional):
   - Si quieres `api.verifactu.business` en lugar de `verifactu-app-dev.run.app`
   - Agregar CNAME DNS + certificado SSL (Google Cloud lo maneja automático)

---

## 📞 Próxima Acción

**Hoy**:
1. Proporciona los **valores de secrets** (ISAAK_API_KEY, etc.)
2. Ejecuta FASE 1: `.\scripts\deploy-cloud-run-phase1.ps1 -Environment dev`
3. Verifica que el servicio responde en la URL

**Mañana**:
1. Agrega secrets a Secret Manager
2. Re-deploy con secrets

**Próxima semana**:
1. Conecta GitHub a Cloud Build
2. Configura triggers automáticos
3. Deploy automático listo

---

## ✅ Checklist Final

- [ ] Scripts descargados: `scripts/deploy-cloud-run-phase1.ps1`
- [ ] Documentación leída: `QUICKSTART_CLOUD_RUN.md`
- [ ] Cloud SDK instalado: `gcloud --version`
- [ ] Docker instalado: `docker --version`
- [ ] Proyecto GCP configurado: `gcloud config list`
- [ ] Secrets disponibles (para FASE 2)
- [ ] Primer deploy ejecutado (FASE 1)

---

**Última actualización**: 3 de Enero de 2026  
**Mantenedor**: Isaak (AI Agent)

