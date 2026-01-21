# ✅ Fase 1 Completada - Admin Panel MVP

## Estado Actual

### ✅ Completado

1. **Package @verifactu/db creado**
   - Schema Prisma con todos los modelos
   - Scripts configurados
   - Seed data preparado
   - Documentación completa

2. **Endpoints actualizados con contratos correctos**
   - ✅ `GET /api/admin/users` - Devuelve `{ items: Array<{...}> }`
   - ✅ `GET /api/admin/companies` - Devuelve `{ items: Array<{...}> }`
   - ✅ `POST /api/admin/impersonation/start` - Acepta solo `{ targetCompanyId }`

3. **Dependencias instaladas**
   - ✅ `pnpm install` ejecutado exitosamente
   - ✅ Prisma Client generado
   - ✅ 1822 paquetes instalados

### ⚠️ Pendiente: Base de Datos

**Bloqueador**: No hay servidor PostgreSQL disponible

Para continuar, necesitas:

#### Opción A: PostgreSQL Local

```powershell
# Instalar PostgreSQL (si no está instalado)
# Descargar de: https://www.postgresql.org/download/windows/

# Crear base de datos
psql -U postgres
CREATE DATABASE verifactu;
\q

# Actualizar .env con tu password real
# packages/db/.env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/verifactu?schema=public"

# Ejecutar migración
cd packages/db
pnpm db:migrate

# Seed
pnpm db:seed
```

#### Opción B: PostgreSQL Cloud (Recomendado)

**Supabase** (Free tier disponible):

```bash
# 1. Ir a https://supabase.com
# 2. Crear proyecto
# 3. Copiar connection string desde Settings > Database
# 4. Pegar en packages/db/.env

DATABASE_URL="postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# 5. Ejecutar
cd packages/db
pnpm db:migrate
pnpm db:seed
```

**Railway** (También tiene free tier):

```bash
# Similar process en railway.app
```

### Próximos Comandos (Una vez tengas DB)

```bash
# 1. Migrar schema
cd packages/db
pnpm db:migrate
# Nombre sugerido: "init"

# 2. Seed datos
pnpm db:seed

# 3. Verificar en Studio
pnpm db:studio

# 4. Actualizar apps/admin/.env
# Copiar el mismo DATABASE_URL

# 5. Iniciar admin panel
cd apps/admin
pnpm dev
# http://localhost:3003
```

## Resumen de Cambios

### Contratos de API

**GET /api/admin/users**

```typescript
{
  items: Array<{
    id: string;
    email: string;
    name?: string;
    role: 'USER' | 'SUPPORT' | 'ADMIN';
    createdAt: string;
    companiesCount: number;
    subscriptionStatus: 'NONE' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  }>;
}
```

**GET /api/admin/companies**

```typescript
{
  items: Array<{
    id: string;
    name: string;
    taxId?: string;
    ownerUserId: string;
    ownerEmail: string;
    createdAt: string;
  }>;
}
```

**POST /api/admin/impersonation/start**

```typescript
// Body
{
  targetCompanyId: string;
}

// Response
{
  success: true;
  message: string;
  targetUserId: string;
  targetCompanyId: string;
  targetUserEmail: string;
  companyName: string;
}
```

### Archivos Creados

```
packages/db/
├── prisma/
│   ├── schema.prisma          ✅ Schema completo
│   └── seed.ts                ✅ Seed script
├── index.ts                   ✅ Export Prisma Client
├── package.json               ✅ Scripts configurados
├── tsconfig.json              ✅ TypeScript config
├── .env                       ✅ Variables (necesita DB real)
├── .env.example               ✅ Template
├── .gitignore                 ✅ Git ignore
├── README.md                  ✅ Documentación
└── SETUP_INSTRUCTIONS.md      ✅ Instrucciones
```

### Archivos Actualizados

- `apps/admin/lib/prisma.ts` - Re-exporta desde `@verifactu/db`
- `apps/admin/package.json` - Usa `@verifactu/db` workspace
- `apps/admin/app/api/admin/users/route.ts` - Queries Prisma
- `apps/admin/app/api/admin/companies/route.ts` - Queries Prisma
- `apps/admin/app/api/admin/impersonation/start/route.ts` - Solo targetCompanyId

## Testing Checklist (Post-Database)

Una vez configurada la base de datos:

- [ ] Migración ejecutada sin errores
- [ ] Seed data creado (admin user + test company)
- [ ] Prisma Studio muestra datos
- [ ] Admin panel inicia en localhost:3003
- [ ] Login con Google Workspace funciona
- [ ] Usuario creado en DB con role ADMIN
- [ ] Endpoint `/api/admin/users` devuelve items
- [ ] Endpoint `/api/admin/companies` devuelve items
- [ ] Impersonation start con targetCompanyId
- [ ] Cookie `vf_admin_imp` se establece
- [ ] Impersonation stop limpia cookie
- [ ] Audit logs se crean en DB

---

**Next Step**: Configurar PostgreSQL (local o cloud) y ejecutar migración + seed
