# Guía de Deployment en Vercel

**Última actualización:** 20 Enero 2026  
**Estado:** ✅ Deployments funcionando correctamente

## 📋 Configuración Actual (Funcionando)

### App Principal (`verifactu-app`)

**Ubicación:** `vercel.json` (raíz del monorepo)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**Clave:** Vercel automáticamente detecta que el proyecto Next.js está en `apps/app` y se posiciona allí antes de ejecutar los comandos.

### Landing Page (`verifactu-landing`)

**Ubicación:** `apps/landing/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "SESSION_COOKIE_DOMAIN": ".verifactu.business",
    "SESSION_COOKIE_SAMESITE": "none",
    "SESSION_COOKIE_SECURE": "true"
  }
}
```

## ✅ Dependencias Requeridas (apps/app)

Lista completa de dependencias críticas que deben estar en `apps/app/package.json`:

```json
{
  "dependencies": {
    "decimal.js": "^10.4.3",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.469.0",
    "next-auth": "^4.24.11",
    "resend": "^4.1.0"
  }
}
```

## 🚫 Errores Comunes y Soluciones

### Error: "Cannot perform a frozen installation"
**Causa:** Lockfile desactualizado de pnpm  
**Solución:** Usar npm en lugar de pnpm, eliminar `pnpm-lock.yaml`

### Error: "No workspaces found"
**Causa:** Falta configuración de workspaces en package.json raíz  
**Solución:** Añadir en `package.json`:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### Error: "Module not found: Can't resolve 'X'"
**Causa:** Falta dependencia en package.json  
**Solución:** 
1. Añadir dependencia localmente
2. Ejecutar `npm install`
3. Ejecutar `npm run build` (apps/app) para verificar
4. Commitear y pushear solo si el build local funciona

### Error: "Output directory not found"
**Causa:** Ruta duplicada (ej: `/apps/app/apps/app/.next`)  
**Solución:** Usar rutas relativas simples (`.next`) ya que Vercel auto-detecta el directorio

## 📝 Proceso de Deployment Correcto

### 1. Pre-Deployment Checklist

```bash
# En el directorio raíz del monorepo
cd c:\dev\verifactu-monorepo

# Instalar dependencias
npm install

# Build local COMPLETO antes de pushear
cd apps/app
npm run build

# Si el build falla localmente, NO pushear
# Si el build funciona, proceder al commit
```

### 2. Commit y Push

```bash
git add .
git commit -m "tipo: descripción del cambio"
git push
```

### 3. Monitoreo de Vercel

- **App:** https://vercel.com/[tu-org]/verifactu-app
- **Landing:** https://vercel.com/[tu-org]/verifactu-landing

Verificar logs en tiempo real para detectar errores inmediatamente.

## 🔧 Configuración Crítica del Monorepo

### package.json (raíz)

**DEBE incluir:**
- `workspaces: ["apps/*", "packages/*"]`
- NO debe incluir `packageManager: "pnpm@X.X.X"`
- Scripts útiles preservados (build-app-only, etc.)

### turbo.json

```json
{
  "tasks": {
    "build": { 
      "dependsOn": ["^build"], 
      "outputs": ["apps/app/.next/**", ".next/**", "dist/**"] 
    }
  }
}
```

**Importante:** Incluir `apps/app/.next/**` en outputs para que Turbo reconozca el build de monorepo.

### .vercelignore (raíz)

```
/package-lock.json
```

**Razón:** Evitar conflictos entre lockfiles locales y de CI.

## 🎯 Lecciones Aprendidas

### ❌ NO Hacer

1. **NO usar pnpm** en comandos de Vercel (causa errores de registry)
2. **NO usar `--workspace=` flag** (duplica rutas en Vercel)
3. **NO usar `--prefix apps/app`** (Vercel ya está en ese directorio)
4. **NO pushear sin build local exitoso**
5. **NO eliminar dependencias** sin verificar que no se usen

### ✅ SÍ Hacer

1. **Usar npm** consistentemente en todo el proyecto
2. **Comandos simples** (`npm install`, `npm run build`)
3. **Rutas relativas** (`.next` no `apps/app/.next`)
4. **Build local SIEMPRE** antes de commit
5. **Verificar errores** en consola de Vercel inmediatamente

## 🔄 Estrategia de Rollback

Si un deployment falla:

```bash
# 1. Identificar último commit funcional
git log --oneline

# 2. Revertir cambios problemáticos
git revert <commit-hash>
git push

# 3. Vercel automáticamente desplegará el revert
```

## 📊 Estado Histórico

### Commits Clave (20 Enero 2026)

- **eeebabbf**: Revertido a estado estable 94e71f3
- **0977f29b**: Eliminado pnpm-lock.yaml, configurado npm
- **4b202ca5**: Añadido workspaces configuration
- **3e57268d**: Todas dependencias faltantes añadidas (build local ✅)
- **ee93c37e**: Configuración final correcta de Vercel (FUNCIONANDO)

### Fallos Previos Resueltos

- ❌ 23 deployments consecutivos fallidos (pnpm, dependencias, rutas)
- ✅ Todos los problemas resueltos mediante:
  - Cambio a npm
  - Builds locales obligatorios
  - Simplificación de comandos
  - Corrección de rutas

## 🎓 Próximos Pasos

Ver: `AUTOMATED_DEPLOYMENT_STRATEGY.md` para plan de automatización con:
- GitHub Actions para validación pre-push
- Vercel Checks integrados
- GitHub Copilot para auto-fix de errores
- Rollback automático en caso de fallos
