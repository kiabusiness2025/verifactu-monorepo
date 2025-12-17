# Solución al Error: Image 'gcr.io/verifactu-business-480212/web-app' not found

## 🔴 Problema Identificado

El error indica que Cloud Run está buscando una imagen Docker llamada `web-app` en el proyecto `verifactu-business-480212`, pero esta imagen no existe en Container Registry.

## 🔍 Análisis

Basándome en la configuración actual del repositorio, las aplicaciones se llaman:
- `verifactu-landing` (landing page)
- `verifactu-app` (dashboard/app)

Pero el error menciona `web-app`, lo que sugiere un desajuste de nombres.

## ✅ Soluciones

### Opción 1: Corregir el Nombre del Servicio en Cloud Run (Recomendado)

El servicio debe usar el nombre correcto de imagen `verifactu-landing` o `verifactu-app`.

```bash
# Para la landing page (servicio verifactu-landing):
gcloud run services update verifactu-landing \
  --image gcr.io/verifactu-business-480212/verifactu-landing:latest \
  --region europe-west1 \
  --project verifactu-business-480212

# Para el app (servicio verifactu-app):
gcloud run services update verifactu-app \
  --image gcr.io/verifactu-business-480212/verifactu-app:latest \
  --region europe-west1 \
  --project verifactu-business-480212
```

### Opción 2: Construir y Subir la Imagen con el Nombre Correcto

Si necesitas mantener el nombre `web-app`, debes construir la imagen con ese nombre:

```bash
# Desde la raíz del repositorio

# Para landing:
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _SERVICE_NAME=web-app,_IMAGE_NAME=web-app \
  --project verifactu-business-480212

# O manualmente:
cd apps/landing  # o apps/app según corresponda
docker build -t gcr.io/verifactu-business-480212/web-app:latest .
docker push gcr.io/verifactu-business-480212/web-app:latest
```

### Opción 3: Usar el Pipeline de CI/CD Existente

El repositorio ya tiene configurado `cloudbuild.yaml`. Para usarlo:

```bash
# Desde la raíz del repositorio
gcloud builds submit \
  --config cloudbuild.yaml \
  --project verifactu-business-480212
```

Esto construirá y subirá:
- `gcr.io/verifactu-business-480212/verifactu-landing:latest`
- `gcr.io/verifactu-business-480212/verifactu-app:latest`

Luego actualiza los servicios:

```bash
# Actualizar landing
gcloud run services update verifactu-landing \
  --image gcr.io/verifactu-business-480212/verifactu-landing:latest \
  --region europe-west1 \
  --project verifactu-business-480212

# Actualizar app
gcloud run services update verifactu-app \
  --image gcr.io/verifactu-business-480212/verifactu-app:latest \
  --region europe-west1 \
  --project verifactu-business-480212
```

## 🔧 Verificar Imágenes Disponibles

Para ver qué imágenes tienes en Container Registry:

```bash
gcloud container images list --project verifactu-business-480212

# Ver tags de una imagen específica:
gcloud container images list-tags gcr.io/verifactu-business-480212/verifactu-landing
gcloud container images list-tags gcr.io/verifactu-business-480212/verifactu-app
```

## 📝 Crear Nuevo Servicio con Nombre Correcto

Si prefieres crear un nuevo servicio en lugar de actualizar el existente:

```bash
# Para landing:
gcloud run deploy verifactu-landing \
  --image gcr.io/verifactu-business-480212/verifactu-landing:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --project verifactu-business-480212

# Para app:
gcloud run deploy verifactu-app \
  --image gcr.io/verifactu-business-480212/verifactu-app:latest \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --project verifactu-business-480212
```

## ⚡ Solución Rápida (Paso a Paso)

### 1. Construir las imágenes
```bash
cd /path/to/verifactu-monorepo
gcloud builds submit --config cloudbuild.yaml --project verifactu-business-480212
```

### 2. Verificar que las imágenes se crearon
```bash
gcloud container images list --project verifactu-business-480212
```

### 3. Actualizar los servicios
```bash
# Actualizar landing page
gcloud run services update verifactu-landing \
  --image gcr.io/verifactu-business-480212/verifactu-landing:latest \
  --region europe-west1 \
  --project verifactu-business-480212

# Actualizar app
gcloud run services update verifactu-app \
  --image gcr.io/verifactu-business-480212/verifactu-app:latest \
  --region europe-west1 \
  --project verifactu-business-480212
```

### 4. Verificar el despliegue
```bash
# Verificar landing
gcloud run services describe verifactu-landing \
  --region europe-west1 \
  --project verifactu-business-480212

# Verificar app
gcloud run services describe verifactu-app \
  --region europe-west1 \
  --project verifactu-business-480212
```

## 🐛 Troubleshooting

### Si el build falla con "permission denied"
```bash
# Asegúrate de tener los permisos correctos
gcloud projects add-iam-policy-binding verifactu-business-480212 \
  --member="user:tu-email@example.com" \
  --role="roles/cloudbuild.builds.builder"
```

### Si Container Registry no está habilitado
```bash
gcloud services enable containerregistry.googleapis.com \
  --project verifactu-business-480212
```

### Si Cloud Build no está habilitado
```bash
gcloud services enable cloudbuild.googleapis.com \
  --project verifactu-business-480212
```

## 📚 Referencias

- Documentación de Cloud Build: https://cloud.google.com/build/docs
- Documentación de Cloud Run: https://cloud.google.com/run/docs
- Container Registry: https://cloud.google.com/container-registry/docs
