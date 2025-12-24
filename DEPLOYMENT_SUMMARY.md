# 📋 Resumen de la Configuración de Despliegue

Este documento resume todos los cambios realizados para facilitar el despliegue de Verifactu en Google Cloud Platform.

## ✅ Cambios Realizados

### 1. Dockerfile para Landing (`apps/landing/Dockerfile`)
- ✅ Creado nuevo Dockerfile multi-stage optimizado
- ✅ Usa Next.js standalone output para reducir tamaño
- ✅ Implementa usuario no-root para seguridad
- ✅ Configurado para puerto 8080 (estándar Cloud Run)

### 2. Cloud Build Configuration (`cloudbuild.yaml`)
- ✅ Agregado build para API (faltaba)
- ✅ Configurado push de las 3 imágenes a GCR
- ✅ Configurado deploy de los 3 servicios a Cloud Run
- ✅ Agregada configuración de secretos para app y api
- ✅ Optimizado con máquina E2_HIGHCPU_8

### 3. Scripts de Despliegue

#### `scripts/deploy.sh`
Script interactivo para desplegar servicios:
- Permite desplegar todos los servicios o solo algunos
- Configura secretos automáticamente
- Muestra URLs al finalizar
- Incluye validaciones de configuración

#### `scripts/setup-cicd.sh`
Configura CI/CD automático con Cloud Build:
- Crea triggers para despliegue automático
- Se ejecuta en cada push a main
- Conecta con repositorio de GitHub

#### `scripts/check-status.sh`
Verifica el estado de los despliegues:
- Muestra estado de todos los servicios
- Verifica que los servicios respondan
- Muestra logs recientes
- Lista revisiones activas

### 4. Documentación

#### `DEPLOYMENT.md`
Guía completa de despliegue que incluye:
- Arquitectura del sistema
- Requisitos previos
- Configuración de Google Cloud
- Gestión de secretos
- 3 métodos de despliegue
- Troubleshooting
- Mejores prácticas

#### `QUICKSTART.md`
Guía rápida de 3 pasos:
- Configuración inicial
- Creación de secretos
- Despliegue rápido

#### `README.md` actualizado
- Agregada referencia a la guía de despliegue
- Link directo a DEPLOYMENT.md

## 🏗️ Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────┐
│           Google Cloud Platform                  │
│                                                  │
│  ┌────────────────┐  ┌────────────────┐        │
│  │  Cloud Build    │  │ Secret Manager │        │
│  │  (CI/CD)        │  │  - DATABASE_URL│        │
│  └────────┬────────┘  └────────┬────────┘        │
│           │                    │                 │
│           ▼                    ▼                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Container Registry (GCR)          │   │
│  │  - verifactu-landing:latest               │   │
│  │  - verifactu-app:latest                   │   │
│  │  - verifactu-api:latest                   │   │
│  └──────────────┬───────────────────────────┘   │
│                 │                                │
│                 ▼                                │
│  ┌──────────────────────────────────────────┐   │
│  │           Cloud Run Services              │   │
│  │                                            │   │
│  │  📄 verifactu-landing (Next.js)           │   │
│  │     └─ No DB required                     │   │
│  │                                            │   │
│  │  🖥️  verifactu-app (Next.js)              │   │
│  │     └─ Uses DATABASE_URL secret           │   │
│  │                                            │   │
│  │  🔌 verifactu-api (Node/Express)          │   │
│  │     └─ Uses DATABASE_URL secret           │   │
│  └──────────────┬───────────────────────────┘   │
│                 │                                │
│                 ▼                                │
│  ┌──────────────────────────────────────────┐   │
│  │      Cloud SQL (PostgreSQL 15)            │   │
│  │      verifactu-db                         │   │
│  │      IP: 146.148.21.12                    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 🚀 Flujos de Despliegue

### Método 1: Script Automatizado (Desarrollo)
```bash
./scripts/deploy.sh
# → Menú interactivo
# → Despliega servicios seleccionados
# → Muestra URLs
```

