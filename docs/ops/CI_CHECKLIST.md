# Checklist mínimo de CI (Verifactu Monorepo)

## Objetivo

Asegurar que el entorno de Integración Continua está activo y en verde antes de tocar despliegues o reestructuración.

## 1) Workflows presentes

- Existe la carpeta .github/workflows.
- Los workflows clave están visibles:
  - ci-cd.yml
  - typecheck.yml
  - build-admin.yml

## 2) Estado del último run en main

- En GitHub Actions, el último run de main debe estar en verde.
- Si hay un run fallido, revisa el job exacto y corrige antes de continuar.

## 3) Checks obligatorios

- En Branch Protection de main, confirma que los checks obligatorios coinciden con:
  - Lint (ci-cd.yml)
  - Typecheck (typecheck.yml)
  - Build admin (build-admin.yml)

## 4) Compatibilidad local

- Verifica que pnpm y node estén en versiones compatibles.
- Si el repo usa turbo, confirma que no hay procesos colgados antes de lanzar tests.

## 5) Registro mínimo antes de cambios grandes

- Deja anotado en el PR o en el issue:
  - Último run verde
  - Hash del commit
  - Workflows que pasaron

## Estado rápido

- ✅ CI visible
- ✅ Workflows clave presentes
- ⬜ Último run en verde
- ⬜ Checks obligatorios confirmados
