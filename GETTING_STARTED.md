# 📖 GUÍA DE INICIO RÁPIDO - GitHub Collaboration Setup

Bienvenido a Verifactu.business. Este documento te guía a través del sistema de GitHub configurado.

---

## ⚡ Comienza en 5 Minutos

### Paso 1: Lee la Cheat Sheet
📄 Abre: [`docs/GITHUB_CHEATSHEET.md`](docs/GITHUB_CHEATSHEET.md)
⏱️ Tiempo: 5 minutos
✅ Aprende: Comandos básicos, atajos, troubleshooting

### Paso 2: Crea Tu Primer Feature Branch
```bash
git checkout -b feature/my-feature
```

### Paso 3: Haz Un Cambio
Edita cualquier archivo, guarda.

### Paso 4: Commit y Push
```bash
git add .
git commit -m "feat: description"
git push origin feature/my-feature
```

### Paso 5: Crea Pull Request
**Opción A (Recomendado):** VS Code
- Presiona Ctrl+Shift+P
- Escribe "Create Pull Request"
- Presiona Enter

**Opción B:** GitHub Web
- Visita: https://github.com/kiabusiness2025/verifactu-monorepo
- Click "Compare & pull request"

**Opción C:** GitHub CLI
```bash
gh pr create
```

### Paso 6: Espera a que GitHub Actions Termine
- ¡Automático! No hay nada que hacer
- Los 5 checks corren en paralelo (12-15 min total)

### Paso 7: Tu PR Está Lista ✅
- Verde: Listo para revisar
- Roja: Hay errores, arregla y push de nuevo

---

## 📚 Documentación Disponible

### Inicio Rápido (< 15 min)
1. 📄 [`docs/GITHUB_CHEATSHEET.md`](docs/GITHUB_CHEATSHEET.md) - Referencia rápida
2. 📄 [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) - Resumen del proyecto

### GitHub & Colaboración (30 min)
1. 📄 [`docs/PULL_REQUEST_WORKFLOW.md`](docs/PULL_REQUEST_WORKFLOW.md) - Ciclo de vida de PR (paso a paso)
2. 📄 [`docs/GITHUB_INTEGRATION.md`](docs/GITHUB_INTEGRATION.md) - Integración GitHub completa
3. 📄 [`docs/GITHUB_PR_VSCODE_GUIDE.md`](docs/GITHUB_PR_VSCODE_GUIDE.md) - Usar PRs en VS Code
4. 📄 [`docs/BRANCH_PROTECTION_RULES.md`](docs/BRANCH_PROTECTION_RULES.md) - Reglas de protección
5. 📄 [`GITHUB_WORKFLOW_ARCHITECTURE.md`](GITHUB_WORKFLOW_ARCHITECTURE.md) - Diagramas visuales

### Automatización (30 min)
1. 📄 [`docs/GITHUB_ACTIONS_GUIDE.md`](docs/GITHUB_ACTIONS_GUIDE.md) - CI/CD Workflows
2. 📄 [`docs/DEPENDABOT_GUIDE.md`](docs/DEPENDABOT_GUIDE.md) - Actualizaciones automáticas

### Desarrollo (45 min)
1. 📄 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) - Setup & comandos
2. 📄 [`docs/DEBUGGING_GUIDE.md`](docs/DEBUGGING_GUIDE.md) - Debugging
3. 📄 [`docs/WORKFLOW_DEVKIT_GUIDE.md`](docs/WORKFLOW_DEVKIT_GUIDE.md) - Workflows

---

## 🎯 Basándote en tu Rol

### Soy Developer Nuevo
📋 Lectura recomendada (30 min):
1. GITHUB_CHEATSHEET.md (5 min)
2. PROJECT_SUMMARY.md (10 min)
3. DEVELOPMENT.md (10 min)
4. Practica: Crea un PR dummy

### Soy Code Reviewer
📋 Lectura recomendada (45 min):
1. GITHUB_CHEATSHEET.md (5 min)
2. PULL_REQUEST_WORKFLOW.md (10 min)
3. GITHUB_ACTIONS_GUIDE.md (20 min)
4. BRANCH_PROTECTION_RULES.md (10 min)

### Soy DevOps
📋 Lectura recomendada (2 hours):
1. GITHUB_INTEGRATION.md (15 min)
2. GITHUB_ACTIONS_GUIDE.md (30 min)
3. DEPENDABOT_GUIDE.md (20 min)
4. GITHUB_WORKFLOW_ARCHITECTURE.md (20 min)
5. Explora: .github/ folder

---

## 🎯 Flujo de Trabajo Típico

