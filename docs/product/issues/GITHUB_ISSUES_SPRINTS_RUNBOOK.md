# GitHub Issues Sprint Pack Runbook

Este runbook crea labels, milestones e issues de Sprint 0-3 con dependencias en el cuerpo.

## Script

- `scripts/github/create_sprint_issues.sh`

## Requisitos

1. Tener `gh` instalado.
2. Estar autenticado:

```bash
gh auth login
```

## Uso

### 1) Dry run (no crea nada)

```bash
scripts/github/create_sprint_issues.sh dry-run
```

### 2) Aplicar (crea labels, milestones e issues)

```bash
scripts/github/create_sprint_issues.sh apply
```

## Notas

- El script usa el repo activo de `gh repo view`.
- Si un label o milestone ya existe, lo reutiliza.
- Las dependencias se dejan en texto dentro del cuerpo (`Depends on ...` / `Blocked by ...`).
- Si queréis enlazar issues por `#id`, cread primero todos y luego haced una pasada rápida editando esas líneas.

## Mapping con ISSUE_TEMPLATE/feature_request.md

Cada issue generado sigue la estructura:

- `Description`
- `Problem It Solves`
- `Proposed Solution`
- `Additional Context`
- `Checklist`
- `Acceptance Criteria`

Esto respeta los campos de la plantilla de Feature Request actual.
