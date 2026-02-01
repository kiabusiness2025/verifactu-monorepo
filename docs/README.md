# Documentacion Verifactu Business

## Indice rapido

### Comenzar aqui

- [README.md](../README.md) - Descripcion general del proyecto
- [ARQUITECTURA_UNIFICADA.md](root/ARQUITECTURA_UNIFICADA.md) - Arquitectura completa (Vercel + Firebase + Prisma)

### Autenticacion

**setup/**

- [setup/FIREBASE_CONSOLE_ACCESO.md](setup/FIREBASE_CONSOLE_ACCESO.md) - Acceso Firebase Console
- [setup/FIREBASE_AUTH_SETUP.md](setup/FIREBASE_AUTH_SETUP.md) - Autenticacion Firebase
- [setup/MULTI_TENANT_AUTH_SETUP.md](setup/MULTI_TENANT_AUTH_SETUP.md) - Multi-tenant setup

**root/**

- [root/FACEBOOK_OAUTH_SETUP.md](root/FACEBOOK_OAUTH_SETUP.md) - Facebook OAuth
- [../SECURITY.md](../SECURITY.md) - Politicas de seguridad

### Despliegue

**deployment/**

- [deployment/VERCEL_DEPLOYMENT_GUIDE.md](deployment/VERCEL_DEPLOYMENT_GUIDE.md) - Vercel
- [deployment/CLOUD_RUN_QUICK_REFERENCE.md](deployment/CLOUD_RUN_QUICK_REFERENCE.md) - Cloud Run
- [deployment/GITHUB_CLOUD_BUILD_SETUP.md](deployment/GITHUB_CLOUD_BUILD_SETUP.md) - CI/CD

**root/**

- [root/GOOGLE_CLOUD_RUN_IAM.md](root/GOOGLE_CLOUD_RUN_IAM.md) - Permisos IAM (opcional)

### GitHub y colaboracion

**root/**

- [root/PULL_REQUEST_WORKFLOW.md](root/PULL_REQUEST_WORKFLOW.md) - Flujo de PR (paso a paso)
- [root/BRANCH_PROTECTION_RULES.md](root/BRANCH_PROTECTION_RULES.md) - Reglas de proteccion
- [root/GITHUB_INTEGRATION.md](root/GITHUB_INTEGRATION.md) - Integracion GitHub + VS Code
- [root/GITHUB_PR_VSCODE_GUIDE.md](root/GITHUB_PR_VSCODE_GUIDE.md) - Usar PRs desde VS Code
- [root/GITHUB_CHEATSHEET.md](root/GITHUB_CHEATSHEET.md) - Referencia rapida
- [root/GITHUB_ACTIONS_GUIDE.md](root/GITHUB_ACTIONS_GUIDE.md) - Workflows y automatizacion
- [root/DEPENDABOT_GUIDE.md](root/DEPENDABOT_GUIDE.md) - Automatizacion de dependencias

### Flutter / Mobile

**setup/**

- [setup/FLUTTER_INSTALLATION_GUIDE.md](setup/FLUTTER_INSTALLATION_GUIDE.md) - Instalacion Flutter
- [setup/FLUTTER_SETUP.md](setup/FLUTTER_SETUP.md) - Setup del proyecto

**Mobile**

- [../apps/mobile/QUICK_START.md](../apps/mobile/QUICK_START.md) - Quick start

### Base de datos

**setup/**

- [setup/DB_SETUP_GUIDE.md](setup/DB_SETUP_GUIDE.md) - PostgreSQL + Prisma
- **Schema:** [../packages/db/prisma/schema.prisma](../packages/db/prisma/schema.prisma)

### AI / Genkit

**ai/**

- [ai/ISAAK_V3_QUICK_START.md](ai/ISAAK_V3_QUICK_START.md) - Quick start Genkit
- [ai/ISAAK_V3_TESTING_GUIDE.md](ai/ISAAK_V3_TESTING_GUIDE.md) - Testing
- [ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md](ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md) - Checklist

### Estado del proyecto

**root/**

- [root/PROJECT_STATUS.md](root/PROJECT_STATUS.md) - Estado actual
- [root/IMPLEMENTATION_STATUS.md](root/IMPLEMENTATION_STATUS.md) - Estado de implementacion
- [root/PROJECT_DELIVERABLES.md](root/PROJECT_DELIVERABLES.md) - Entregables

### Branding

**root/**

- [root/BRANDING.md](root/BRANDING.md) - Guia de branding
- [root/MANIFESTO.md](root/MANIFESTO.md) - Manifiesto de la marca

### Optimizacion

**optimization/**

- [optimization/LANDING_OPTIMIZATION_STATUS.md](optimization/LANDING_OPTIMIZATION_STATUS.md) - Performance
- [optimization/ACCESSIBILITY_AUDIT.md](optimization/ACCESSIBILITY_AUDIT.md) - Accesibilidad
- [optimization/IMAGE_OPTIMIZATION_GUIDE.md](optimization/IMAGE_OPTIMIZATION_GUIDE.md) - Imagenes

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
    app/        # App cliente (dashboard principal)
    client/     # App cliente alternativa o legacy (si aplica)
    admin/      # Backoffice / control tower
    landing/    # Marketing + login
    api/        # API backend (si aplica)
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
pnpm dev:admin      # http://localhost:3002 (o 3010)
```

---

## Tecnologias principales

Frontend: Next.js, TypeScript, Tailwind CSS  
Backend: Firebase, PostgreSQL, Prisma, Genkit  
Deployment: Vercel, Firebase, Google Cloud Run (opcional)

---

Ultima actualizacion: Febrero 2026
