# Documentacion Verifactu Business

## Indice rapido

### Comenzar aqui

- [README.md](../README.md) - Descripcion general del proyecto
- [ARQUITECTURA_UNIFICADA.md](legacy/root/ARQUITECTURA_UNIFICADA.md) - Arquitectura completa (Vercel + Firebase + Prisma)

### Autenticacion

**ops/setup/**

- [ops/setup/FIREBASE_CONSOLE_ACCESO.md](ops/setup/FIREBASE_CONSOLE_ACCESO.md) - Acceso Firebase Console
- [ops/setup/FIREBASE_AUTH_SETUP.md](ops/setup/FIREBASE_AUTH_SETUP.md) - Autenticacion Firebase
- [ops/setup/MULTI_TENANT_AUTH_SETUP.md](ops/setup/MULTI_TENANT_AUTH_SETUP.md) - Multi-tenant setup

**legacy/root/**

- [legacy/root/FACEBOOK_OAUTH_SETUP.md](legacy/root/FACEBOOK_OAUTH_SETUP.md) - Facebook OAuth
- [../SECURITY.md](../SECURITY.md) - Politicas de seguridad

### Despliegue

**ops/deployment/**

- [ops/deployment/VERCEL_DEPLOYMENT_GUIDE.md](ops/deployment/VERCEL_DEPLOYMENT_GUIDE.md) - Vercel
- [ops/deployment/CLOUD_RUN_QUICK_REFERENCE.md](ops/deployment/CLOUD_RUN_QUICK_REFERENCE.md) - Cloud Run
- [ops/deployment/GITHUB_CLOUD_BUILD_SETUP.md](ops/deployment/GITHUB_CLOUD_BUILD_SETUP.md) - CI/CD
- [ops/CI_CHECKLIST.md](ops/CI_CHECKLIST.md) - Checklist mínimo de CI

**legacy/root/**

- [legacy/root/GOOGLE_CLOUD_RUN_IAM.md](legacy/root/GOOGLE_CLOUD_RUN_IAM.md) - Permisos IAM (opcional)

### GitHub y colaboracion

**legacy/root/**

- [legacy/root/PULL_REQUEST_WORKFLOW.md](legacy/root/PULL_REQUEST_WORKFLOW.md) - Flujo de PR (paso a paso)
- [legacy/root/BRANCH_PROTECTION_RULES.md](legacy/root/BRANCH_PROTECTION_RULES.md) - Reglas de proteccion
- [legacy/root/GITHUB_INTEGRATION.md](legacy/root/GITHUB_INTEGRATION.md) - Integracion GitHub + VS Code
- [legacy/root/GITHUB_PR_VSCODE_GUIDE.md](legacy/root/GITHUB_PR_VSCODE_GUIDE.md) - Usar PRs desde VS Code
- [legacy/root/GITHUB_CHEATSHEET.md](legacy/root/GITHUB_CHEATSHEET.md) - Referencia rapida
- [legacy/root/GITHUB_ACTIONS_GUIDE.md](legacy/root/GITHUB_ACTIONS_GUIDE.md) - Workflows y automatizacion
- [legacy/root/DEPENDABOT_GUIDE.md](legacy/root/DEPENDABOT_GUIDE.md) - Automatizacion de dependencias

### Flutter / Mobile

**ops/setup/**

- [ops/setup/FLUTTER_INSTALLATION_GUIDE.md](ops/setup/FLUTTER_INSTALLATION_GUIDE.md) - Instalacion Flutter
- [ops/setup/FLUTTER_SETUP.md](ops/setup/FLUTTER_SETUP.md) - Setup del proyecto

**Mobile**

- [../apps/mobile/QUICK_START.md](../apps/mobile/QUICK_START.md) - Quick start

### Base de datos

**ops/setup/**

- [ops/setup/DB_SETUP_GUIDE.md](ops/setup/DB_SETUP_GUIDE.md) - PostgreSQL + Prisma
- **Schema:** [../packages/db/prisma/schema.prisma](../packages/db/prisma/schema.prisma)

### AI / Genkit

**engineering/ai/**

- [engineering/ai/ISAAK_V3_QUICK_START.md](engineering/ai/ISAAK_V3_QUICK_START.md) - Quick start Genkit
- [engineering/ai/ISAAK_V3_TESTING_GUIDE.md](engineering/ai/ISAAK_V3_TESTING_GUIDE.md) - Testing
- [engineering/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md](engineering/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md) - Checklist

### Estado del proyecto

**legacy/root/**

- [legacy/root/PROJECT_STATUS.md](legacy/root/PROJECT_STATUS.md) - Estado actual
- [legacy/root/IMPLEMENTATION_STATUS.md](legacy/root/IMPLEMENTATION_STATUS.md) - Estado de implementacion
- [legacy/root/PROJECT_DELIVERABLES.md](legacy/root/PROJECT_DELIVERABLES.md) - Entregables

### Branding

**legacy/root/**

- [legacy/root/BRANDING.md](legacy/root/BRANDING.md) - Guia de branding
- [legacy/root/MANIFESTO.md](legacy/root/MANIFESTO.md) - Manifiesto de la marca

### Optimizacion

**engineering/optimization/**

- [engineering/optimization/LANDING_OPTIMIZATION_STATUS.md](engineering/optimization/LANDING_OPTIMIZATION_STATUS.md) - Performance
- [engineering/optimization/ACCESSIBILITY_AUDIT.md](engineering/optimization/ACCESSIBILITY_AUDIT.md) - Accesibilidad
- [engineering/optimization/IMAGE_OPTIMIZATION_GUIDE.md](engineering/optimization/IMAGE_OPTIMIZATION_GUIDE.md) - Imagenes

### Archivos legados

**legacy/**

- Implementaciones tempranas
- Configuraciones obsoletas
- Guias deprecadas

---

## Estructura del proyecto

```
verifactu-monorepo/
  apps/
    app/        # App cliente (dashboard principal) -> /app
    client/     # App cliente alternativa o legacy (si aplica)
    admin/      # Backoffice / control tower -> /admin
    landing/    # Marketing + login
    api/        # API backend (si aplica, no tocar)
    mobile/     # Flutter
  packages/
    ui/         # UI compartida
    utils/      # Utilidades compartidas
    db/         # Prisma + acceso DB
    auth/       # Auth helpers
    integrations/ # Integraciones externas
    eslint-config/
    typescript-config/
  docs/         # Documentacion
  scripts/      # Scripts de desarrollo
  brand/        # Assets de branding
  ops/          # Operaciones
```

---

## Inicio rapido (Web)

```bash
pnpm install
pnpm dev:app        # http://localhost:3000
pnpm dev:landing    # http://localhost:3001
pnpm dev:admin      # http://localhost:3003

## Rutas y paneles

- Panel de Cliente: https://app.verifactu.business
- Panel de Admin: https://admin.verifactu.business
- /dashboard/admin en apps/app redirige al admin nuevo.
```

---

## Tecnologias principales

Frontend: Next.js, TypeScript, Tailwind CSS  
Backend: Firebase, PostgreSQL, Prisma, Genkit  
Deployment: Vercel, Firebase, Google Cloud Run (opcional)

---

Ultima actualizacion: Febrero 2026
