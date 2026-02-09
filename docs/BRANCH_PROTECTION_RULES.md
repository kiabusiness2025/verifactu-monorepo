# GitHub Branch Protection Rules

Este documento describe las reglas de protección de ramas configuradas en Verifactu.

## Main Branch Protection

### ✓ Reglas Aplicadas

1. **Require pull request reviews before merging**
   - Required number of approvals: 1
   - Dismiss stale PR approvals: YES
   - Require review from code owners: YES

2. **Require status checks to pass before merging**
   - Required checks:
       - Pre-Deployment Validation / Validate App Build
       - Pre-Deployment Validation / Validate Landing Build
       - Build Check - Admin Panel / Build Admin Panel
   - Require branches to be up to date: YES

3. **Require code owner review**
   - ✓ Enforced for pull requests affecting `CODEOWNERS`

4. **Require conversation resolution before merging**
   - ✓ All conversations must be resolved

5. **Require branches to be up to date before merging**
   - ✓ Enabled

6. **Restrict who can push to matching branches**
   - Dismiss pull request review upon new commits: NO
   - Require linear history: YES

### 🚫 What This Prevents

- ❌ Direct commits to `main` (must use PR)
- ❌ Merging failing builds
- ❌ Merging without approvals
- ❌ Merging without code owner review
- ❌ Merging with unresolved conversations
- ❌ Merging with outdated branches

---

## Develop Branch Protection

### ✓ Reglas Aplicadas (Menos Restrictivas)

1. **Require pull request reviews before merging**
   - Required number of approvals: 1
   - Require review from code owners: NO

2. **Require status checks to pass before merging**
   - Required checks:
   - Pre-Deployment Validation / Validate App Build
   - Pre-Deployment Validation / Validate Landing Build
   - Build Check - Admin Panel / Build Admin Panel

3. **Allow force pushes**: NO
4. **Allow deletions**: NO

---

## Configurar en GitHub

Para aplicar estas reglas:

1. Ve a: **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Pattern: `main`
4. Habilita las opciones descritas arriba
5. Click **Create**

Repite para `develop` con opciones menos restrictivas.

---

## PR Checklist para Developers

Antes de hacer merge de un PR a `main`:

- [ ] Todos los checks de GitHub Actions pasaron
- [ ] Al menos 1 aprobación de code owner
- [ ] Branch está up to date con main
- [ ] Todas las conversations están resueltas
- [ ] ESLint y TypeScript sin errores
- [ ] Tests pasaron con cobertura
- [ ] Documentación actualizada
- [ ] Sin breaking changes sin justificación

---

## Bypass de Protecciones

En casos excepcionales, solo administradores pueden:
- Forzar merge sin aprobaciones
- Mergear builds fallidos
- Forzar push a main

**Requerimiento**: Justificación en el PR antes de bypass.

---

## Workflow Recomendado

```
feature/my-feature
       ↓
git push
       ↓
GitHub crea PR
       ↓
GitHub Actions ejecuta checks
       ↓
Code owner revisa y aprueba
       ↓
Developer mergea
       ↓
Auto-deploy a Vercel (si es main)
```

---

Última actualización: Enero 2026
