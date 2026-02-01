# 🗄️ Cloud SQL Setup - Verifactu

## Método 1: Google Cloud Console (Recomendado - Más Simple)

### Paso 1: Crear Instancia

1. **Ir a Cloud SQL:**
   - URL: https://console.cloud.google.com/sql/instances?project=verifactu-business-480212
   - O buscar "SQL" en el buscador de GCP

2. **Crear Instancia:**
   - Click: **CREATE INSTANCE**
   - Seleccionar: **PostgreSQL**

3. **Configuración Básica:**

   ```
   Instance ID: verifactu-db
   Password: [GENERAR AUTOMÁTICO - Google lo crea]
   Database version: PostgreSQL 15
   Region: europe-west1 (Bélgica)
   Zonal availability: Single zone
   ```

4. **Machine Configuration:**

   ```
   Preset: Development
   Machine type: Shared core → 1 vCPU, 0.614 GB
   (Costo: ~$7.50/mes)

   O si prefieres mejor rendimiento:
   Machine type: Lightweight → db-g1-small
   (Costo: ~$25/mes)
   ```

5. **Storage:**

   ```
   Storage type: SSD
   Storage capacity: 10 GB
   ✓ Enable automatic storage increases
   ```

6. **Connections:**

   ```
   ✓ Public IP
   □ Private IP (dejar sin marcar por ahora)

   Authorized networks:
   - Name: "Anywhere" (temporal para testing)
   - Network: 0.0.0.0/0

   (Nota: En producción, limitar a IPs específicas)
   ```

7. **Customize - Data Protection:**

   ```
   ✓ Automate daily backups
   Backup window: 03:00 - 04:00 (3 AM)

   ✓ Enable point-in-time recovery
   Transaction log retention: 7 days

   Number of retained backups: 7
   ```

8. **Customize - Maintenance:**

   ```
   Maintenance window: Sunday, 02:00 - 03:00
   Order: Any
   ```

9. **Flags (Opcional - Configuración Avanzada):**

   ```
   max_connections: 100
   shared_buffers: 256MB
   ```

10. **Click: CREATE INSTANCE**
    - Tiempo de creación: 5-10 minutos

---

### Paso 2: Obtener Connection Details

1. **Ir a la instancia:**
   - https://console.cloud.google.com/sql/instances/verifactu-db/overview?project=verifactu-business-480212

2. **Copiar información:**

   ```
   Public IP address: [COPIAR - será algo como 34.76.xxx.xxx]
   Connection name: verifactu-business-480212:europe-west1:verifactu-db
   ```

3. **Obtener contraseña (si olvidaste):**
   - Ir a: Users tab
   - Click en "postgres" user
   - Change password
   - Copiar nueva contraseña

---

### Paso 3: Crear Base de Datos

1. **En Cloud Console:**
   - Ir a: Databases tab
   - Click: **CREATE DATABASE**

   ```
   Database name: verifactu_production
   Character set: UTF8
   Collation: en_US.UTF8
   ```

   - Click: CREATE

2. **Crear usuario de aplicación:**
   - Ir a: Users tab
   - Click: **ADD USER ACCOUNT**

   ```
   Username: verifactu_user
   Password: [GENERAR FUERTE - guardar en LastPass/1Password]
   ```

   - Click: ADD

---

### Paso 4: Connection String

**Formato:**

```bash
DATABASE_URL="postgresql://USERNAME:PASSWORD@PUBLIC_IP:5432/DATABASE?sslmode=require"
```

**Ejemplo (reemplazar con tus valores):**

```bash
# Conexión directa (para migraciones)
DATABASE_URL="postgresql://verifactu_user:tu_password_aqui@34.76.123.456:5432/verifactu_production?sslmode=require"

# Prisma Accelerate (para runtime - mantener el actual)
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Método 2: gcloud CLI (Alternativo)

**Si prefieres línea de comandos:**

```bash
# 1. Crear instancia
gcloud sql instances create verifactu-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --storage-type=SSD \
  --storage-size=10 \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --require-ssl \
  --root-password="[TU_PASSWORD_FUERTE]" \
  --project=verifactu-business-480212

# 2. Crear base de datos
gcloud sql databases create verifactu_production \
  --instance=verifactu-db \
  --project=verifactu-business-480212

