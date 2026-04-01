# Estrategia de Separación: Panel Cliente vs Panel Admin

Documento de arquitectura para la separación del panel de administración del dashboard de clientes en el monorepo Verifactu.

## 🎯 Objetivos

1. **Separar concerns:** Cliente factura, Admin gestiona
2. **Seguridad:** Admin solo accesible para `@verifactu.business`
3. **Escalabilidad:** Deployments independientes
4. **Mantenibilidad:** Código específico por contexto

## 🏗️ Arquitectura del Monorepo

```
verifactu-monorepo/
├── apps/
│   ├── web/              # Marketing (verifactu.business)
│   ├── app/              # Cliente (app.verifactu.business)
│   ├── admin/            # Admin (admin.verifactu.business) ✨ NUEVO
│   └── mobile/           # Apps móviles (futuro)
│
├── packages/
│   ├── ui/               # Componentes compartidos
│   ├── db/               # Prisma + tipos
│   ├── auth/             # NextAuth + RBAC
│   ├── billing/          # Stripe wrappers
│   ├── email/            # Resend templates
│   └── integrations/     # eInforma, Vercel, GitHub
│
├── docs/                 # Documentación general
├── scripts/              # Scripts de utilidad
└── pnpm-workspace.yaml
```

## 📊 Comparación: apps/app vs apps/admin

| Aspecto       | apps/app (Cliente)     | apps/admin (Admin)       |
| ------------- | ---------------------- | ------------------------ |
| **Dominio**   | app.verifactu.business | admin.verifactu.business |
| **Auth**      | Firebase Auth          | Google Workspace OAuth   |
| **Usuarios**  | Clientes finales       | Equipo interno           |
| **Roles**     | USER                   | SUPPORT, ADMIN           |
| **Puerto**    | 3000                   | 3003                     |
| **Propósito** | Facturación Verifactu  | Gestión operativa        |

## 🔐 Sistema de Autenticación

### apps/app (Clientes)

```typescript
// Firebase Auth
- Email/Password
- Google OAuth (cualquier cuenta)
- Facebook OAuth
- SMS (futuro)

// Rol único
USER
```

### apps/admin (Equipo)

```typescript
// NextAuth + Google Workspace
- Solo @verifactu.business
- OAuth con hd restriction

// Roles jerárquicos
ADMIN   → Acceso total
SUPPORT → Acceso limitado por scope
```

## 🛣️ Migración de Rutas

### Rutas que se MUEVEN a apps/admin

```
apps/app/dashboard/admin/*  →  apps/admin/dashboard/*
```

**Rutas específicas:**

| Desde (app)                        | Hacia (admin)                  |
| ---------------------------------- | ------------------------------ |
| `/dashboard/admin/empresas`        | `/dashboard/companies`         |
| `/dashboard/admin/users`           | `/dashboard/users`             |
| `/dashboard/admin/import`          | `/dashboard/operations/import` |
| `/dashboard/admin/emails`          | `/dashboard/email`             |
| `/dashboard/admin/contabilidad`    | `/dashboard/billing`           |
| `/dashboard/settings` (admin-only) | `/dashboard/operations`        |

### Rutas que PERMANECEN en apps/app

```
✅ /dashboard/facturas
✅ /dashboard/clientes (propios del user)
✅ /dashboard/gastos
✅ /dashboard/presupuestos
✅ /dashboard/settings (usuario)
✅ /dashboard/isaak
```

## 📦 Packages Compartidos

### @verifactu/ui

Componentes reutilizables:

```typescript
// Usados en AMBOS apps
-AccessibleButton - AccessibleInput - Badge - Card - Modal - Table;
```

### @verifactu/auth

```typescript
// Config NextAuth
authOptions;

// Guards
requireAuth();
requireRole([ADMIN, SUPPORT]);

// Utils
checkPermission(user, 'canViewDocuments');
canImpersonate(user);
```

### @verifactu/integrations

```typescript
// Clients API
-stripeClient - eInformaClient - resendClient - vercelClient - githubClient;

// Usado mayormente en apps/admin
```

## 🚀 Flujo de Desarrollo

### 1. Crear nueva feature en Admin

```bash
# Desde raíz del monorepo
cd apps/admin

# Crear página
mkdir -p app/dashboard/users
touch app/dashboard/users/page.tsx

# Usar packages compartidos
import { AccessibleButton } from '@verifactu/ui';
import { requireRole, UserRole } from '@verifactu/auth';
import { stripeClient } from '@verifactu/integrations';
```

### 2. Compartir código entre apps

```bash
# Crear componente compartido
cd packages/ui
touch components/UserCard.tsx

# Exportar
echo "export { UserCard } from './components/UserCard';" >> index.ts

# Usar en ambas apps
import { UserCard } from '@verifactu/ui';
```

### 3. Ejecutar en desarrollo

```bash
# Terminal 1: App cliente
cd apps/app
pnpm dev # Puerto 3000

# Terminal 2: App admin
cd apps/admin
pnpm dev # Puerto 3003

# Terminal 3: Toda la monorepo (con turbo)
pnpm dev # Inicia apps/app + apps/admin + apps/landing
```

