# Integración Prisma - Admin Panel

## 🎯 Objetivo

Conectar el admin panel con la base de datos PostgreSQL usando Prisma para reemplazar los datos mock con datos reales.

## 📋 Estado Actual

### ✅ Completado

- [x] PrismaClient configurado en `lib/prisma.ts`
- [x] NextAuth actualizado con PrismaAdapter
- [x] Callbacks actualizados para cargar rol desde DB
- [x] Dependencies agregadas en package.json:
  - `@prisma/client@^5.22.0`
  - `@next-auth/prisma-adapter@^1.0.7`
  - `prisma@^5.22.0` (devDependency)

### ⏳ Pendiente


- [x] Sincronización automática: al iniciar sesión con Google/Firebase, si el usuario no existe en Prisma y el email es admin, se crea automáticamente con rol ADMIN. Si existe y el email es admin, se actualiza el rol a ADMIN si es necesario.

---

## 🗄️ Schema Prisma Propuesto

### Ubicación

El schema debe estar en: `packages/db/prisma/schema.prisma` (compartido con apps/app)

### Schema Completo

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// NextAuth Models (requeridos por PrismaAdapter)
// ============================================================================

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ============================================================================
// User & Company Models
// ============================================================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(USER)

  // Support scope (para rol SUPPORT)
  supportScope  Json?     // SupportScope interface

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLogin     DateTime?

  // Relations
  accounts              Account[]
  sessions              Session[]
  companies             Company[]
  auditLogsAsActor      AuditLog[] @relation("ActorLogs")
  auditLogsAsTarget     AuditLog[] @relation("TargetLogs")

  @@index([email])
  @@index([role])
}

model Company {
  id        String   @id @default(cuid())
  name      String
  cif       String   @unique
  status    String   @default("active") // active, inactive, suspended

  // Company details
  address   String?
  phone     String?
  email     String?

  // Stats
  invoicesCount    Int @default(0)
  documentsCount   Int @default(0)
  lastActivity     DateTime?

  // Relations
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  auditLogs AuditLog[]

  @@index([ownerId])
  @@index([cif])
  @@index([status])
}

// ============================================================================
// Audit Log Model
// ============================================================================

model AuditLog {
  id              String   @id @default(cuid())

  // Actor (quien realiza la acción)
  actorUserId     String
  actorEmail      String
  actor           User     @relation("ActorLogs", fields: [actorUserId], references: [id])

  // Action details
  action          String   // IMPERSONATION_START, IMPERSONATION_STOP, LOGIN, LOGOUT, etc.

  // Target (sobre quién/qué se realiza la acción)
  targetUserId    String?
  targetUser      User?    @relation("TargetLogs", fields: [targetUserId], references: [id])

  targetCompanyId String?
  targetCompany   Company? @relation(fields: [targetCompanyId], references: [id])

  // Metadata
  metadata        Json?    // Additional context

  // Request info
  ip              String
  userAgent       String   @db.Text

  timestamp       DateTime @default(now())

  @@index([actorUserId])
  @@index([targetUserId])
  @@index([targetCompanyId])
  @@index([action])
  @@index([timestamp(sort: Desc)])
}

// ============================================================================
// Enums
// ============================================================================

enum Role {
  USER     // Cliente normal (apps/app)
  SUPPORT  // Soporte técnico (apps/admin con permisos limitados)
  ADMIN    // Administrador completo (apps/admin acceso total)
}
```

---

## 🔧 Pasos de Implementación

### 1. Verificar Schema Existente

```bash
# Ver si ya existe un schema en packages/db
ls packages/db/prisma/schema.prisma
```

Si existe, agregar los modelos necesarios. Si no existe, crear la estructura completa.

### 2. Actualizar/Crear Schema

```bash
# Crear directorio si no existe
mkdir -p packages/db/prisma

# Crear o actualizar schema.prisma
# (copiar el schema propuesto arriba)
```

### 3. Crear Cliente Prisma Compartido

Crear `packages/db/index.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
```

Actualizar `apps/admin/lib/prisma.ts`:

```typescript
// Importar desde el package compartido
export { prisma } from '@verifactu/db';
```

### 4. Generar Cliente Prisma

```bash
cd packages/db
pnpm prisma generate
```

### 5. Ejecutar Migración

```bash
# Crear migración
pnpm prisma migrate dev --name add_admin_models

# O aplicar migración existente
pnpm prisma migrate deploy
```

### 6. Seed Inicial (Opcional)

Crear `packages/db/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crear usuario admin
  await prisma.user.upsert({
    where: { email: 'support@verifactu.business' },
    update: {},
    create: {
      email: 'support@verifactu.business',
      name: 'Support Team',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Ejecutar seed:

```bash
pnpm prisma db seed
```

---

## 🔄 Actualizar APIs con Prisma

### Antes (Mock Data)

```typescript
// apps/admin/app/api/admin/users/route.ts
const users = [
  {
    id: '1',
    email: 'support@verifactu.business',
    name: 'Support Team',
    role: 'SUPPORT',
    // ...
  },
];
```

### Después (Prisma)

```typescript
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where = {
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { role: role as Role }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: { companies: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      companiesCount: u._count.companies,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
```

---

## 📝 Checklist de Actualización

### APIs a Actualizar

- [ ] `/api/admin/users` (GET) - Lista usuarios
- [ ] `/api/admin/users/[userId]` (GET) - Detalle usuario
- [ ] `/api/admin/companies` (GET) - Lista empresas
- [ ] `/api/admin/companies/[companyId]` (GET) - Detalle empresa
- [ ] `/api/admin/me` (GET) - Sesión actual

### Audit Log Integration

- [ ] `lib/audit.ts` - `createAuditLog()` usar Prisma
- [ ] `lib/audit.ts` - `getRecentAuditLogs()` usar Prisma
- [ ] `lib/audit.ts` - `getAuditLogsByUser()` usar Prisma
- [ ] `lib/audit.ts` - `getAuditLogsByCompany()` usar Prisma

### NextAuth Integration

- [x] ✅ `app/api/auth/[...nextauth]/route.ts` - PrismaAdapter configurado
- [x] ✅ JWT callback carga rol desde DB
- [x] ✅ Session callback expone rol

---

## 🧪 Testing con Prisma

### 1. Verificar Conexión

```bash
pnpm prisma db push
```

### 2. Ver Datos en Prisma Studio

```bash
pnpm prisma studio
```

### 3. Test de Queries

Crear archivo temporal `test-prisma.ts`:

```typescript
import { prisma } from './lib/prisma';

async function test() {
  const users = await prisma.user.findMany();
  console.log('Users:', users);

  const companies = await prisma.company.findMany();
  console.log('Companies:', companies);
}

test();
```

---

## 🚨 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

```bash
# Generar cliente
pnpm prisma generate
```

### Error: "Environment variable not found: DATABASE_URL"

Verificar `.env.local` tiene:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

### Error: Migration conflicts

```bash
# Reset database (⚠️ solo en desarrollo)
pnpm prisma migrate reset

# Aplicar migraciones
pnpm prisma migrate deploy
```

---

## 📚 Referencias

- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Prisma Adapter](https://next-auth.js.org/adapters/prisma)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Próximo Paso**: Ejecutar `pnpm install` y luego crear el schema en `packages/db/prisma/schema.prisma`
