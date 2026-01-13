# Guía: Conectar GitHub a Google Cloud Build

## 📝 Resumen

Este documento explica cómo conectar el repositorio GitHub `verifactu-monorepo` a Google Cloud Build para que **los deploys a Cloud Run sean automáticos** cada vez que hagas push.

---

## PASO 1: Verificar requisitos previos

```bash
# Verificar que Google Cloud SDK está instalado
gcloud --version

# Verificar que tienes acceso a verifactu-business
gcloud projects list | grep verifactu-business

# Verificar estado actual de conexiones (debe estar vacío)
gcloud builds connections list --region=europe-west1
```

**Resultado esperado**: `Listed 0 items.`

---

## PASO 2: Conectar repositorio GitHub (Cloud Console)

### Opción A: Desde Cloud Console (Recomendado - GUI)

1. Ir a https://console.cloud.google.com
2. Seleccionar proyecto: **`verifactu-business`**
3. Buscar **"Cloud Build"** en la barra de búsqueda
4. En el menú izquierdo: **Manage repositories** → **Connect a repository**
5. Seleccionar:
   - **Source control system**: GitHub
   - **Conectar con tu cuenta** (se abrirá OAuth)
   - **Autorizar Google Cloud Build** en GitHub
   - **Seleccionar repositorio**: `kiabusiness2025/verifactu-monorepo`
   - **Crear conexión**

### Opción B: Desde gcloud CLI

```bash
# Este comando abre una interfaz interactiva
gcloud builds connect --region=europe-west1

# Selecciona:
# - GitHub (escoger GitHub)
# - Sigue las instrucciones para autorizar
# - Cuando pida repositorio: verifactu-monorepo
# - Confirma la conexión
```

---

## PASO 3: Crear Cloud Build Trigger

### Opción A: Desde Cloud Console (Recomendado)

1. En **Cloud Build** → **Triggers** → **Create Trigger**
2. Rellenar:
   - **Nombre**: `verifactu-backend-deploy`
   - **Descripción**: `Deploy automático de backend a Cloud Run`
   - **Evento**: `Push a una rama` (seleccionar)
   - **Repositorio**: `verifactu-monorepo`
   - **Rama**: `^main$` (ó cualquier patrón regex)
   - **Archivo de configuración**: `cloudbuild-backend.yaml` (tiene que existir en repo)
3. Click en **Crear**

### Opción B: Desde gcloud CLI

```bash
gcloud builds triggers create github \
  --name=verifactu-backend-deploy \
  --description="Deploy automático backend a Cloud Run" \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-backend.yaml \
  --region=europe-west1
```

---

## PASO 4: Configurar permisos de Service Account

Cloud Build necesita permiso para:
- Acceder a Secrets en Secret Manager
- Desplegar en Cloud Run
- Usar service accounts

```bash
# Obtener número de proyecto
PROJECT_NUMBER=$(gcloud projects describe verifactu-business --format='value(projectNumber)')
echo "Project Number: $PROJECT_NUMBER"

# 1. Permiso para Secret Manager
gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 2. Permiso para Cloud Run
gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# 3. Permiso para usar service accounts (necesario para passar secrets)
gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

echo "✅ Permisos configurados"
```

---

## PASO 5: Verificar que todo está listo

```bash
# 1. Verificar conexión GitHub existe
gcloud builds connections list --region=europe-west1

# Resultado esperado:
# NAME                    CREATE_TIME          TYPE
# github-kiabusiness2025  2026-01-03T...      GITHUB

# 2. Verificar trigger existe
gcloud builds triggers list --region=europe-west1

# Resultado esperado:
# NAME                            DESCRIPTION                  STATUS
# verifactu-backend-deploy        Deploy automático backend... ENABLED

# 3. Verificar que cloudbuild-backend.yaml existe en repo
git ls-files | grep cloudbuild
# Debe mostrar: cloudbuild-backend.yaml
```