## 🔒 Seguridad en apps/admin

### Middleware de Protección

```typescript
// apps/admin/middleware.ts
export async function middleware(req: NextRequest) {
  const session = await getSession(req);

  // 1. Usuario autenticado?
  if (!session) {
    return NextResponse.redirect('/auth/signin');
  }

  // 2. Email @verifactu.business?
  if (!session.user.email?.endsWith('@verifactu.business')) {
    return NextResponse.redirect('/auth/error?error=AccessDenied');
  }

  // 3. Rol permitido?
  if (![UserRole.ADMIN, UserRole.SUPPORT].includes(session.user.role)) {
    return NextResponse.redirect('/auth/error?error=Unauthorized');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### Audit Log Automático

```typescript
// Decorator para acciones sensibles
async function withAudit<T>(
  action: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const session = await getServerSession();
  const start = Date.now();

  try {
    const result = await fn();

    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action,
        metadata,
        duration: Date.now() - start,
        success: true,
      },
    });

    return result;
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action,
        metadata: { ...metadata, error: error.message },
        duration: Date.now() - start,
        success: false,
      },
    });
    throw error;
  }
}

// Uso
await withAudit(
  'DELETE_USER',
  async () => {
    await prisma.user.delete({ where: { id: userId } });
  },
  { userId, reason: 'GDPR request' }
);
```

## 🌐 Despliegues Independientes

### Vercel (actual)

`apps/admin` se despliega como proyecto Next.js en Vercel, conectado al monorepo.

### Vercel

```json
// vercel.json (raíz)
{
  "projects": [
    {
      "name": "verifactu-app",
      "directory": "apps/app",
      "framework": "nextjs",
      "domains": ["app.verifactu.business"]
    },
    {
      "name": "verifactu-admin",
      "directory": "apps/admin",
      "framework": "nextjs",
      "domains": ["admin.verifactu.business"]
    }
  ]
}
```

## 📊 Base de Datos Compartida

Ambas apps usan la **misma** base de datos PostgreSQL:

```typescript
// packages/db/prisma/schema.prisma

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  role        UserRole @default(USER)
  supportScope Json?   // Solo para SUPPORT

  // Relaciones
  companies   Company[]
  auditLogs   AuditLog[] @relation("actor")
}

enum UserRole {
  USER     // Cliente (acceso a apps/app)
  SUPPORT  // Soporte (acceso a apps/admin)
  ADMIN    // Admin (acceso total a apps/admin)
}

model Company {
  id            String @id @default(cuid())
  userId        String
  user          User   @relation(fields: [userId], references: [id])

  // ... campos de empresa
}

model AuditLog {
  id              String   @id @default(cuid())
  actorUserId     String
  actor           User     @relation("actor", fields: [actorUserId], references: [id])
  targetUserId    String?
  targetCompanyId String?
  action          String
  metadata        Json?
  timestamp       DateTime @default(now())
  ip              String?
  userAgent       String?
}
```

## 🎨 Diseño UI Diferenciado

### apps/app (Cliente)

- **Colores:** Azul/verde (brand)
- **Tono:** Amigable, profesional
- **Foco:** UX para facturación rápida

### apps/admin (Interno)

- **Colores:** Slate/gris (neutro)
- **Tono:** Funcional, eficiente
- **Foco:** Tablas de datos, métricas
- **Banner:** Modo impersonación (rojo)

## 📈 KPIs y Métricas

### apps/admin Dashboard

```typescript
// Overview page
- Usuarios activos (últimos 30 días)
- MRR (Monthly Recurring Revenue)
- Tasa de conversión signup→factura
- Incidencias abiertas
- Pagos fallidos (últimas 24h)
- Webhooks fallando
```

## 🧪 Testing

```bash
# Test apps/admin solamente
cd apps/admin
pnpm test

# Test todo el monorepo
pnpm test

# E2E específicos
pnpm test:e2e:admin
```

## 📚 Documentación por App

```
apps/app/README.md     → Para clientes y devs de features
apps/admin/README.md   → Para equipo interno
```

## 🚀 Roadmap

### Fase 1: Setup (ACTUAL)

- [x] Estructura packages compartidos
- [x] apps/admin inicial con OAuth
- [x] Documentación

### Fase 2: Migración Módulos

- [ ] Migrar `/admin/users` → apps/admin
- [ ] Migrar `/admin/companies` → apps/admin
- [ ] Migrar `/admin/billing` → apps/admin

### Fase 3: Features Nuevas

- [ ] Dashboard Overview con KPIs
- [ ] Modo impersonación
- [ ] Audit log viewer
- [ ] Integración completa Stripe
- [ ] Monitor de Resend/Vercel/GitHub

### Fase 4: Producción

- [ ] Configurar deploy en Vercel
- [ ] Configurar dominio admin.verifactu.business
- [ ] Migración datos completa
- [ ] Training equipo interno

---

**Status:** 🟢 En progreso  
**Owner:** @kiabusiness2025  
**Última actualización:** 21 Enero 2026
