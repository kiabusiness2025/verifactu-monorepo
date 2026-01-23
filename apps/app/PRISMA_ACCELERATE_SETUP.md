# Configuración de Prisma Accelerate

## Variables de Entorno Requeridas

### Para Desarrollo Local

Crea un archivo `.env.local` en `apps/app/` con:

```bash
# Prisma Accelerate (conexión pooled)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19ZX3Z1aUhJWmdoUVZRdVM4Vjl0WkQi..."

# Conexión directa PostgreSQL (para migraciones)
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```

### Para Vercel

Configura las mismas variables en el dashboard de Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade:
   - `DATABASE_URL` = tu URL de Prisma Accelerate completa
   - `DIRECT_DATABASE_URL` = tu conexión PostgreSQL directa

## Schema Prisma

El schema ya está configurado con soporte para Prisma Accelerate:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        # Prisma Accelerate (pooled)
  directUrl = env("DIRECT_DATABASE_URL")  # Direct connection (migrations)
}
```

## Comandos Útiles

```bash
# Generar Prisma Client
pnpm exec prisma generate

# Crear migración
pnpm exec prisma migrate dev --name migration_name

# Deploy migración a producción
pnpm exec prisma migrate deploy

# Abrir Prisma Studio
pnpm exec prisma studio
```

## Notas

- `DATABASE_URL`: Usa Prisma Accelerate con connection pooling (producción)
- `DIRECT_DATABASE_URL`: Conexión directa necesaria para ejecutar migraciones
- Prisma Accelerate mejora el rendimiento y gestión de conexiones
- Las migraciones siempre usan `directUrl` para evitar límites de pooling