### Método 2: Cloud Build Manual
```bash
gcloud builds submit --config=cloudbuild.yaml
# → Construye las 3 imágenes
# → Despliega los 3 servicios
# → Configura secretos
```

### Método 3: CI/CD Automático
```bash
# 1. Configurar una vez
./scripts/setup-cicd.sh

# 2. Después, automático en cada push a main
git push origin main
# → Trigger automático
# → Build y deploy completo
```

## 📦 Servicios Desplegados

| Servicio | Aplicación | Puerto | Secretos | URL |
|----------|-----------|--------|----------|-----|
| `verifactu-landing` | Next.js Landing | 8080 | Ninguno | `https://verifactu-landing-*.run.app` |
| `verifactu-app` | Next.js App | 8080 | DATABASE_URL | `https://verifactu-app-*.run.app` |
| `verifactu-api` | Node/Express | 8080 | DATABASE_URL | `https://verifactu-api-*.run.app` |

## 🔐 Secretos Configurados

Los siguientes secretos deben estar en Secret Manager:

1. **DATABASE_URL** (Obligatorio para app y api)
   ```
   postgres://USER:PASSWORD@146.148.21.12:5432/verifactu_business
   ```

2. **JWT_SECRET** (Opcional, para autenticación)
3. **NEXTAUTH_SECRET** (Opcional, para NextAuth.js)

## ✨ Mejoras Implementadas

### Seguridad
- ✅ Usuarios no-root en todos los Dockerfiles
- ✅ Secretos en Secret Manager (no en código)
- ✅ HTTPS automático en Cloud Run
- ✅ Conexiones encriptadas a la base de datos

### Optimización
- ✅ Multi-stage builds para imágenes pequeñas
- ✅ Standalone output en Next.js
- ✅ Máquina E2_HIGHCPU_8 para builds rápidos
- ✅ Caché de capas de Docker

### DevOps
- ✅ CI/CD automatizado con Cloud Build
- ✅ Scripts de deployment interactivos
- ✅ Monitorización de estado
- ✅ Logs centralizados

## 📊 Verificación Post-Despliegue

Después de desplegar, ejecuta:

```bash
# Ver estado de todos los servicios
./scripts/check-status.sh

# Ver logs de un servicio específico
gcloud run services logs tail verifactu-landing --region=europe-west1

# Ver URLs de todos los servicios
gcloud run services list --region=europe-west1 \
  --format="table(metadata.name,status.url)"
```

## 🆘 Resolución de Problemas

### Problema: Build falla por falta de memoria
**Solución**: El cloudbuild.yaml ya usa E2_HIGHCPU_8

### Problema: Servicio no puede conectarse a la BD
**Solución**: Verificar que DATABASE_URL esté en Secret Manager:
```bash
gcloud secrets describe DATABASE_URL
```

### Problema: Dockerfile no encontrado
**Solución**: Todos los Dockerfiles ahora están presentes:
- `apps/landing/Dockerfile` ✅
- `apps/app/Dockerfile` ✅
- `apps/api/Dockerfile` ✅

## 📚 Referencias

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía completa de despliegue
- [QUICKSTART.md](./QUICKSTART.md) - Guía rápida de 3 pasos
- [README.md](./README.md) - Documentación principal del proyecto
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud Build Docs](https://cloud.google.com/build/docs)

## 🎯 Próximos Pasos Recomendados

1. ✅ Desplegar servicios inicialmente
2. ⚙️ Configurar dominios personalizados
3. 📊 Configurar alertas en Cloud Monitoring
4. 🔄 Implementar health checks personalizados
5. 🌐 Configurar CDN si es necesario
6. 🔒 Revisar políticas de IAM
7. 📈 Optimizar recursos (CPU/memoria) según uso real

---

**Última actualización**: Diciembre 2024
**Proyecto**: verifactu-business-480212
**Región**: europe-west1
