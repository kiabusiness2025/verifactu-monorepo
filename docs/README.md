# Documentacion Verifactu Business

## Indice rapido

## Proyectos publicos

- Proyecto publico 1: `verifactu.business` -> `apps/landing`
- Proyecto publico 2: `holded.verifactu.business` -> `apps/holded`
- Proyecto publico 3: `isaak.verifactu.business` -> `apps/isaak`

Todos comparten backend y piezas de plataforma, pero la documentacion debe tratarlos como experiencias publicas distintas.

### Comenzar aqui

- [README.md](../README.md) - Descripcion general del proyecto
- [../apps/landing/README.md](../apps/landing/README.md) - Proyecto publico verifactu.business
- [../apps/holded/README.md](../apps/holded/README.md) - Proyecto publico Holded
- [../apps/isaak/README.md](../apps/isaak/README.md) - Proyecto publico Isaak
- [../apps/client/README.md](../apps/client/README.md) - Panel cliente y persistencia de Isaak
- [product/OPERATIVE_CHECKLIST_ACCOUNTING_API_2026.md](product/OPERATIVE_CHECKLIST_ACCOUNTING_API_2026.md) - Checklist operativo unificado (planes, app, backend, datos, QA)
- [product/ISAAK_PRODUCT_REORDER_PLAN_2026.md](product/ISAAK_PRODUCT_REORDER_PLAN_2026.md) - Reordenacion del monorepo: Isaak como producto principal, Holded como entrada y app como core
- [product/ISAAK_PLATFORM_SYNC_PLAN.md](product/ISAAK_PLATFORM_SYNC_PLAN.md) - Arquitectura objetivo de Isaak, ownership de datos y fases de sync
- [product/ISAAK_HOLDED_SHARED_CONNECTIONS.md](product/ISAAK_HOLDED_SHARED_CONNECTIONS.md) - Arquitectura de conexion compartida Holded para app interna, app publica y dashboard
- [product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md](product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md) - Alcance oficial de APIs Holded a implementar para facturacion, contabilidad y acciones operativas desde Isaak
- [product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md](product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md) - Checklist y alcance para preparar la app publica de OpenAI
- [product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md](product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md) - Checklist operativa para desplegar y probar el flujo publico holded-first
- [product/ISAAK_FOR_HOLDED_STATUS_2026-03-19.md](product/ISAAK_FOR_HOLDED_STATUS_2026-03-19.md) - Estado operativo, incidente final y decisiones de producto de Isaak for Holded
- [INTEGRITY_REVIEW_2026-03-03.md](INTEGRITY_REVIEW_2026-03-03.md) - Revisión de integridad sin tests (estado actual)
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
- [ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md](ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md) - Runbook breve para desplegar y validar Isaak for Holded

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

- [engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md](engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md) - Setup operativo de Isaak for Holded via MCP + OAuth
- [engineering/ai/ISAAK_PERSONA_PLAYBOOK_2026.md](engineering/ai/ISAAK_PERSONA_PLAYBOOK_2026.md) - Plan para que Isaak responda como Isaak y no como un asistente generico
- [engineering/ai/ISAAK_MEMORY_ARCHITECTURE_2026.md](engineering/ai/ISAAK_MEMORY_ARCHITECTURE_2026.md) - Arquitectura de memoria privada de Isaak: conversaciones, facts, documentos y retrieval
- [engineering/ai/ISAAK_V3_QUICK_START.md](engineering/ai/ISAAK_V3_QUICK_START.md) - Quick start Genkit
- [engineering/ai/ISAAK_V3_TESTING_GUIDE.md](engineering/ai/ISAAK_V3_TESTING_GUIDE.md) - Testing
- [engineering/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md](engineering/ai/ISAAK_V3_IMPLEMENTATION_CHECKLIST.md) - Checklist
- [engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md](engineering/ai/ISAAK_UNIFIED_EXPERIENCE_2026.md) - Isaak proactivo en landing, cliente y admin
- [engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md](engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md) - Auth, endpoints y runbook operativo 2026

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
    landing/    # Proyecto publico 1 -> verifactu.business
    holded/     # Proyecto publico 2 -> holded.verifactu.business
    isaak/      # Proyecto publico 3 -> isaak.verifactu.business
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
pnpm --filter verifactu-app dev
pnpm --filter verifactu-landing dev
pnpm --filter verifactu-holded dev
pnpm --filter verifactu-isaak dev
pnpm --filter verifactu-admin dev
```

## Rutas y paneles

- Proyecto publico 1: https://verifactu.business
- Proyecto publico 2: https://holded.verifactu.business
- Proyecto publico 3: https://isaak.verifactu.business
- Panel de Cliente: https://app.verifactu.business
- Panel de Admin: https://admin.verifactu.business
- /dashboard/admin en apps/app redirige al admin nuevo.

---

## Tecnologias principales

Frontend: Next.js, TypeScript, Tailwind CSS  
Backend: Firebase, PostgreSQL, Prisma, Genkit  
Deployment: Vercel, Firebase, Google Cloud Run (opcional)

---

Ultima actualizacion: Marzo 2026