```
1️⃣ CREAR RAMA
git checkout -b feature/email-templates

2️⃣ HACER CAMBIOS
- Edita archivos
- Pre-commit hooks corren automáticamente (ESLint, Prettier)

3️⃣ COMMIT
git add .
git commit -m "feat: add email templates"
# Automáticamente:
# - ESLint lint
# - Prettier format
# - No commit si hay errores

4️⃣ PUSH
git push origin feature/email-templates

5️⃣ CREAR PR
Ctrl+Shift+P → "Create Pull Request" en VS Code

6️⃣ LLENAR TEMPLATE
- Descripción
- Tipo (Feature/Bug/Refactor)
- Testing notes
- Checklist

7️⃣ GITHUB ACTIONS CORRE (12-15 min)
┌─────────────────┐
│ Lint (2 min)    │  ESLint
├─────────────────┤
│ TypeCheck (3m)  │  TypeScript strict
├─────────────────┤
│ Build (5 min)   │  Next.js build
├─────────────────┤
│ Test (2 min)    │  Jest tests
├─────────────────┤
│ Deploy (2 min)  │  Vercel preview
└─────────────────┘

8️⃣ ESPERAR REVIEW
@kiabusiness2025 automáticamente asignado

9️⃣ RESPONDER FEEDBACK
Si hay comentarios:
- Lee comentario
- Responde en PR
- Click "Resolve" cuando arreglado

🔟 MERGE
- Click "Merge Pull Request"
- Selecciona "Squash and merge" (recomendado)
- Auto-deploy a Vercel en 2 minutos

✅ DONE! 
- PR merged
- Branch deleted
- Live en producción
```

---

## 🚨 Errores Comunes y Soluciones

### "Can't merge PR"
**Solución:**
1. Ver qué check falló (rojo en PR)
2. Click en check fallido
3. Ver logs
4. Arreglar localmente
5. Git push de nuevo
6. Checks rerun automáticamente

Checklist de resolución:
- [ ] Lint passed (ESLint)
- [ ] TypeCheck passed (TypeScript)
- [ ] Build passed (Next.js)
- [ ] Tests passed (Jest)
- [ ] Deploy passed (Vercel)
- [ ] Code owner approved (@kiabusiness2025)
- [ ] Comments resolved

### "No veo el PR Template"
**Solución:**
1. Cierra VS Code
2. Abre de nuevo
3. Ctrl+Shift+P → "Reload Window"
4. Intenta de nuevo

### "Pre-commit hook error"
**Solución:**
La mayoría de errores son auto-arreglados por ESLint y Prettier:
```bash
git add .
git commit -m "feat: description"
# Si falla: ESLint/Prettier estan arreglando
# Re-try:
git add .
git commit -m "feat: description"
# Ahora debe pasar
```

Si sigue fallando:
```bash
pnpm lint --fix
pnpm format
git add .
git commit -m "feat: description"
```

---

## 📊 Sistema Configurado

### GitHub Features Activas ✅
- ✅ PR Templates (auto-filled)
- ✅ Code Owners (@kiabusiness2025)
- ✅ GitHub Actions (5 CI/CD jobs)
- ✅ Dependabot (weekly updates)
- ✅ Issue Templates (Bug + Feature)
- ✅ Branch Protection (ready to enable)

### Development Tools ✅
- ✅ ESLint (30+ rules)
- ✅ TypeScript (strict mode)
- ✅ Dev Containers (Node 20)
- ✅ Docker Compose (PostgreSQL, Redis)
- ✅ VS Code Debugging (4 configs)
- ✅ Makefile (25+ commands)
- ✅ Pre-commit Hooks (Husky + lint-staged)

---

## 🆘 Necesito Ayuda

### Quick Links
| Problema | Solución |
|----------|----------|
| No sé qué hacer | Lee GITHUB_CHEATSHEET.md |
| PR no mergea | Ve BRANCH_PROTECTION_RULES.md |
| Check falló | Ve GITHUB_ACTIONS_GUIDE.md |
| Debugging | Ve DEBUGGING_GUIDE.md |
| Setup completo | Lee DEVELOPMENT.md |

### Documentación Completa
👉 Ver: [`docs/README.md`](docs/README.md)

---

## ✅ Verificar Setup

Corre estos comandos para verificar todo está funcional:

```bash
# 1. Verifica Node.js
node --version
# Output: v20+

# 2. Verifica pnpm
pnpm --version
# Output: 10+

# 3. Verifica ESLint
pnpm lint --version
# Output: ESLint 9+

# 4. Verifica TypeScript
pnpm typecheck
# Output: 0 errors

# 5. Verifica Git Hooks
ls -la .husky/
# Output: pre-commit file exists

# 6. Verifica Docker
docker --version
# Output: Docker 20+

# 7. Verifica GitHub Auth
gh auth status
# Output: Logged in as @your-username
```

---

## 🚀 Próximos Pasos

### Hoy (30 min)
- [ ] Leer GITHUB_CHEATSHEET.md
- [ ] Crear feature branch
- [ ] Hacer cambio pequeño
- [ ] Crear PR
- [ ] Ver GitHub Actions correr

### Esta Semana (1-2 hours)
- [ ] Leer PULL_REQUEST_WORKFLOW.md
- [ ] Leer GITHUB_ACTIONS_GUIDE.md
- [ ] Revisar un PR existente
- [ ] Mergear un PR

### Este Mes (2-3 hours)
- [ ] Leer toda documentación
- [ ] Practicar todos los roles
- [ ] Configurar branch protection
- [ ] Team session explicando flujo

---

## 📞 Contacto

- **Email:** kiabusiness2025@gmail.com
- **Repository:** https://github.com/kiabusiness2025/verifactu-monorepo
- **Documentación:** `/docs` folder

---

## 🎉 ¡Bienvenido!

Estás listo para contribuir a Verifactu.business.

**Próximo paso:** Leer [`docs/GITHUB_CHEATSHEET.md`](docs/GITHUB_CHEATSHEET.md) (5 minutos)

---

**Última actualización:** January 2026  
**Status:** ✅ READY TO USE
