# ☁️ Configuración de IAM para Google Cloud Run

## 📋 Resumen

Si vas a desplegar tu aplicación en **Google Cloud Run**, necesitas configurar permisos IAM específicos para que Genkit pueda enviar telemetría a Firebase (métricas, traces, logs).

## 🎯 ¿Cuándo Necesitas Esto?

✅ **SÍ necesitas configurar permisos si:**
- Vas a desplegar en Google Cloud Run
- Estás usando Genkit con Firebase telemetry (`enableFirebaseTelemetry()`)
- Quieres ver métricas, traces y logs en Google Cloud Console

❌ **NO necesitas configurar permisos si:**
- Solo despliegas en Vercel (tu caso actual)
- No usas Genkit (o Genkit está deshabilitado)
- Solo usas Firebase para autenticación/Firestore (no telemetry)

## 🏗️ Tu Arquitectura Actual

```
┌─────────────────────────────────────────────┐
│           HOSTING & FRONTEND                │
├─────────────────────────────────────────────┤
│  Vercel                                     │
│  - app.verifactu.business (Next.js)        │
│  - landing.verifactu.business (Next.js)    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         BACKEND SERVICES                    │
├─────────────────────────────────────────────┤
│  Firebase (Google Cloud)                    │
│  - Authentication (usuarios)                │
│  - Firestore (chat, notificaciones)         │
│  - Remote Config (feature flags)            │
│  - Analytics (eventos)                      │
│  - Genkit AI (disabled por ahora)           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          RELATIONAL DATABASE                │
├─────────────────────────────────────────────┤
│  PostgreSQL (Prisma)                        │
│  - Tenants, Users, Invoices, Payments      │
│  - Subscriptions, Plans                     │
└─────────────────────────────────────────────┘
```

**Conclusión:** Como estás en **Vercel (no Cloud Run)**, **NO necesitas** configurar estos permisos IAM **todavía**.

---

## 🔧 Roles IAM Requeridos (Para Cloud Run)

Si en el futuro decides migrar a Cloud Run, estos son los roles necesarios:

### 1. **Escritor de métricas de Monitoring**
- **Role ID:** `roles/monitoring.metricWriter`
- **Propósito:** Permite escribir métricas personalizadas a Cloud Monitoring
- **Usado por:** Genkit para enviar métricas de rendimiento (latencia, errores, uso)

### 2. **Agente de Cloud Trace**
- **Role ID:** `roles/cloudtrace.agent`
- **Propósito:** Permite enviar datos de tracing (seguimiento de solicitudes)
- **Usado por:** Genkit para rastrear llamadas a AI (flows: analyzeInvoice, isaakChat, etc.)

### 3. **Escritor de registros**
- **Role ID:** `roles/logging.logWriter`
- **Propósito:** Permite escribir logs estructurados a Cloud Logging
- **Usado por:** Genkit para logs de errores, advertencias y debug

---

## 🛠️ Cómo Configurar los Permisos

### Opción 1: Consola de Google Cloud (Interfaz Gráfica)

#### Paso 1: Acceder a IAM

```
URL: https://console.cloud.google.com/iam-admin/iam?project=verifactu-business
```

#### Paso 2: Identificar la Cuenta de Servicio

Cloud Run usa una cuenta de servicio por defecto:

```
{PROJECT_ID}-compute@developer.gserviceaccount.com
```

En tu caso:
```
verifactu-business-compute@developer.gserviceaccount.com
```

Si usas una cuenta de servicio personalizada, usa esa en su lugar.

#### Paso 3: Agregar Roles

1. En la tabla IAM, busca la cuenta de servicio
2. Haz clic en el **icono de lápiz (editar)** junto a la cuenta
3. Haz clic en **"Add Another Role"** / **"Agregar otro rol"**
4. Busca y selecciona cada uno de estos roles:
   - `Monitoring Metric Writer` / `Escritor de métricas de Monitoring`
   - `Cloud Trace Agent` / `Agente de Cloud Trace`
   - `Logs Writer` / `Escritor de registros`
5. Haz clic en **"Save"** / **"Guardar"**

#### Resultado Visual

Deberías ver algo así en la tabla IAM:

```
Member: verifactu-business-compute@developer.gserviceaccount.com
Roles:
  - Editor (inherited)
  - Monitoring Metric Writer
  - Cloud Trace Agent
  - Logs Writer
```

---

### Opción 2: gcloud CLI (Terminal)

#### Paso 1: Autenticarse

```powershell
gcloud auth login
gcloud config set project verifactu-business
```

#### Paso 2: Obtener la Cuenta de Servicio

```powershell
# Ver proyecto actual
gcloud config get-value project

# Listar cuentas de servicio
gcloud iam service-accounts list
```

#### Paso 3: Asignar Roles

