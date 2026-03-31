# Índice de documentación

Entrada principal: [README.md](README.md)

## Proyectos publicos

- Proyecto publico 1: `verifactu.business` -> `apps/landing`
- Proyecto publico 2: `holded.verifactu.business` -> `apps/holded`
- Proyecto publico 3: `isaak.verifactu.business` -> `apps/isaak`

Comparten backend y plataforma, pero deben mantenerse separados en marca, URLs públicas, variables públicas y documentación operativa.

## Estructura

### Producto — `docs/product/`

- Features implementadas, planes, presupuestos, gastos, facturas, integraciones
- Reordenacion de producto y ownership: `docs/product/ISAAK_PRODUCT_REORDER_PLAN_2026.md`
- Arquitectura de sync Isaak: `docs/product/ISAAK_PLATFORM_SYNC_PLAN.md`
- Conexiones compartidas Holded: `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- Alcance de APIs Holded para facturacion y contabilidad: `docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md`
- Review publica OpenAI: `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- Deploy + QA publica Isaak for Holded: `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- Demo: `docs/product/DEMO_FLOW.md`, `docs/product/DEMO_QA_CHECKLIST.md`
- Precios: `docs/product/pricing/`
- Onboarding: `docs/product/onboarding/`
- Issues/sprints: `docs/product/issues/`

### Ingeniería — `docs/engineering/`

- Guías de desarrollo: `docs/engineering/guides/` (migraciones, git, prisma, TypeScript, eslint...)
- Revisiones y métricas: `docs/engineering/reviews/` (fases, integridad, sesiones)
- Optimizaciones: `docs/engineering/optimization/`
- IA / Isaak técnico: `docs/engineering/ai/`

### Operaciones — `docs/ops/`

- Despliegue: `docs/ops/deployment/` (Vercel, Cloud Run, branch protection...)
- Email: `docs/ops/email/` (configuración, aliases, mailbox...)
- Runbooks: `docs/ops/runbooks/`
  - Identidad admin: `docs/ops/runbooks/ADMIN_USER_IDENTITY_RULES.md`
  - Deploy publico Isaak for Holded: `docs/ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md`
  - Vercel stale commit: `docs/ops/runbooks/VERCEL_STALE_COMMIT_AND_BODYINIT.md`
  - Onboarding empresa: `docs/ops/runbooks/ONBOARDING_ADD_COMPANY_FLOW.md`
- CI: `docs/ops/CI_CHECKLIST.md`
- Setup: `docs/ops/setup/`

### Isaak — `docs/isaak/`

- Sistema de soporte: `docs/isaak/ISAAK_SUPPORT_SYSTEM.md`
- Auto-fix: `docs/isaak/ISAAK_AUTO_FIX.md`
- Esquemas de gastos: `docs/isaak/expense_schema.md`, `docs/isaak/expense_schema_v2.md`
- Guía MCP: `docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md`
- Regresion demo Holded: `docs/engineering/ai/HOLDED_DEMO_REGRESSION.md`
- Instrucciones operativas 2026: `docs/engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md`

### Histórico — `docs/legacy/`
