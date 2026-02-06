# CLOUD SQL SETUP - PASOS SIMPLES

## 1. CREAR INSTANCIA (Google Cloud Console ya abierto)

**Click en "CREATE INSTANCE" > "PostgreSQL"**

### Configuracion Basica:

```
Instance ID: verifactu-db
Password: [GENERA UNA SEGURA - Guardala!]
Database version: PostgreSQL 15
Region: europe-west1 (Belgium)
Zonal availability: Single zone
```

### Machine Configuration:

```
Cloud SQL edition: Enterprise
Preset: Development (1 vCPU, 3.75 GB)
```

### Storage:

```
Storage type: SSD
Storage capacity: 10 GB
Enable automatic storage increases: SI
```

### Connections:

```
Instance IP assignment: Public IP
Authorized networks: 0.0.0.0/0 (temporal - ajustar despues)
```

### Data Protection:

```
Automated backups: SI
Backup time: 03:00 (3 AM)
Point-in-time recovery: SI
```

**Click "CREATE INSTANCE"** (tardara 5-10 minutos)

---

## 2. CREAR BASE DE DATOS

Una vez creada la instancia:

1. Ve a la instancia `verifactu-db`
2. Tab "DATABASES"
3. Click "CREATE DATABASE"
4. Database name: `verifactu_production`
5. Character set: `UTF8`
6. Click "CREATE"

---

## 3. CREAR USUARIO

1. Tab "USERS"
2. Click "ADD USER ACCOUNT"
3. Username: `verifactu_user`
4. Password: [GENERA UNA SEGURA - Guardala!]
5. Host: `%` (cualquier host)
6. Click "ADD"

---

## 4. OBTENER IP PUBLICA

1. Ve a tab "OVERVIEW"
2. Busca "Public IP address"
3. Copia la IP (ejemplo: 34.76.xxx.xxx)

---

## 5. CONNECTION STRING

Formato:

```
postgres://verifactu_user:[TU_PASSWORD]@[IP_PUBLICA]:5432/verifactu_production?sslmode=require
```

Ejemplo:

```
postgres://verifactu_user:miPassword123@34.76.123.456:5432/verifactu_production?sslmode=require
```

---

## 6. ACTUALIZAR PRISMA ACCELERATE

1. Ve a https://console.prisma.io/
2. Selecciona tu proyecto
3. Settings > Connection String
4. Pega el connection string de Cloud SQL
5. Save
6. Copia el nuevo `PRISMA_DATABASE_URL` (empieza con `prisma+postgres://accelerate...`)

---

## 7. ACTUALIZAR .ENV FILES

### packages/db/.env

```env
DATABASE_URL="postgres://verifactu_user:[PASSWORD]@[IP]:5432/verifactu_production?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

### apps/admin/.env.local

```env
DATABASE_URL="postgres://verifactu_user:[PASSWORD]@[IP]:5432/verifactu_production?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

### apps/app/.env (si existe)

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
```

---

## 8. MIGRAR DATOS (OPCIONAL - SI TIENES DATOS)

Si tienes datos en Prisma hosting actual:

```powershell
# Exportar
pg_dump -h db.prisma.io -U ac6301a89a331d... postgres > backup.sql

# Importar
psql "postgres://verifactu_user:[PASSWORD]@[IP]:5432/verifactu_production?sslmode=require" < backup.sql
```

---

## 9. EJECUTAR MIGRACIONES

```powershell
cd packages/db
pnpm db:migrate
```

---

## 10. VERIFICAR CONEXION

```powershell
cd packages/db
pnpm prisma studio
```

Deberia abrir http://localhost:5555 conectado a Cloud SQL

---

## 11. CONFIGURAR VERCEL

Para cada proyecto (landing, app, admin):

1. Ve a Vercel Dashboard > Settings > Environment Variables
2. Actualiza:
   - `DATABASE_URL` (direct connection string)
   - `PRISMA_DATABASE_URL` (accelerate URL)
3. Environments: Production, Preview, Development
4. Redeploy el proyecto

---

## COSTOS ESTIMADOS

- Cloud SQL (db-g1-small): ~$30/mes
- Prisma Accelerate (Starter): ~$29/mes
- **TOTAL: ~$59/mes (~$708/año)**

---

## LINKS UTILES

- Cloud SQL Console: https://console.cloud.google.com/sql/instances?project=verifactu-business-480212
- Prisma Console: https://console.prisma.io/
- Vercel Dashboard: https://vercel.com/

---

## TROUBLESHOOTING

### Error: "Connection refused"

- Verifica que Public IP este habilitado
- Agrega tu IP a Authorized networks

### Error: "SSL required"

- Agrega `?sslmode=require` al connection string

### Error: "Password authentication failed"

- Verifica usuario y password
- Verifica que host sea `%` en Cloud SQL Users

### Error: "Database does not exist"

- Verifica que creaste la database `verifactu_production`
- Nombre debe ser exacto (case-sensitive en algunos casos)

---

## SIGUIENTE PASO

Una vez completados los pasos 1-4, avísame y te ayudo con el resto! 🚀