Reemplaza `SERVICE_ACCOUNT_EMAIL` con tu cuenta de servicio:

```powershell
# Rol 1: Monitoring Metric Writer
gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" `
  --role="roles/monitoring.metricWriter"

# Rol 2: Cloud Trace Agent
gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" `
  --role="roles/cloudtrace.agent"

# Rol 3: Logs Writer
gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" `
  --role="roles/logging.logWriter"
```

**Ejemplo completo:**

```powershell
$SERVICE_ACCOUNT = "verifactu-business-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/cloudtrace.agent"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/logging.logWriter"
```

#### Paso 4: Verificar Roles

```powershell
gcloud projects get-iam-policy verifactu-business `
  --flatten="bindings[].members" `
  --filter="bindings.members:$SERVICE_ACCOUNT"
```

---

### Opción 3: Terraform (Infraestructura como Código)

Si usas Terraform para gestionar infraestructura:

```hcl
# variables.tf
variable "project_id" {
  default = "verifactu-business"
}

variable "service_account_email" {
  default = "verifactu-business-compute@developer.gserviceaccount.com"
}

# iam.tf
resource "google_project_iam_member" "monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${var.service_account_email}"
}

resource "google_project_iam_member" "trace_agent" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${var.service_account_email}"
}

resource "google_project_iam_member" "logs_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${var.service_account_email}"
}
```

Aplicar:

```bash
terraform init
terraform plan
terraform apply
```

---

## 🧪 Cómo Verificar que Funciona

### 1. Desplegar en Cloud Run

```powershell
# Construir imagen
docker build -t gcr.io/verifactu-business/app .

# Subir imagen
docker push gcr.io/verifactu-business/app

# Desplegar
gcloud run deploy verifactu-app `
  --image gcr.io/verifactu-business/app `
  --platform managed `
  --region europe-west1 `
  --allow-unauthenticated
