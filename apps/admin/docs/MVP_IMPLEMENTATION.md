# Admin Panel MVP - Guía de Implementación

## ✅ Implementación Completa

Se ha implementado el MVP completo del panel de administración con todas las funcionalidades requeridas.

## 📁 Estructura de Archivos Creados

### Rutas y Páginas

```
apps/admin/
├── middleware.ts                           # Protección de rutas (NextAuth)
├── lib/
│   ├── cookies.ts                         # JWT firmado para impersonación
│   └── audit.ts                           # Sistema de audit logging
├── app/
│   ├── page.tsx                           # Redirect a /overview
│   ├── overview/page.tsx                  # Dashboard principal con KPIs
│   ├── users/page.tsx                     # Listado de usuarios
│   ├── companies/page.tsx                 # Listado de empresas
│   ├── audit/page.tsx                     # Audit log viewer
│   ├── dashboard/layout.tsx               # Layout con sidebar + banner impersonación
│   └── api/admin/
│       ├── me/route.ts                    # GET sesión + estado impersonación
│       ├── users/
│       │   ├── route.ts                   # GET lista usuarios + filtros
│       │   └── [userId]/route.ts          # GET detalle usuario
│       ├── companies/
│       │   ├── route.ts                   # GET lista empresas + filtros
│       │   └── [companyId]/route.ts       # GET detalle empresa
│       └── impersonation/
│           ├── start/route.ts             # POST iniciar impersonación
│           └── stop/route.ts              # POST detener impersonación
```

## 🔐 Sistema de Autenticación

### Google Workspace OAuth

- **Dominio restringido**: Solo @verifactu.business
- **Roles permitidos**: ADMIN, SUPPORT
- **Email específico**: support@verifactu.business (configurable)
- **Middleware**: Protege todas las rutas excepto públicas
- **Sesión**: JWT con 8 horas de duración

### Middleware RBAC ([middleware.ts](../middleware.ts))

**Configuración flexible con variables de entorno:**

```typescript
// Control de acceso granular
ADMIN_ALLOWED_EMAIL = 'support@verifactu.business';
ADMIN_ALLOWED_DOMAIN = 'verifactu.business';
```

**Características:**

- ✅ Permite rutas públicas: `/api/auth`, `/_next`, assets
- ✅ Verifica JWT token con `getToken()` de NextAuth
- ✅ Redirección automática a signin si no autenticado
- ✅ Validación dual: email específico O dominio completo
- ✅ Validación de rol: SUPPORT o ADMIN
- ✅ Respuesta 403 Forbidden si no cumple requisitos

**Lógica de validación:**

```typescript
// Email válido si:
const emailOk = email === 'support@verifactu.business' || email.endsWith('@verifactu.business');

// Rol válido si:
const roleOk = role === 'SUPPORT' || role === 'ADMIN';

// Acceso permitido si AMBOS son true
```

### Verificación en 3 Capas

1. **OAuth**: Restricción de dominio en Google Cloud Console
2. **Middleware**: Verificación de email, dominio y rol
3. **API Guards**: Verificación adicional por endpoint

## 🔄 Sistema de Impersonación

### Características

- **Cookie firmada** (httpOnly, Secure, SameSite=Strict)
- **JWT con jose**: Firma criptográfica para prevenir manipulación
- **Duración**: 8 horas máximo
- **Audit obligatorio**: Log automático al inicio/fin

### Payload del Token

```typescript
{
  adminUserId: string;      // Usuario admin que impersona
  targetUserId: string;     // Usuario objetivo
  targetCompanyId?: string; // Empresa objetivo (opcional)
  startedAt: number;        // Timestamp inicio
  expiresAt: number;        // Timestamp expiración
}
```

### API Endpoints

- `POST /api/admin/impersonation/start`
  - Body: `{ targetUserId, targetCompanyId? }`
  - Crea cookie firmada + audit log
- `POST /api/admin/impersonation/stop`
  - Sin body
  - Elimina cookie + audit log

### UI

- **Banner naranja** en dashboard cuando está activo
- **Botón "Detener Impersonación"** en banner
- **Indicadores** en botones de empresas

## 📝 Sistema de Audit Log

### Eventos Registrados

- `IMPERSONATION_START`: Inicio de impersonación
- `IMPERSONATION_STOP`: Fin de impersonación
- `LOGIN`: Acceso al sistema
- `LOGOUT`: Salida del sistema
- Futuros: modificaciones, accesos sensibles, etc.

### Información Capturada

```typescript
{
  actorUserId: string;        // Quien realiza la acción
  actorEmail: string;         // Email del actor
  action: string;             // Tipo de acción
  targetUserId?: string;      // Usuario afectado
  targetCompanyId?: string;   // Empresa afectada
  metadata?: Record<string, any>; // Datos adicionales
  ip: string;                 // IP del actor
  userAgent: string;          // Navegador del actor
  timestamp: Date;            // Momento exacto
}
```

### Funciones Disponibles

- `createAuditLog(entry)`: Crear registro
- `getRecentAuditLogs(limit)`: Últimos N logs
- `getAuditLogsByUser(userId, limit)`: Logs de un usuario
- `getAuditLogsByCompany(companyId, limit)`: Logs de una empresa

## 🎨 Interfaz de Usuario

### Overview (/overview)

- **Stats Grid**: Total usuarios, empresas, impersonaciones activas, auditorías
- **Quick Actions**: Accesos rápidos a secciones principales
- **Recent Activity**: Timeline de actividad (por implementar con DB)

### Usuarios (/users)

- **Filtros**: Search, role
- **Tabla**: Email, role, empresas, último acceso
- **Link**: Ver detalle de usuario

### Empresas (/companies)

