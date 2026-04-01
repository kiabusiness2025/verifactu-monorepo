# Copilot Instructions - Verifactu Business Monorepo

## Proyecto

**Verifactu Business**: Plataforma SaaS para facturación y cumplimiento VeriFactu.

- **Repository**: kiabusiness2025/verifactu-monorepo
- **Default Branch**: main
- **Type**: Monorepo (pnpm workspaces)
- **Updated**: Febrero 2026

## Estructura del Monorepo

### Apps (`apps/`)

| App                   | Ruta       | Propósito                                 | Host                             |
| --------------------- | ---------- | ----------------------------------------- | -------------------------------- |
| **verifactu-app**     | `/app`     | App principal para clientes               | https://app.verifactu.business   |
| **verifactu-admin**   | `/admin`   | Panel de administración                   | https://admin.verifactu.business |
| **verifactu-landing** | `/landing` | Landing page + login                      | https://verifactu.business       |
| **verifactu-client**  | `/client`  | Panel alternativo cliente (en desarrollo) | N/A                              |
| **verifactu-mobile**  | `/mobile`  | App Flutter para móviles                  | N/A                              |

### Packages Compartidos (`packages/`)

| Package                     | Propósito                                        |
| --------------------------- | ------------------------------------------------ |
| **@verifactu/db**           | Prisma schema, migraciones, seeders              |
| **@verifactu/auth**         | Configuración auth (Firebase + NextAuth)         |
| **@verifactu/ui**           | Componentes reutilizables                        |
| **@verifactu/utils**        | Utilidades comunes                               |
| **@verifactu/integrations** | Integraciones (Holded, eInforma, Stripe, Resend) |
| **eslint-config**           | Configuración ESLint compartida                  |
| **typescript-config**       | Configuración TypeScript compartida              |

## Stack Técnico

### Frontend

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Styling**: Configurado en `@verifactu/ui`
- **UI Components**: Componentes reutilizables desde `packages/ui`

### Backend / API

- **API Routes**: Next.js API Routes
- **Authenticated Endpoints**: Con NextAuth + Firebase
- **AI/IA**: Genkit para Isaak
- **OCR/Documentos**: Procesamiento de facturas/comprobantes

### Base de Datos

- **ORM**: Prisma
- **Database**: PostgreSQL (Vercel Postgres)
- **Schema**: `packages/db/prisma/schema.prisma`
- **Migraciones**: `packages/db/prisma/migrations/`
- **Seed**: `packages/db/prisma/seed.ts`

### Autenticación

- **Firebase**: Para auth en app y client
- **NextAuth**: Para Google Workspace en admin
- **Session Management**: Backend persisted (app + admin)

### Cloud & DevOps

- **Hosted**: Vercel (apps web)
- **Backend API**: Vercel / server routes del monorepo
- **CI/CD**: GitHub Actions + Vercel
- **Deployments**: Vercel automático en push a main

### Email

- **Provider**: Resend
- **Admin Emails**: Newsletter, invitations, notifications

### Pagos

- **Provider**: Stripe
- **Ubicación**: Admin (suscripciones)

### IA - Isaak

- **Framework**: Genkit por Google
- **Características**:
  - Asistente proactivo en landing, app, client y admin
  - 3 personalidades: Amigable, Profesional, Directo
  - Memoria de conversaciones y contexto por usuario
  - Sugerencias automáticas por sección/dashboard
  - Arquitectura unificada con persistencia en backend
- **Endpoints**:
  - **App**: `/api/user/preferences` (guardar tono)
  - **Admin**: `/api/admin/preferences` (guardar tono)
  - **Client**: `/api/preferences` (con fallback por tenant)
  - **Landing**: Fallback local (visitante anónimo)
- **Docs**: `docs/engineering/ai/` y `docs/isaak/`

## Estructura de Directorios Clave

```
c:\dev\verifactu-monorepo\
├── apps/
│   ├── app/                    # App cliente principal
│   ├── admin/                  # Panel admin
│   ├── landing/                # Landing + login
│   ├── client/                 # Panel cliente alterno
│   └── mobile/                 # Flutter mobile
├── packages/
│   ├── db/                     # Prisma + migraciones
│   ├── auth/                   # Autenticacion
│   ├── ui/                     # Componentes compartidos
│   ├── utils/                  # Utilidades
│   ├── integrations/           # Integraciones externas
│   ├── eslint-config/
│   └── typescript-config/
├── docs/
│   ├── product/                # Docs de producto (features, planes)
│   ├── engineering/            # Docs técnicas (ai/, guides/)
│   ├── ops/                    # Operaciones (deployment, ci, setup)
│   ├── isaak/                  # Documentacion Isaak
│   └── legacy/                 # Docs antiguas
├── scripts/                    # Scripts automatizacion
├── infra/                      # Infraestructura
├── env/                        # Archivos ambiente
├── db/                         # DB local dev
├── brand/                      # Branding assets
└── pnpm-workspace.yaml         # Configuracion workspace
```

## Comandos Principales

### Instalación y Setup

```bash
pnpm install                    # Instalar todas las dependencias
pnpm -F @verifactu/db exec prisma migrate deploy    # Ejecutar migraciones
pnpm -F @verifactu/db exec prisma db seed            # Seed datos
```

### Desarrollo Local

```bash
pnpm --filter verifactu-app dev           # App (http://localhost:3000)
pnpm --filter verifactu-admin dev         # Admin (http://localhost:3003)
pnpm --filter verifactu-landing dev       # Landing
pnpm --filter verifactu-client dev        # Client
pnpm --filter verifactu-mobile dev        # Mobile (Flutter)
```