```

### 2. Verificar Métricas

```
URL: https://console.cloud.google.com/monitoring/metrics-explorer?project=verifactu-business
```

Busca métricas con prefijo:
- `custom.googleapis.com/genkit/*`
- `genkit.dev/*`

### 3. Verificar Traces

```
URL: https://console.cloud.google.com/traces/list?project=verifactu-business
```

Deberías ver traces de:
- `analyzeInvoice` flow
- `isaakChat` flow
- `verifactuCompliance` flow

### 4. Verificar Logs

```
URL: https://console.cloud.google.com/logs/query?project=verifactu-business
```

Filtrar por:
```
resource.type="cloud_run_revision"
jsonPayload.component="genkit"
```

---

## 🔒 Mejores Prácticas de Seguridad

### 1. Principio de Mínimo Privilegio

✅ **Recomendado:** Usar roles específicos (los 3 mencionados)  
❌ **No recomendado:** Usar `roles/editor` o `roles/owner`

### 2. Cuenta de Servicio Dedicada

En lugar de usar la cuenta de servicio por defecto, crea una específica:

```powershell
# Crear cuenta de servicio
gcloud iam service-accounts create verifactu-genkit `
  --display-name="Verifactu Genkit Service Account"

# Asignar roles
$SA = "verifactu-genkit@verifactu-business.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SA" `
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SA" `
  --role="roles/cloudtrace.agent"

gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:$SA" `
  --role="roles/logging.logWriter"

# Usar en Cloud Run
gcloud run deploy verifactu-app `
  --service-account=$SA `
  --image=gcr.io/verifactu-business/app
```

### 3. Auditoría Regular

Revisa los permisos cada trimestre:

```powershell
# Ver todas las cuentas de servicio y sus roles
gcloud projects get-iam-policy verifactu-business --format=json > iam-policy.json
```

---

## 🐛 Troubleshooting

### Error: "Permission Denied: Write Metrics"

**Causa:** Falta el rol `monitoring.metricWriter`  
**Solución:**
```powershell
gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:YOUR_SA@verifactu-business.iam.gserviceaccount.com" `
  --role="roles/monitoring.metricWriter"
```

### Error: "Cloud Trace API Not Enabled"

**Causa:** API de Cloud Trace no habilitada  
**Solución:**
```powershell
gcloud services enable cloudtrace.googleapis.com --project=verifactu-business
```

### Error: "Logs Not Appearing"

**Causa:** Falta el rol `logging.logWriter` o API no habilitada  
**Solución:**
```powershell
# Habilitar API
gcloud services enable logging.googleapis.com --project=verifactu-business

# Asignar rol
gcloud projects add-iam-policy-binding verifactu-business `
  --member="serviceAccount:YOUR_SA" `
  --role="roles/logging.logWriter"
```

---

## 📊 Monitoreo de Costos

Estos servicios tienen costos asociados:

### Cloud Monitoring (Métricas)
- **Gratis:** Primeros 150 MB/mes de métricas
- **Costo:** $0.2580 USD por MB después del límite gratuito

### Cloud Trace
- **Gratis:** Primeros 2.5 millones de spans/mes
- **Costo:** $0.20 USD por millón de spans después

### Cloud Logging
- **Gratis:** Primeros 50 GB/mes de logs
- **Costo:** $0.50 USD por GB después

**Estimación para app pequeña:** <$5 USD/mes

Ver costos actuales:
```
URL: https://console.cloud.google.com/billing/reports?project=verifactu-business
```

---

## 🚀 Migración de Vercel a Cloud Run

Si decides migrar de Vercel a Cloud Run en el futuro:

### Ventajas de Cloud Run
- ✅ Integración nativa con Firebase/Genkit
- ✅ Telemetría automática sin configuración adicional
- ✅ Escalado automático a 0 instancias (pay-per-use)
- ✅ Soporte para containers Docker
- ✅ Control total sobre el runtime

### Desventajas vs Vercel
- ❌ Más complejo de configurar
- ❌ Requiere gestión de permisos IAM
- ❌ Sin CDN global integrado (necesitas Cloud CDN)
- ❌ Sin preview deployments automáticos

### Cuándo Migrar
Considera Cloud Run si:
- Necesitas telemetría detallada de Genkit
- Usas intensivamente AI (muchas llamadas a Genkit)
- Quieres unificar toda la infraestructura en Google Cloud
- Necesitas control total sobre el entorno de ejecución

---

## ✅ Checklist de Configuración (Para Cloud Run)

### Pre-requisitos
- [ ] Proyecto de Google Cloud creado
- [ ] Facturación habilitada
- [ ] gcloud CLI instalado y autenticado

### Habilitar APIs
- [ ] Cloud Run API: `gcloud services enable run.googleapis.com`
- [ ] Cloud Monitoring API: `gcloud services enable monitoring.googleapis.com`
- [ ] Cloud Trace API: `gcloud services enable cloudtrace.googleapis.com`
- [ ] Cloud Logging API: `gcloud services enable logging.googleapis.com`

### Configurar IAM
- [ ] Identificar cuenta de servicio
- [ ] Asignar rol `monitoring.metricWriter`
- [ ] Asignar rol `cloudtrace.agent`
- [ ] Asignar rol `logging.logWriter`
- [ ] Verificar roles con `gcloud projects get-iam-policy`

### Desplegar
- [ ] Construir imagen Docker
- [ ] Subir a Google Container Registry
- [ ] Desplegar en Cloud Run
- [ ] Configurar variables de entorno (DATABASE_URL, GOOGLE_AI_API_KEY, etc.)

### Verificar
- [ ] Servicio accesible vía URL pública
- [ ] Métricas visibles en Cloud Monitoring
- [ ] Traces visibles en Cloud Trace
- [ ] Logs visibles en Cloud Logging

---

## 🔗 Enlaces Útiles

- **Google Cloud IAM Console:** https://console.cloud.google.com/iam-admin/iam?project=verifactu-business
- **Cloud Run Console:** https://console.cloud.google.com/run?project=verifactu-business
- **Cloud Monitoring:** https://console.cloud.google.com/monitoring?project=verifactu-business
- **Cloud Trace:** https://console.cloud.google.com/traces?project=verifactu-business
- **Cloud Logging:** https://console.cloud.google.com/logs?project=verifactu-business
- **Firebase Genkit Docs:** https://firebase.google.com/docs/genkit
- **Cloud Run IAM Guide:** https://cloud.google.com/run/docs/securing/service-identity

---

## 📝 Conclusión

**Para tu setup actual (Vercel + Firebase):**
- ✅ **No necesitas configurar estos permisos ahora**
- ✅ Vercel maneja el hosting y deployment
- ✅ Firebase funciona sin permisos IAM adicionales
- ✅ Genkit está deshabilitado (`genkit.ts.disabled`)

**Cuándo sí necesitarás configurar permisos:**
1. Cuando habilites Genkit (renombrar `genkit.ts.disabled` a `genkit.ts`)
2. Cuando despliegues en Google Cloud Run
3. Cuando necesites telemetría de AI en Google Cloud Monitoring

**Próximos pasos recomendados:**
1. ✅ Completar configuración de Facebook OAuth (ver `FACEBOOK_OAUTH_SETUP.md`)
2. ✅ Desplegar Firestore rules (`firebase deploy --only firestore:rules`)
3. ✅ Configurar Google AI API Key para Genkit
4. ⏳ Evaluar si necesitas Cloud Run (por ahora Vercel es suficiente)

---

**🎯 Mantén este documento como referencia para cuando decidas usar Cloud Run o habilitar Genkit con telemetría completa.**