---

## PASO 6: Probar el deploy automático

### Test 1: Hacer un cambio pequeño en `main`

```bash
# En tu repo local:
git checkout main
git pull origin main

# Hacer un cambio trivial (ej. actualizar README)
echo "# Test deploy" >> DEPLOY_NOTES.md
git add DEPLOY_NOTES.md
git commit -m "test: trigger cloud build"
git push origin main
```

### Test 2: Monitorear el build

```bash
# Abrir Cloud Console → Cloud Build → Dashboard
# O desde CLI:
gcloud builds list --region=europe-west1 --limit 5

# Ver detalles del build (usa BUILD_ID del anterior)
gcloud builds log <BUILD_ID> --region=europe-west1 --stream
```

### Test 3: Verificar que Cloud Run se actualizó

```bash
# Ver las últimas revisiones de verifactu-app
gcloud run revisions list --service=verifactu-app --region=europe-west1 --limit 3

# Ver en tiempo real:
gcloud run logs read verifactu-app --region=europe-west1 --follow
```

**Resultado esperado**: El servicio en Cloud Run se actualiza automáticamente tras el push.

---

## 📊 Flujo de deploy automático (después de configuración)

```
┌─────────────────────┐
│ Haces git push      │
│ a rama 'main'       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ GitHub webhook      │
│ notifica a GCP      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Cloud Build         │
│ Trigger se activa   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 1. Build Docker     │
│ 2. Push a AR        │
│ 3. Deploy a CR      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Cloud Run           │
│ Servicio actualizado│
│ en ~2-3 minutos     │
└─────────────────────┘
```

---

## 🔄 Configurar múltiples ramas (DEV, STAGING, PROD)

Si quieres que diferentes ramas desplieguen a diferentes servicios:

### Trigger para `develop` → `verifactu-app-dev`

```bash
gcloud builds triggers create github \
  --name=verifactu-backend-deploy-dev \
  --repo-name=verifactu-monorepo \
  --repo-owner=kiabusiness2025 \
  --branch-pattern="^develop$" \
  --build-config=cloudbuild-backend.yaml \
  --region=europe-west1
```

**Nota**: El `cloudbuild-backend.yaml` ya está preparado para esto - verifica la rama (`BRANCH_NAME`) y despliega a `verifactu-app-dev` si no es `main`.

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| **"Connection not found"** | Ejecutar `gcloud builds connect --region=europe-west1` |
| **"Trigger created but build doesn't run"** | Verificar `cloudbuild-backend.yaml` existe en repo (Hacer `git add . && git push`) |
| **"Build fails: Permission denied"** | Ejecutar los comandos de IAM (Paso 4) de nuevo |
| **"Build succeeds pero CR no actualiza"** | Ver logs: `gcloud run logs read verifactu-app --region europe-west1` |
| **"Secret not found en build"** | Asegurar que los secrets existen: `gcloud secrets list` |

---

## ✅ Checklist Final

- [ ] `gcloud builds connections list` muestra `github-kiabusiness2025`
- [ ] `gcloud builds triggers list` muestra `verifactu-backend-deploy`
- [ ] Archivo `cloudbuild-backend.yaml` está en el repo raíz
- [ ] Service account de Cloud Build tiene roles IAM correctos
- [ ] Secrets `isaak-api-key`, `isaak-assistant-id`, `stripe-secret-key` existen en Secret Manager
- [ ] Último push a GitHub ha triggerizado un build automático
- [ ] Build completó sin errores (estado SUCCES)
- [ ] Cloud Run service (`verifactu-app` o `verifactu-app-dev`) se actualizó

---

## 📞 Referencias

- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Connecting GitHub to Cloud Build](https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github)
- [Cloud Build Triggers](https://cloud.google.com/build/docs/automating-builds/manage-triggers)
- [Service Account Roles](https://cloud.google.com/iam/docs/understanding-service-accounts)