### Build

```bash
pnpm build              # Build todas las apps
pnpm test               # Ejecutar tests
```

### Database

```bash
pnpm -F @verifactu/db exec prisma studio         # Prisma Studio UI
pnpm -F @verifactu/db exec prisma migrate reset  # Reset DB (dev only)
```

## Variables de Entorno

Consultar en:

- `apps/admin/README.md` - Variables admin
- `apps/app/.env.example` - Variables app
- `apps/client/README.md` - Variables client
- `apps/landing/.env.example` - Variables landing

Incluyen: Firebase, Next Auth, Stripe, Resend, Holded, eInforma, Google Cloud, etc.

## Integraciones Externas

- **Holded**: Sincronización de empresas, facturación, cheques
- **eInforma**: Búsqueda y onboarding de empresas
- **Stripe**: Pagos y suscripciones (admin)
- **Resend**: Email transaccional
- **Firebase**: Autenticación y real-time en app/client
- **Google Workspace**: OAuth para admin

## Estado Actual (Febrero 2026)

✅ **Completado**

- Isaak unificado y proactivo en todas las plataformas (landing, app, client, admin)
- 3 personalidades de Isaak: Amigable, Profesional, Directo
- Persistencia de preferences en backend (app + admin)
- Fallback local para landing y client
- Guías demo/tour con prefill de preguntas para Isaak
- Panel cliente base funcional
- Admin con usuarios, empresas, dashboard

⏳ **En Progreso / Pendiente**

1. Completar paneles admin: suscripciones, emails, Vercel, soporte
2. Onboarding con eInforma y trial automático
3. Verificación de permisos y auditoría (admin/support)
4. Dashboard de app: "Acciones con Isaak" (API stub; conectar a tenants)
5. Mobile Flutter: completar setup

## Buenas Prácticas y Patrones

### Code Style

- **TypeScript**: Strict mode habilitado
- **ESLint**: Configuración compartida (`eslint-config`)
- **Formatting**: Prettier (si está configurado)
- **Imports**: Relative imports en features, absolute para packages

### Arquitectura

- **Feature-based structure** dentro de cada app
- **Shared packages** para código reutilizable
- **API Routes** para backend en Next.js (apps/app, apps/admin)
- **Auth middleware** en NextAuth + Firebase
- **Environment seguro**: Variables en `.env.local` (no commitar)

### Database

- **Migrations**: Una por cambio significativo
- **Seed**: Para datos iniciales y testing
- **Schema**: Single source of truth en `packages/db/prisma/schema.prisma`

### Testing

- **Framework**: Jest (configurado en root)
- **Ubicación**: `__tests__/` o `.test.ts`
- **Cobertura**: Preferida al menos 70%

### Git & CI/CD

- **Branch Protection**: Main branch protegida
- **CI**: GitHub Actions + Vercel
- **Deploy**: Automático en push a main (Vercel)
- **PRs**: Requeridos antes de merge a main

## Documentación Importante

- **[README.md](./README.md)** - Inicio rápido general
- **[docs/README.md](./docs/README.md)** - Índice de documentación
- **[docs/INDEX.md](./docs/INDEX.md)** - Índice completo
- **[docs/engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md](./docs/engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md)** - Arquitectura de Isaak
- **[docs/product/ISAAK_PLATFORM_SYNC_PLAN.md](./docs/product/ISAAK_PLATFORM_SYNC_PLAN.md)** - Plan de sync de Isaak
- **[docs/ops/deployment/VERCEL_DEPLOYMENT_GUIDE.md](./docs/ops/deployment/VERCEL_DEPLOYMENT_GUIDE.md)** - Guía Vercel
- **[SECURITY.md](./SECURITY.md)** - Políticas de seguridad

## Equipo y Contacto

- **Repositorio**: https://github.com/kiabusiness2025/verifactu-monorepo
- **Issues**: En GitHub (etiquetadas por sección: product, engineering, ops, isaak)
- **Deployment Status**: Vercel dashboard

## Notas Especiales

1. **Isaak es central**: Es la característica diferenciadora del producto. Siempre considera cómo un cambio afecta la experiencia de Isaak.

2. **Multi-tenant**: La app soporta múltiples tenants por usuario. Verificar always scope correcto de datos.

3. **Auth complejo**: 3 sistemas diferentes (Firebase en app/client, NextAuth en admin, anónimo en landing). Revisar el flujo específico antes de cambios.

4. **Vercel Postgres**: BD hosted. Verificar límites de conexiones en plan.

5. **Mobile pendiente**: Flutter en desarrollo; cuidado con cambios de API que impacten mobile.

6. **Docs vivas**: La documentación está en `docs/` y debe actualizarse con cambios importantes.

## Preguntas Frecuentes para Copilot

- "¿Dónde agrego un endpoint nuevo?": En `apps/{app}/src/app/api/{ruta}/route.ts`
- "¿Cómo agregar un campo a la DB?": Editar `packages/db/prisma/schema.prisma`, crear migration, ejecutar seed
- "¿Dónde está la lógica de Isaak?": En `apps/{app}/src/components/chat/` y `apps/{app}/src/app/api/chat/`
- "¿Cómo hacer un deploy?": Merge a main en GitHub, Vercel deploya automáticamente
- "¿Qué variables de ambiente necesito?": Consultar `.env.example` en cada app + respectivo `README.md`

---

**Última actualización**: Marzo 2026
