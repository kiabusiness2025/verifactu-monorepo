# 🚀 Guía Rápida de Despliegue

Esta es una guía rápida para desplegar Verifactu en Google Cloud Platform. Para más detalles, consulta [DEPLOYMENT.md](./DEPLOYMENT.md).

## ⚡ Despliegue en 3 Pasos

### 1️⃣ Configurar Google Cloud

```bash
export PROJECT_ID="verifactu-business-480212"
export REGION="europe-west1"

gcloud auth login
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 2️⃣ Habilitar APIs y Crear Secretos

```bash
# Habilitar APIs necesarias
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Crear secreto de base de datos (actualiza con tus credenciales)
echo -n "postgres://USER:PASSWORD@HOST:5432/DATABASE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Dar permisos
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3️⃣ Desplegar

```bash
# Opción A: Usar el script automatizado (recomendado)
./scripts/deploy.sh

# Opción B: Usar Cloud Build
gcloud builds submit --config=cloudbuild.yaml
```

## ✅ Verificar Despliegue

```bash
# Ver servicios desplegados
gcloud run services list --region=$REGION

# Ver URLs
gcloud run services list --platform=managed --region=$REGION \
  --format="table(metadata.name,status.url)"
```

## 📝 Notas

- **Landing**: No requiere base de datos
- **App**: Requiere DATABASE_URL
- **API**: Requiere DATABASE_URL

## 🆘 Ayuda

- Ver logs: `gcloud run services logs read [servicio] --region=$REGION`
- Documentación completa: [DEPLOYMENT.md](./DEPLOYMENT.md)
- README principal: [README.md](./README.md)