- **Filtros**: Search, status
- **Tabla**: Nombre, CIF, propietario, estado
- **Acciones**: Ver detalle, iniciar impersonación

### Audit Log (/audit)

- **Filtros**: Usuario, acción, fecha
- **Timeline**: Vista cronológica de eventos
- **Detalles**: Metadata expandible

### Layout

- **Sidebar**: Navegación principal
- **User Menu**: Info usuario + logout
- **Impersonation Banner**: Alerta naranja cuando activo

## 🔧 APIs Implementadas

### Autenticación

- `GET /api/admin/me`
  - Retorna: Usuario actual + estado impersonación
  - Headers: Sesión NextAuth

### Usuarios

- `GET /api/admin/users`
  - Query: search, role, page, limit
  - Retorna: Lista paginada de usuarios
- `GET /api/admin/users/[userId]`
  - Retorna: Detalle usuario + empresas asociadas

### Empresas

- `GET /api/admin/companies`
  - Query: search, status, page, limit
  - Retorna: Lista paginada de empresas
- `GET /api/admin/companies/[companyId]`
  - Retorna: Detalle empresa + stats

### Impersonación

- `POST /api/admin/impersonation/start`
  - Body: `{ targetUserId, targetCompanyId? }`
  - Headers: Set-Cookie con token firmado
  - Audit: IMPERSONATION_START
- `POST /api/admin/impersonation/stop`
  - Headers: Clear cookie
  - Audit: IMPERSONATION_STOP

## 🗄️ Integración con Base de Datos

### TODO: Conectar Prisma

Actualmente las APIs retornan datos mock. Pasos para conectar DB:

1. **Definir Schema Prisma** (`packages/db/schema.prisma`):

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  lastLogin     DateTime?
  companies     Company[]
  auditLogsAsActor  AuditLog[] @relation("Actor")
  auditLogsAsTarget AuditLog[] @relation("Target")
}

model Company {
  id        String   @id @default(cuid())
  name      String
  cif       String   @unique
  status    String   @default("active")
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  createdAt DateTime @default(now())
  auditLogs AuditLog[]
}

model AuditLog {
  id              String   @id @default(cuid())
  actorUserId     String
  actorEmail      String
  action          String
  targetUserId    String?
  targetCompanyId String?
  metadata        Json?
  ip              String
  userAgent       String
  timestamp       DateTime @default(now())

  actor           User     @relation("Actor", fields: [actorUserId], references: [id])
  targetUser      User?    @relation("Target", fields: [targetUserId], references: [id])
  targetCompany   Company? @relation(fields: [targetCompanyId], references: [id])

  @@index([actorUserId])
  @@index([targetUserId])
  @@index([targetCompanyId])
  @@index([timestamp])
}

enum Role {
  USER
  SUPPORT
  ADMIN
}
```

2. **Actualizar APIs** (reemplazar mock data):

```typescript
// apps/admin/app/api/admin/users/route.ts
import { prisma } from '@verifactu/db';

const users = await prisma.user.findMany({
  where: {
    OR: [{ email: { contains: search } }, { name: { contains: search } }],
    ...(role && { role: role as Role }),
  },
  take: limit,
  skip: (page - 1) * limit,
  include: {
    _count: { select: { companies: true } },
  },
});
```

3. **Actualizar Audit Log** (`lib/audit.ts`):

```typescript
import { prisma } from '@verifactu/db';

export async function createAuditLog(entry) {
  await prisma.auditLog.create({
    data: {
      ...entry,
      metadata: entry.metadata || {},
    },
  });
}
```

## 🚀 Próximos Pasos

### Fase 2: Conectar Base de Datos

1. Definir schema Prisma completo
2. Ejecutar migraciones
3. Actualizar APIs para usar Prisma
4. Poblar datos iniciales

### Fase 3: Páginas de Detalle

1. `/users/[userId]`: Vista detallada + historial
2. `/companies/[companyId]`: Vista detallada + métricas
3. Formularios de edición
4. Acciones batch (suspender, activar, etc.)

### Fase 4: Funcionalidades Avanzadas

1. Búsqueda avanzada con múltiples filtros
2. Exportar datos (CSV, Excel)
3. Gráficos y métricas (Chart.js/Recharts)
4. Notificaciones en tiempo real
5. Configuración de permisos granular

### Fase 5: Despliegue

1. Configurar Vercel para apps/admin
2. Variables de entorno en producción
3. Dominio: admin.verifactu.business
4. SSL y seguridad
5. Monitoreo y alertas

## 🔍 Testing

### Checklist Pre-Producción

- [ ] OAuth login funciona
- [ ] Middleware bloquea no autenticados
- [ ] Middleware bloquea USER role
- [ ] Impersonación crea cookie correcta
- [ ] Impersonación expira después de 8h
- [ ] Audit log se crea correctamente
- [ ] Banner aparece durante impersonación
- [ ] Stop impersonation limpia cookie
- [ ] APIs requieren autenticación
- [ ] APIs requieren ADMIN/SUPPORT role

### Comandos de Test

```bash
# Instalar dependencias (cerrar servidores dev primero)
pnpm install

# Type checking
pnpm --filter @verifactu/admin type-check

# Linting
pnpm --filter @verifactu/admin lint

# Desarrollo
pnpm --filter @verifactu/admin dev
# Abrir: http://localhost:3003
```

## 📚 Referencias

- [NextAuth Documentation](https://next-auth.js.org)
- [Jose JWT Library](https://github.com/panva/jose)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OWASP Security Guidelines](https://owasp.org)

---

**Estado**: ✅ MVP Completo - Listo para conectar base de datos  
**Autor**: GitHub Copilot  
**Fecha**: 21 Enero 2026