# 3. Crear usuario
gcloud sql users create verifactu_user \
  --instance=verifactu-db \
  --password="[PASSWORD_USUARIO]" \
  --project=verifactu-business-480212

# 4. Obtener IP pública
gcloud sql instances describe verifactu-db \
  --format="value(ipAddresses[0].ipAddress)" \
  --project=verifactu-business-480212

# 5. Autorizar tu IP (para testing local)
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content
gcloud sql instances patch verifactu-db \
  --authorized-networks=$MY_IP \
  --project=verifactu-business-480212
```

---

## Paso 5: Configurar Prisma Accelerate

1. **Ir a Prisma Data Platform:**
   - URL: https://console.prisma.io/
   - Login con tu cuenta

2. **Actualizar Connection String:**
   - Ir a tu proyecto
   - Settings → Connection Strings
   - Update: Poner la nueva DATABASE_URL de Cloud SQL

   ```
   postgresql://verifactu_user:password@34.76.xxx.xxx:5432/verifactu_production?sslmode=require
   ```

3. **Mantener API Key:**
   - La URL de Accelerate no cambia
   - Solo se actualiza el backend (ahora apunta a Cloud SQL)

---

## Paso 6: Ejecutar Migraciones

```powershell
# En tu máquina local
cd C:\dev\verifactu-monorepo\packages\db

# Usar la conexión directa para migraciones
$env:DATABASE_URL = "postgresql://verifactu_user:password@34.76.xxx.xxx:5432/verifactu_production?sslmode=require"

# Ejecutar migraciones
pnpm db:migrate

# O con Prisma CLI directamente
npx prisma migrate deploy
```

---

## Paso 7: Actualizar Variables de Entorno

### Local (.env.local)

**packages/db/.env:**

```bash
# Conexión directa (migraciones)
DATABASE_URL="postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require"

# Prisma Accelerate (runtime)
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

**apps/admin/.env.local:**

```bash
# Copiar las mismas del packages/db/.env
DATABASE_URL="postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

**apps/app/.env (si aplica):**

```bash
# Igual
DATABASE_URL="postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

---

### Producción (Vercel)

**Para CADA proyecto en Vercel:**

1. **verifactu-landing:**
   - https://vercel.com/ksenias-projects/verifactu-landing/settings/environment-variables

   ```
   DATABASE_URL = postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require
   ```

2. **verifactu-app:**
   - https://vercel.com/ksenias-projects/verifactu-app/settings/environment-variables

   ```
   DATABASE_URL = postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require
   ```

3. **verifactu-admin:**
   - https://vercel.com/ksenias-projects/verifactu-admin/settings/environment-variables
   ```
   DATABASE_URL = postgresql://verifactu_user:PASSWORD@IP:5432/verifactu_production?sslmode=require
   ```

**Nota:** Prisma Accelerate se conecta automáticamente, no necesita cambios en Vercel.

---

## Paso 8: Testing

### Test 1: Conexión Directa

```powershell
# PowerShell
cd C:\dev\verifactu-monorepo\packages\db

# Test connection
npx prisma db pull

# Si funciona, deberías ver:
# ✓ Connected to database
```

### Test 2: Prisma Accelerate

```powershell
# Test desde admin panel
cd C:\dev\verifactu-monorepo\apps\admin

# Start dev server
pnpm dev

# Abrir: http://localhost:3003
# Login y verificar que carga datos
```

### Test 3: Query desde Prisma Studio

```powershell
cd C:\dev\verifactu-monorepo\packages\db

npx prisma studio

# Abrir: http://localhost:5555
# Ver tablas y datos
```

---

## Seguridad en Producción

### 1. Restringir IPs Autorizadas

```bash
# Obtener IP de Vercel (varía, mejor usar Private IP)
# O autorizar rangos específicos

gcloud sql instances patch verifactu-db \
  --authorized-networks="34.xxx.xxx.xxx/32,35.yyy.yyy.yyy/32" \
  --project=verifactu-business-480212
```

### 2. SSL Certificates

```bash
# Descargar certificados SSL
gcloud sql ssl-certs create verifactu-cert \
  --instance=verifactu-db \
  --project=verifactu-business-480212

# Connection string con SSL
postgresql://user:pass@ip:5432/db?sslmode=verify-full&sslrootcert=/path/to/server-ca.pem
```

