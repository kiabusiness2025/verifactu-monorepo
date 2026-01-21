# Configuración de GitHub Personal Access Token

Para que el panel de administración pueda interactuar con GitHub (crear issues, ver workflows, etc.), necesitas crear un Personal Access Token (PAT).

## 📋 Pasos para crear el token

### 1. Acceder a GitHub Settings

1. Ve a [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click en **"Generate new token"** > **"Generate new token (classic)"**

### 2. Configurar el token

**Nombre:** `Verifactu Admin Panel`  
**Expiración:** `90 days` (recomendado)  
**Select scopes:**

```
✅ repo (Full control of private repositories)
  ✅ repo:status
  ✅ repo_deployment
  ✅ public_repo
  ✅ repo:invite
  ✅ security_events

✅ workflow (Update GitHub Action workflows)

✅ admin:org (Full control of orgs and teams, read and write org projects)
  ✅ read:org (Read org and team membership, read org projects)
```

### 3. Generar y copiar

1. Click en **"Generate token"**
2. Copia el token **inmediatamente** (no podrás verlo de nuevo)
3. Guárdalo en `apps/admin/.env.local`:

```bash
GITHUB_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
GITHUB_OWNER="kiabusiness2025"
GITHUB_REPO="verifactu-monorepo"
```

## 🔐 Seguridad

- ⚠️ **Nunca** commitees el token a git
- 🔄 Rota el token cada 90 días
- 📝 Revoca tokens viejos cuando generes uno nuevo
- 🔒 Usa solo los permisos necesarios

## 🆘 Si el token se expone

1. Ve inmediatamente a [github.com/settings/tokens](https://github.com/settings/tokens)
2. Encuentra el token comprometido
3. Click en **"Revoke"**
4. Genera un nuevo token
5. Actualiza `.env.local` con el nuevo token

---

✅ Token configurado. El panel admin ahora puede crear issues y monitorear workflows.
