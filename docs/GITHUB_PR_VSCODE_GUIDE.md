# GitHub Pull Requests en VS Code

## 📦 Instalación de la Extensión

### Opción 1: Automática
La extensión **GitHub Pull Requests** viene preinstalada en VS Code. Si no la tienes:

1. Abre VS Code
2. Ve a **Extensions** (Ctrl+Shift+X)
3. Busca "GitHub Pull Requests and Issues"
4. Haz click en **Install**

### Opción 2: Desde Terminal
```bash
code --install-extension GitHub.vscode-pull-request-github
```

---

## 🔐 Autenticación

### Primera vez
1. Abre la Command Palette (Ctrl+Shift+P)
2. Busca "GitHub: Sign in"
3. Haz click para iniciar sesión en GitHub
4. Se abrirá navegador para autorización
5. VS Code se conectará automáticamente

### Verificar Autenticación
En la barra lateral, verás un ícono de GitHub. Si ves tu usuario, estás autenticado ✓

---

## 🔍 Uso Básico

### Ver Pull Requests

**Opción 1: Panel Lateral**
1. Click en el ícono de GitHub (lado izquierdo)
2. Verás:
   - **Pull Requests**: PRs asignadas a ti
   - **Issues**: Issues asignadas a ti
   - **Repositories**: Tus repositorios

**Opción 2: Command Palette**
- Ctrl+Shift+P → "GitHub: View Pull Requests"

### Crear Pull Request

```bash
# 1. Crea rama y haz commits
git checkout -b feature/my-feature
git add .
git commit -m "feat: description"

# 2. Push
git push origin feature/my-feature

# 3. VS Code muestra opción en Command Palette
Ctrl+Shift+P → "GitHub: Create Pull Request"

# 4. O en panel lateral, click "Create PR"
```

### Revisar PR

1. Abre PR desde panel lateral
2. Verás:
   - **Overview**: Descripción, estado, checks
   - **Changes**: Diff de archivos
   - **Timeline**: Comentarios y eventos
   - **Checks**: Estado de GitHub Actions

### Comentar en PR

En la pestaña **Changes**:
1. Hover sobre línea de código
2. Click en **+** para comentar
3. Escribe comentario
4. Click **Comment** o **Start Review**

### Aprobar o Solicitar Cambios

En la pestaña **Overview**:
1. Click **Review Changes** (arriba a la derecha)
2. Selecciona:
   - ✓ **Approve**: Aprueba la PR
   - 💬 **Comment**: Comenta sin aprobar
   - 🚫 **Request Changes**: Solicita cambios
3. Click **Submit**

---

## 🎯 Flujo Completo en VS Code

### 1. Crear Feature Branch
```bash
git checkout -b feature/my-feature
```

### 2. Hacer Cambios
- Edita archivos
- ESLint se ejecuta automáticamente
- Guarda (Ctrl+S)

### 3. Commit
```bash
git add .
git commit -m "feat: description"
```

### 4. Push
```bash
git push origin feature/my-feature
```

### 5. Crear PR
- Command Palette: "GitHub: Create Pull Request"
- O espera notificación de VS Code
- Rellena template de PR
- Click **Create**

### 6. Ver Estado
- Panel lateral muestra estado
- GitHub Actions ejecuta checks automáticamente
- Verás ✓ o ❌ en cada check

### 7. Recibir Review
- Notificación cuando reviewer comenta
- Puedes responder directamente en VS Code
- Ver comentarios en **Timeline**

### 8. Hacer Cambios si se Solicitan
```bash
git add .
git commit -m "fix: address review feedback"
git push
# Checks rerun automáticamente
```

### 9. Merge
- Una vez aprobado, click **Merge Pull Request**
- Selecciona tipo de merge
- Confirma

---

## 💡 Shortcuts Útiles

| Acción | Shortcut |
|--------|----------|
| Command Palette | Ctrl+Shift+P |
| Quick Open | Ctrl+P |
| Toggle Panel | Ctrl+B |
| Git View | Ctrl+Shift+G |
| GitHub Panel | Click ícono GitHub |
| Create PR | Ctrl+Shift+P → "Create PR" |
| View PR | Ctrl+Shift+P → "View PR" |

---

## 🔔 Notificaciones

### Tipos de Notificaciones

La extensión te notifica de:
- ✓ Alguien aprobó tu PR
- 🚫 Alguien solicita cambios
- 💬 Nuevo comentario en tu PR
- ⚠️ Check falló
- ✅ Todos los checks pasaron

### Configurar Notificaciones

1. VS Code Settings (Ctrl+,)
2. Busca "GitHub"
3. Configura:
   - `github.pullRequests.notifications`: "on"
   - `github.pullRequests.hideWhenNotFocused`: "true"

---

## 🎨 Características Avanzadas

### Checkout PR desde VS Code

1. Panel lateral → Pull Requests
2. Click en PR que quieres revisar
3. Click **Checkout** (o arriba a la derecha)
4. Automáticamente cambia a rama del PR
5. Verás código del PR localmente

### Draft PR (Trabajo en Progreso)

```bash
# Vía GitHub CLI
gh pr create --draft

# O cambia a draft después:
# En GitHub UI → "Convert to draft"
```

En VS Code se muestra como "DRAFT" en el título

### Merge Automático

Si PR está aprobada y checks pasan:
- Click **Enable auto-merge**
- Selecciona tipo (Squash, Merge, Rebase)
- Merge automáticamente cuando está listo

### Labels y Asignación

En la pestaña **Overview**:
- Click en **Labels** para agregar
- Click en **Assignees** para asignar
- Click en **Reviewers** para solicitar review

---

## 🚨 Troubleshooting

### "Cannot Authenticate with GitHub"

```bash
# 1. Cierra y abre VS Code
# 2. Command Palette: "GitHub: Sign out"
# 3. Command Palette: "GitHub: Sign in"
# 4. Sigue instrucciones
```

### "PR No Aparece"

```bash
# 1. Asegúrate que branch está pusheada
git push origin feature/my-feature

# 2. Refresh panel
# Click refresh icon en panel GitHub

# 3. Abre PR manualmente en GitHub
```

### "No Puedo Comentar"

- Asegúrate de estar autenticado ✓
- Intenta cerrar y abrir PR en VS Code
- Verifica permisos en repositorio

### "Merge Bloqueado"

- Checks deben pasar ✓
- Debe haber aprobación ✓
- Branch debe estar up to date ✓
- Conversations deben estar resueltas ✓

---

## 📱 Alternativas Móviles

Si trabajas desde móvil:
- App de GitHub oficial
- GitHub web en navegador
- Notificaciones en celular

Pero VS Code ofrece mejor experience para desarrolladores.

---

## 🎓 Mejores Prácticas

### ✓ Do's
- ✓ Usa GitHub extension para todo workflow
- ✓ Crea PRs desde VS Code
- ✓ Revisa código en VS Code
- ✓ Responde comentarios rápidamente
- ✓ Mantén PR pequeña y enfocada

### ✗ Don'ts
- ✗ No mergees directamente desde command line
- ✗ No ignores comentarios de reviews
- ✗ No crees PRs sin descripción
- ✗ No commits directamente a main
- ✗ No forces push sin razón

---

## 🔗 Recursos

- [GitHub PR Extension Docs](https://github.com/microsoft/vscode-pull-request-github)
- [GitHub Docs](https://docs.github.com)
- [Verifactu PR Workflow](PULL_REQUEST_WORKFLOW.md)
- [Branch Protection Rules](BRANCH_PROTECTION_RULES.md)

---

Last updated: January 2026
