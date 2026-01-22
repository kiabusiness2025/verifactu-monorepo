# Configuración de Vercel Deployment Protection

Este documento explica cómo configurar **GitHub Checks** en Vercel para que los deployments esperen a que pasen los workflows de CI/CD antes de promover a producción.

## 🎯 Objetivo

Asegurar que ningún deployment llegue a producción sin que:
- ✅ Los type checks de TypeScript pasen
- ✅ Los builds de app y landing compilen exitosamente
- ✅ El workflow `Auto-Fix & Deploy` complete sin errores

## 📋 Métodos de Configuración

### Método 1: Vercel Dashboard (Recomendado - más simple)

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el proyecto `verifactu-monorepo-app`
3. Ve a **Settings** → **Git**
4. En la sección **"Deployment Protection"**:
   - Habilita **"GitHub Checks"**
   - Selecciona el workflow: `Auto-Fix & Deploy`
   - Configura para que aplique a: **Production** y **Preview**
5. Guarda cambios

### Método 2: Vercel CLI + API (Automatizado)

```bash
# 1. Crear token de Vercel
vercel token create deployment-checks

# 2. Configurar token en el entorno
# Windows PowerShell:
$env:VERCEL_TOKEN = "tu_token_aqui"

# Linux/Mac:
export VERCEL_TOKEN="tu_token_aqui"

# 3. Ejecutar script de configuración
node scripts/configure-vercel-checks.js
```

### Método 3: Configuración Manual via API

```bash
# Obtener Project ID
cat .vercel/project.json

# Llamar a la API de Vercel
curl -X PATCH \
  "https://api.vercel.com/v9/projects/PROJECT_ID?teamId=TEAM_ID" \
  -H "Authorization: Bearer VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentProtection": {
      "checks": [
        {
          "name": "Auto-Fix & Deploy",
          "path": ".github/workflows/auto-fix-and-deploy.yml"
        }
      ]
    }
  }'
```

## 🔍 Verificación

Después de configurar, deberías ver:

1. **En Vercel Dashboard**:
   - Badge: "✓ GitHub Checks Enabled"
   - Deployments mostrarán status "Waiting for checks..."

2. **En GitHub PRs/Commits**:
   - Vercel esperará hasta que el workflow complete
   - Solo desplegará si todos los checks pasan

3. **En el workflow**:
   ```
   Build #10 ✓
   → Vercel: Waiting for checks...
   → All checks passed ✓
   → Promoting to Production ✓
   ```

## 🎨 Configuración Actual

**Project**: `verifactu-monorepo-app`
- **Project ID**: `prj_ZBVvfBkBG6b4MmSCD9aRQM7QAPAU`
- **Team ID**: `team_VKgEl6B4kMmqwaplJcykx3KP`
- **Workflow monitoreado**: `.github/workflows/auto-fix-and-deploy.yml`

## 📊 Comportamiento Esperado

### Antes (sin checks):
```
git push → Vercel build inmediato → Production (aunque haya errores)
```

### Después (con checks):
```
git push 
→ GitHub Actions ejecuta workflow
→ Type checks ✓
→ Builds ✓
→ Vercel recibe señal de aprobación
→ Deployment a Production ✓
```

## 🚨 Troubleshooting

### "Checks never complete"
- Verifica que el workflow esté configurado para `push` y `pull_request`
- Asegúrate de que el nombre del workflow coincida exactamente

### "Deployment bypasses checks"
- Revisa que Deployment Protection esté en "Enabled"
- Verifica que esté aplicado a la branch `main`

### "Checks fail pero quiero desplegar"
- Puedes hacer override manual en Vercel Dashboard
- O usar: `vercel --force` (no recomendado en producción)

## 💡 Recomendación

**Usa el Método 1 (Dashboard)** - Es más visual y te permite ver exactamente qué workflows están disponibles. Una vez configurado, el script automatizado es útil para CI/CD o configuraciones multi-proyecto.
