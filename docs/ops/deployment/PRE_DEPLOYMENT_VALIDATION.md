# Pre-Deployment Validation (Fase 1)

**Estado:** ✅ Implementado  
**Última actualización:** 20 Enero 2026

## 🎯 Objetivo

Prevenir deployments fallidos mediante validación automática de builds antes de que lleguen a Vercel.

## 🔧 Componentes

### 1. GitHub Action: `pre-deployment-check.yml`

**Ubicación:** `.github/workflows/pre-deployment-check.yml`

**Se ejecuta cuando:**
- Push a `main` o `staging`
- Pull Request a `main`

**Valida:**
- ✅ Instalación de dependencias
- ✅ Dependencias críticas presentes
- ✅ Build exitoso (app y landing)
- ✅ Type checking (TypeScript)

**Resultado:**
- ✅ **Success:** Listo para deployment
- ❌ **Failure:** Bloquea merge, añade comentario al PR

### 2. Script: `check-dependencies.js`

**Ubicación:** `scripts/check-dependencies.js`

**Uso:**
```bash
# Verificar app
node scripts/check-dependencies.js apps/app

# Verificar landing
node scripts/check-dependencies.js apps/landing
```

**Verifica:**
- Dependencias críticas instaladas
- Versiones coinciden con recomendadas
- Dependencias esenciales de Next.js

## 🚀 Uso Local

### Antes de hacer commit:

```bash
# Validar dependencias
node scripts/check-dependencies.js apps/app

# Build local
cd apps/app
npm run build

# Si todo pasa, hacer commit
git add .
git commit -m "feat: nueva funcionalidad"
git push
```

### Durante Pull Request:

1. Crea tu PR
2. GitHub Actions ejecuta validación automáticamente
3. Revisa los checks en la página del PR
4. Si fallan:
   - Lee el comentario automático
   - Revisa los logs del workflow
   - Corrige localmente
   - Push nuevos cambios

## 📊 Ejemplo de Output

### ✅ Validación Exitosa

```
🔍 Checking dependencies in apps/app...

✅ lucide-react (^0.469.0)
✅ framer-motion (^11.15.0)
✅ next-auth (^4.24.11)
✅ decimal.js (^10.4.3)
✅ resend (^4.1.0)

📦 Essential Next.js dependencies:
✅ next (^14.2.35)
✅ react (^18.2.0)
✅ react-dom (^18.2.0)

============================================================

✅ VALIDATION PASSED

All critical dependencies are present!
```

### ❌ Validación Fallida

```
🔍 Checking dependencies in apps/app...

❌ MISSING: decimal.js
   Recommended version: ^10.4.3
   Required by:
     - lib/hooks/useArticles.ts
   Fix: npm install decimal.js@^10.4.3

✅ lucide-react (^0.469.0)
✅ framer-motion (^11.15.0)

============================================================

❌ VALIDATION FAILED

Missing critical dependencies detected.
Install them and try again:

  cd apps/app
  npm install
```

## 🔒 Protección de Branches

### Configuración Recomendada en GitHub

**Settings > Branches > Branch protection rules para `main`:**

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - ✅ `validate-app`
  - ✅ `validate-landing`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

Esto **bloquea** el merge si las validaciones fallan.

## 🐛 Debugging

### El workflow falla pero mi build local funciona

**Posibles causas:**

1. **Variables de entorno faltantes**
   - El workflow usa variables dummy para el build
   - Si tu código las requiere en tiempo de build, ajusta el workflow

2. **Dependencias en cache**
   - GitHub Actions usa cache de npm
   - Puede que esté desactualizado
   - Solución: Trigger manualmente sin cache

3. **Versión de Node.js**
   - El workflow usa Node 20.20.0
   - Verifica que tu local use la misma versión

### Cómo ejecutar el workflow manualmente

1. Ve a: Actions > Pre-Deployment Validation
2. Click: "Run workflow"
3. Selecciona branch
4. Click: "Run workflow"

## 📈 Métricas

El workflow registra:
- Tiempo de ejecución
- Estado de cada check
- Historial de builds

Ver en: **Actions > Pre-Deployment Validation**

## ⚙️ Configuración Avanzada

### Añadir nueva dependencia crítica

Edita `scripts/check-dependencies.js`:

```javascript
const CRITICAL_DEPS_BY_APP = {
  'apps/app': {
    'nueva-dependencia': {
      version: '^1.0.0',
      files: [
        'ruta/archivo/que/la/usa.tsx'
      ]
    },
    // ... resto
  }
};
```

### Desactivar validación temporal

Añade al commit message:
```
feat: nueva feature [skip ci]
```

**⚠️ NO RECOMENDADO** - Solo usar en emergencias.

## 🎯 Próximos Pasos

- [ ] Configurar branch protection en GitHub
- [ ] Testear con PR de prueba
- [ ] Documentar proceso al equipo
- [ ] Monitorear métricas primera semana
- [ ] Implementar Fase 2 (Auto-fix)

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [Automated Strategy](./AUTOMATED_DEPLOYMENT_STRATEGY.md)