### 3. Private IP (Recomendado para Producción)

```bash
# Habilitar Private IP
gcloud sql instances patch verifactu-db \
  --network=projects/verifactu-business-480212/global/networks/default \
  --project=verifactu-business-480212

# Conexión via Private IP
postgresql://user:pass@10.x.x.x:5432/db?sslmode=require
```

### 4. IAM Authentication

```bash
# Crear usuario IAM
gcloud sql users create soporte@verifactu.business \
  --instance=verifactu-db \
  --type=CLOUD_IAM_USER \
  --project=verifactu-business-480212

# Connection string sin contraseña
postgresql://soporte@verifactu.business@ip:5432/db?sslmode=require
```

---

## Monitoring

### Métricas en Cloud Console

1. **Ir a Cloud SQL instance:**
   - https://console.cloud.google.com/sql/instances/verifactu-db/monitoring?project=verifactu-business-480212

2. **Ver métricas:**
   - CPU utilization
   - Memory utilization
   - Storage used
   - Connections
   - Queries per second

### Alertas

```bash
# Crear alerta de CPU alta
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud SQL CPU Alert" \
  --condition-display-name="CPU > 80%" \
  --condition-threshold-value=0.8 \
  --condition-threshold-duration=300s
```

---

## Costos Estimados

### db-f1-micro (Shared Core)

```
Instance: $7.67/mes
Storage (10 GB SSD): $1.70/mes
Backups (7 days): ~$1/mes
Total: ~$10.37/mes
```

### db-g1-small (Dedicated)

```
Instance: $25.67/mes
Storage (10 GB SSD): $1.70/mes
Backups (7 days): ~$1/mes
Total: ~$28.37/mes
```

### Prisma Accelerate

```
Starter: $29/mes
Scale: $99/mes
Business: $249/mes
```

**Total mensual (recomendado):**

- Cloud SQL db-g1-small: $28/mes
- Prisma Accelerate Starter: $29/mes
- **Total: $57/mes**

---

## Troubleshooting

### Error: "connection refused"

```bash
# Verificar IP autorizada
gcloud sql instances describe verifactu-db \
  --format="value(settings.ipConfiguration.authorizedNetworks)" \
  --project=verifactu-business-480212

# Autorizar tu IP
gcloud sql instances patch verifactu-db \
  --authorized-networks=$(curl -s https://api.ipify.org) \
  --project=verifactu-business-480212
```

### Error: "SSL required"

```bash
# Agregar ?sslmode=require al connection string
DATABASE_URL="postgresql://user:pass@ip:5432/db?sslmode=require"
```

### Error: "too many connections"

```bash
# Aumentar max_connections
gcloud sql instances patch verifactu-db \
  --database-flags=max_connections=200 \
  --project=verifactu-business-480212
```

---

## Backup y Recovery

### Manual Backup

```bash
# Crear backup on-demand
gcloud sql backups create \
  --instance=verifactu-db \
  --description="Pre-migration backup" \
  --project=verifactu-business-480212
```

### Restore

```bash
# Listar backups
gcloud sql backups list \
  --instance=verifactu-db \
  --project=verifactu-business-480212

# Restore desde backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=verifactu-db \
  --backup-id=BACKUP_ID \
  --project=verifactu-business-480212
```

### Point-in-Time Recovery

```bash
# Restore a timestamp específico
gcloud sql instances clone verifactu-db verifactu-db-clone \
  --point-in-time='2026-01-21T10:00:00.000Z' \
  --project=verifactu-business-480212
```

---

## Próximos Pasos

1. ✅ Crear instancia Cloud SQL (Console o CLI)
2. ✅ Obtener IP pública y contraseñas
3. ✅ Crear database y usuario
4. ✅ Actualizar Prisma Accelerate connection
5. ✅ Ejecutar migraciones
6. ✅ Actualizar .env.local en todos los proyectos
7. ✅ Testing local
8. ✅ Actualizar variables en Vercel
9. ✅ Deploy y testing producción
10. ✅ Configurar monitoreo y alertas

---

**Status:** 📋 Listo para ejecutar

**Recomendación:** Empezar con Google Cloud Console (Método 1) por ser más visual y fácil.
