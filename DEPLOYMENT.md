# Guía de Despliegue - Verifactu Monorepo

## 📋 Descripción

Este documento describe cómo desplegar el monorepo de Verifactu Business en Google Cloud Platform usando Cloud Run.

## 🏗️ Arquitectura

El proyecto está compuesto por tres servicios independientes:

- **verifactu-landing** - Página de aterrizaje (Next.js)
- **verifactu-app** - Aplicación principal (Next.js)
- **verifactu-api** - API backend (Node.js + Express)

Cada servicio se despliega como un contenedor independiente en Cloud Run.

## 📦 Requisitos Previos

### 1. Herramientas Necesarias

- Google Cloud SDK (gcloud CLI) instalado y configurado
- Node.js 18 o superior
- Git
- Docker (opcional, para pruebas locales)

### 2. Configuración de Google Cloud

```bash
# Configurar proyecto
export PROJECT_ID="verifactu-business-480212"
export REGION="europe-west1"

# Autenticarse
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 3. Habilitar APIs Necesarias

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 🔐 Configuración de Secretos

### Crear Secretos en Secret Manager

```bash
# DATABASE_URL (necesario para app y api)
echo -n "postgres://USER:PASSWORD@HOST:5432/DATABASE" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Dar acceso al servicio
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Otros Secretos Opcionales

```bash
# JWT_SECRET
echo -n "your-jwt-secret" | \
  gcloud secrets create JWT_SECRET --data-file=-

# NEXTAUTH_SECRET (para NextAuth.js)
echo -n "your-nextauth-secret" | \
  gcloud secrets create NEXTAUTH_SECRET --data-file=-
```

## 🚀 Métodos de Despliegue

### Opción 1: Script de Despliegue Automatizado (Recomendado)

Este método es el más sencillo y permite desplegar uno o todos los servicios:

```bash
# Ejecutar el script de despliegue
./scripts/deploy.sh
```

El script te preguntará qué servicios deseas desplegar:
1. Todos los servicios
2. Solo landing
3. Solo app
4. Solo api
5. Landing + App
6. Cancelar

### Opción 2: Cloud Build (CI/CD)

Usa Cloud Build para despliegues automatizados desde GitHub:

```bash
# Desplegar usando el archivo cloudbuild.yaml
gcloud builds submit --config=cloudbuild.yaml
```

Para configurar triggers automáticos:

```bash
# Crear trigger para despliegues en push a main
gcloud builds triggers create github \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml
```

### Opción 3: Despliegue Manual por Servicio

#### Desplegar Landing

```bash
cd apps/landing
gcloud run deploy verifactu-landing \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --platform=managed \
  --port=8080
```

#### Desplegar App

```bash
cd apps/app
gcloud run deploy verifactu-app \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --platform=managed \
  --port=8080 \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest
```

#### Desplegar API

```bash
cd apps/api
gcloud run deploy verifactu-api \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --platform=managed \
  --port=8080 \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest
```

## 🔧 Dockerfiles

Cada servicio tiene su propio Dockerfile optimizado:

- `apps/landing/Dockerfile` - Dockerfile multi-stage para la landing
- `apps/app/Dockerfile` - Dockerfile multi-stage para la app principal
- `apps/api/Dockerfile` - Dockerfile para el backend API

## 📊 Monitorización y Logs

### Ver Servicios Desplegados

```bash
gcloud run services list --region=$REGION
```

### Ver Logs de un Servicio

```bash
# Logs en tiempo real
gcloud run services logs read verifactu-landing --region=$REGION --limit=50

# Logs en streaming
gcloud run services logs tail verifactu-landing --region=$REGION
```

### Ver Métricas en Cloud Console

Visita: https://console.cloud.google.com/run?project=verifactu-business-480212

## 🌐 URLs de los Servicios

Después del despliegue, cada servicio tendrá una URL única:

```
https://verifactu-landing-XXXXXXXXXX-ew.a.run.app
https://verifactu-app-XXXXXXXXXX-ew.a.run.app
https://verifactu-api-XXXXXXXXXX-ew.a.run.app
```

Para ver las URLs exactas:

```bash
gcloud run services list --platform=managed --region=$REGION \
  --format="table(metadata.name,status.url)"
```

## 🔄 Actualización de Servicios

Para actualizar un servicio después de hacer cambios:

```bash
# Opción 1: Usar el script
./scripts/deploy.sh

# Opción 2: Redesplegar manualmente
cd apps/[servicio]
gcloud run deploy [nombre-servicio] --source .
```

## 🛠️ Troubleshooting

### Error: Falta Dockerfile

Si ves un error de Dockerfile faltante, asegúrate de que cada app tenga su Dockerfile:
- `apps/landing/Dockerfile`
- `apps/app/Dockerfile`
- `apps/api/Dockerfile`

### Error: Secreto no encontrado

Si un servicio falla por secretos faltantes:

```bash
# Verificar que el secreto existe
gcloud secrets list

# Crear el secreto si no existe
echo -n "valor" | gcloud secrets create NOMBRE_SECRETO --data-file=-
```

### Error: Permisos insuficientes

```bash
# Dar permisos a la cuenta de servicio
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Servicio no responde

```bash
# Ver logs detallados
gcloud run services logs read [servicio] --region=$REGION --limit=100

# Ver detalles del servicio
gcloud run services describe [servicio] --region=$REGION
```

## 📝 Variables de Entorno

### Landing
- `NODE_ENV=production` (automático)
- `PORT=8080` (automático)

### App
- `NODE_ENV=production` (automático)
- `PORT=8080` (automático)
- `DATABASE_URL` (desde Secret Manager)

### API
- `NODE_ENV=production` (automático)
- `PORT=8080` (automático)
- `DATABASE_URL` (desde Secret Manager)

## 🔐 Seguridad

- Todos los Dockerfiles usan usuarios no-root
- Los secretos se almacenan en Secret Manager (nunca en código)
- Las conexiones a la base de datos están encriptadas
- Cloud Run proporciona HTTPS automáticamente

## 📚 Recursos Adicionales

- [Documentación de Cloud Run](https://cloud.google.com/run/docs)
- [Documentación de Cloud Build](https://cloud.google.com/build/docs)
- [Documentación de Secret Manager](https://cloud.google.com/secret-manager/docs)
- [README principal del proyecto](../README.md)

## 💡 Mejores Prácticas

1. **Usar Cloud Build para CI/CD** - Automatiza despliegues en cada push
2. **Monitorizar logs regularmente** - Detecta problemas temprano
3. **Mantener secretos actualizados** - Rota credenciales periódicamente
4. **Configurar alertas** - En Cloud Monitoring para servicios críticos
5. **Usar dominios personalizados** - Configura dominios para URLs amigables

## 🎯 Siguientes Pasos

1. ✅ Desplegar servicios inicialmente
2. ⚙️ Configurar dominios personalizados
3. 📊 Configurar monitorización y alertas
4. 🔄 Configurar CI/CD automático con triggers
5. 🌐 Configurar CDN si es necesario
6. 🔐 Implementar autenticación y autorización
7. 📈 Optimizar configuración de recursos (CPU/memoria)
