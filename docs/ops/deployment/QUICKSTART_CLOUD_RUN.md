# 🚀 Quick Start - Deploy a Cloud Run en 10 minutos

**Para usuarios que recién comienzan. Caso de uso**: Desplegar el backend (`apps/api`) a Google Cloud Run en DEV.

---

## 📋 Requisitos

- [ ] Google Cloud SDK instalado (`gcloud --version`)
- [ ] Docker instalado (`docker --version`)
- [ ] Acceso al proyecto GCP: `verifactu-business`
- [ ] Este repositorio clonado localmente

---

## ⚡ 3 Pasos rápidos

### Paso 1: Autenticación (5 min)

```powershell
# Iniciar sesión
gcloud auth login

# Configurar proyecto
gcloud config set project verifactu-business

# Permitir a Docker usar Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Paso 2: Build & Push de imagen (3 min)

```powershell
# Variables
$PROJECT_ID = "verifactu-business"
$REGION = "europe-west1"
$IMAGE_URL = "europe-west1-docker.pkg.dev/${PROJECT_ID}/verifactu/verifactu-backend:latest"

# Construir
docker build -t $IMAGE_URL -f apps/api/Dockerfile .

# Subir
docker push $IMAGE_URL
```

### Paso 3: Deploy a Cloud Run (2 min)

```powershell
gcloud run deploy verifactu-app-dev `
    --image europe-west1-docker.pkg.dev/verifactu-business/verifactu/verifactu-backend:latest `
    --region europe-west1 `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --timeout 300 `
    --set-env-vars="NODE_ENV=development,PORT=8080"
```

✅ **¡Listo!** Tu servicio está en Cloud Run.

---

## ✨ Próximos pasos

| Necesidad                               | Guía                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Agregar secrets (`ISAAK_API_KEY`, etc.) | [Ver DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md#paso-3-crear--actualizar-secrets) |
| Deploy automático desde GitHub          | [Ver GITHUB_CLOUD_BUILD_SETUP.md](./GITHUB_CLOUD_BUILD_SETUP.md)                  |
| Monitorear logs                         | `gcloud run logs read verifactu-app-dev --region europe-west1 --follow`           |
| Ver todos los comandos                  | [Ver DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md)                                  |

---

## 🆘 Si algo falla

```powershell
# Ver logs en tiempo real
gcloud run logs read verifactu-app-dev --region europe-west1 --follow

# Ver estado del servicio
gcloud run services describe verifactu-app-dev --region europe-west1

# Listar todas tus imágenes Docker
docker images | findstr verifactu
```

---

**Para instrucciones completas, ver [DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md)**
