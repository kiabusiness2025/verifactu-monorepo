# Guía de Configuración de Base de Datos - VeriFactu Business

## Estado Actual

✅ **Código de autorización completo**

- Roles: owner > admin > member > asesor
- Guards: `ensureTenantAccess`, `ensureRole`
- Repositorios: tenants, memberships, preferences
- API endpoints: `/api/tenants`, `/api/memberships`, `/api/session/tenant-switch`

✅ **Schema Postgres listo** (`db/schema.sql`)

- 11 tablas definidas
- Índices y constraints configurados
- Extensión pgcrypto habilitada

✅ **Dependencias instaladas**

- `pg ^8.11.5` instalado en `apps/app/node_modules`
- TypeScript types configurados

---

## Pasos para Completar el Despliegue

### 1. Crear/Acceder Base de Datos Postgres

Tienes varias opciones:

#### **Opción A: Vercel Postgres** (Recomendado)

```bash
# Desde la consola de Vercel:
# 1. Ve a https://vercel.com/ksenias-projects-16d8d1fb/app
# 2. Storage > Create Database > Postgres
# 3. Copia la variable DATABASE_URL que se genera automáticamente
```

#### **Opción B: Supabase** (Gratis hasta 500 MB)

```bash
# 1. Ve a https://supabase.com
# 2. Crea un nuevo proyecto
# 3. Ve a Settings > Database
# 4. Copia el "Connection string" (formato postgres://...)
```

#### **Opción C: Railway** (Gratis con límites)

```bash
# 1. Ve a https://railway.app
# 2. New Project > Provision PostgreSQL
# 3. Copia la DATABASE_URL desde las variables
```

#### **Opción D: Neon** (Serverless Postgres)

```bash
# 1. Ve a https://neon.tech
# 2. Crea un proyecto
# 3. Copia la connection string
```

---

### 2. Ejecutar Migración

Una vez tengas el `DATABASE_URL`:

#### **Windows (PowerShell)**

```powershell
# Configurar DATABASE_URL temporalmente
$env:DATABASE_URL = "postgres://usuario:password@host:5432/verifactu_app"

# Ejecutar script de migración
.\scripts\migrate-db.ps1
```

#### **Sin psql instalado**

Si no tienes PostgreSQL Client instalado:

1. Abre `db/schema.sql` en un editor
2. Copia todo el contenido
3. Pégalo en el SQL Editor de tu proveedor (Supabase, Vercel, etc.)
4. Ejecuta

---

### 3. Configurar Variables de Entorno en Vercel

#### **Vía Dashboard**

1. Ve a: https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables
2. Añade:
   - **Name:** `DATABASE_URL`
   - **Value:** `postgres://usuario:password@host:5432/verifactu_app`
   - **Environments:** Production, Preview, Development

#### **Vía CLI**

```bash
cd C:\dev\verifactu-monorepo\apps\app

# Añadir DATABASE_URL a producción
vercel env add DATABASE_URL production

# Cuando te pregunte el valor, pega el connection string
```

---

### 4. Verificar Localmente (Opcional pero Recomendado)

```powershell
cd C:\dev\verifactu-monorepo\apps\app

# Configurar DATABASE_URL en .env.local
echo 'DATABASE_URL="postgres://..."' >> .env.local

# Iniciar servidor de desarrollo
npm run dev

# Probar endpoints:
# POST http://localhost:3000/api/tenants
# GET http://localhost:3000/api/tenants
```

---

### 5. Redesplegar a Vercel

```powershell
cd C:\dev\verifactu-monorepo\apps\app

# Desplegar a producción
vercel --prod --yes
```

---

## Verificación Post-Despliegue

### Probar Endpoints

```bash
# 1. Login en landing
# Navega a: https://verifactu.business
# Haz login con Firebase

# 2. Accede a la app
# Debería redirigir a: https://app.verifactu.business/dashboard

# 3. Probar creación de tenant (desde consola del navegador)
fetch('/api/tenants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mi Empresa Test' })
})
.then(r => r.json())
.then(console.log)

# 4. Listar tenants
fetch('/api/tenants')
.then(r => r.json())
.then(console.log)
```

---

## Troubleshooting

### Error: "Connection refused"

- Verifica que DATABASE_URL esté configurado en Vercel
- Asegúrate de que el host/puerto sean correctos
- Verifica que la base de datos esté activa

### Error: "relation does not exist"

- La migración no se ejecutó correctamente
- Vuelve a ejecutar `db/schema.sql` en el SQL Editor

### Error: "Invalid session"

- Verifica que SESSION_SECRET esté configurado
- Verifica que el cookie `__session` se esté enviando
- Revisa middleware.ts para reglas de autenticación

### Error: "role must be one of: owner, admin, member, asesor"

- Verifica que el rol en la request sea válido
- Revisa `lib/roles.ts` para roles permitidos

---

## Próximos Pasos Técnicos

Una vez desplegado y funcionando:

1. **Tests Unitarios**

   ```bash
   # Crear tests para guards
   # apps/app/lib/__tests__/roles.test.ts
   # apps/app/lib/__tests__/authz.test.ts
   ```

2. **Logging en Producción**
   - Configurar Vercel Log Drains (opcional)
   - Implementar error tracking (Sentry, LogRocket, etc.)

3. **Monitoreo**
   - Configurar health check endpoints
   - Alertas para errores 500 en endpoints críticos

4. **Performance**
   - Implementar connection pooling (ya configurado con max: 10)
   - Considerar caching para queries frecuentes

---

## Comandos Rápidos

```powershell
# Instalar dependencias
cd apps\app; npm install

# Ejecutar migración (con DATABASE_URL configurado)
.\scripts\migrate-db.ps1

# Desplegar
cd apps\app; vercel --prod --yes

# Ver logs de producción
vercel logs --prod

# Ver variables de entorno configuradas
vercel env ls
```

---

## Recursos

- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
- **Supabase:** https://supabase.com/docs
- **Railway:** https://docs.railway.app/databases/postgresql
- **Neon:** https://neon.tech/docs/introduction
- **pg (node-postgres):** https://node-postgres.com/
