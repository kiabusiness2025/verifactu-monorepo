# Integridad Aplicación — Revisión rápida (sin tests)

Fecha: 2026-03-03

## Objetivo

Revisión de integridad transversal del monorepo sin ejecutar suites de test automatizadas.

## Comandos ejecutados

1. `pnpm -w run typecheck`
2. `pnpm -w run lint`
3. `pnpm -w run build`

## Resultado resumido

- Typecheck: ✅ OK (targets actuales de script raíz: `app` y `landing`).
- Lint: ❌ Falla en `apps/admin` y `apps/client` por opciones incompatibles de `next lint` con la versión de ESLint instalada.
- Build: ❌ Falla en `apps/client` por error de tipos Prisma en preferencias de Isaak.

## Hallazgos

### 1) Build bloqueado en `apps/client`

- Archivo: `apps/client/app/api/preferences/route.ts`
- Síntoma:
  - `Type error: ... 'isaakTone' does not exist in type 'UserPreferenceSelect<DefaultArgs>'`
- Impacto:
  - Rompe build global (`pnpm -w run build`) y pipelines de despliegue que compilan `apps/client`.

### 2) Lint bloqueado por migración pendiente de `next lint`

- Paquetes afectados:
  - `apps/admin`
  - `apps/client`
- Síntoma:
  - `Invalid Options: Unknown options: useEslintrc, extensions, resolvePluginsRelativeTo, rulePaths, ignorePath...`
- Causa probable:
  - Configuración legacy de `next lint` incompatible con la versión efectiva de ESLint/Next en entorno actual.

### 3) Coherencia de smoke de facturas

- Archivo: `scripts/smoke-pr-a.sh`
- Ajuste aplicado en esta revisión:
  - Se añade campo `number` en los 3 `POST /api/invoices` para cumplir esquema requerido.

## Priorización recomendada

1. **P0**: Alinear schema Prisma/cliente en `apps/client` para `isaakTone`.
2. **P1**: Migrar lint de apps Next a CLI ESLint actual (o ajustar versiones para compatibilidad).
3. **P1**: Ampliar `typecheck` raíz para cubrir también `admin`/`client` si se desea integridad total en pre-merge.

## Referencias

- Instrucciones operativas Isaak actualizadas:
  - `docs/engineering/ai/ISAAK_INSTRUCCIONES_OPERATIVAS_2026.md`
