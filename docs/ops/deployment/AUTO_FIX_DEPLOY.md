# Sistema de Auto-Fix y Deploy Automatizado

## 🎯 Objetivo

Detectar y corregir automáticamente errores de TypeScript, build y deployment sin intervención manual.

## 🔧 Componentes

### 1. GitHub Actions Workflow

**Archivo:** `.github/workflows/auto-fix-and-deploy.yml`

Ejecuta automáticamente en cada push:

- ✅ Type check con TypeScript
- ✅ ESLint validation
- ✅ Auto-fix de errores comunes
- ✅ Commit automático de fixes
- ✅ Re-validación post-fix
- ✅ Deploy a Vercel (producción)

### 2. Auto-Fix Script

**Archivo:** `scripts/auto-fix-typescript.js`

Analiza errores de TypeScript y aplica fixes automáticos para:

- Missing imports (React, Next.js, Prisma)
- Unused variables
- Type mismatches (con sugerencias)
- Missing properties (con warnings)

### 3. Pre-Deploy Validation

**Archivo:** `scripts/pre-deploy-check.js`

Ejecuta validaciones exhaustivas antes de desplegar:

- Prisma schema validation
- TypeScript compilation
- Build test
- Environment variables check
- Dependencies verification

### 4. Pre-Commit Hook

**Archivo:** `.git/hooks/pre-commit`

Valida código antes de cada commit:

- Type check apps/app y apps/landing
- Lint check
- Prisma validation

## 📋 Configuración necesaria

### GitHub Secrets

Añade estos secrets en tu repositorio de GitHub:

```bash
# GitHub Settings → Secrets → Actions

# Vercel
VERCEL_TOKEN=<tu-token-vercel>
VERCEL_ORG_ID=<tu-org-id>
VERCEL_PROJECT_ID=<tu-project-id>

# Google Cloud
GCP_SA_KEY=<service-account-json>
```

### Obtener Vercel tokens:

```bash
# 1. Vercel Token
npx vercel login
npx vercel --token

# 2. Org ID y Project ID
cd apps/app
npx vercel link
# Los IDs estarán en .vercel/project.json
```

### Obtener GCP Service Account:

```bash
# 1. Crear service account
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# 2. Dar permisos
gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:github-deployer@verifactu-business.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding verifactu-business \
  --member="serviceAccount:github-deployer@verifactu-business.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# 3. Crear key JSON
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-deployer@verifactu-business.iam.gserviceaccount.com

# 4. Copiar contenido de gcp-key.json al secret GCP_SA_KEY
```

## 🚀 Uso

### Modo Automático (recomendado)

Simplemente haz push a `main`:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

El workflow automáticamente:

1. Detecta errores
2. Aplica fixes
3. Valida
4. Despliega

### Modo Manual

#### Pre-deploy check local:

```bash
pnpm run pre-deploy
```

#### Auto-fix local:

```bash
cd apps/app
pnpm exec tsc --noEmit > typecheck-errors.log 2>&1 || true
node ../../scripts/auto-fix-typescript.js typecheck-errors.log
```

#### Validación completa:

```bash
pnpm run validate
```

## 🔄 Flujo de Trabajo

```
Push a GitHub
    ↓
GitHub Actions detecta cambios
    ↓
Instala dependencias
    ↓
Genera Prisma Client
    ↓
Type Check App + Landing
    ↓
┌─ Error detectado? ─┐
│  SÍ         │   NO  │
↓             ↓       ↓
Auto-Fix   →  Skip    Continue
Commit Fix            ↓
Re-check              Build
    ↓                 ↓
  Pass?           Success?
    ↓                 ↓
   NO → Fail      Deploy
   SÍ ↓              ↓
  Deploy         Vercel
```

## 🛠 Mantenimiento

### Añadir nuevos auto-fixes

Edita `scripts/auto-fix-typescript.js`:

```javascript
case 'nuevo-tipo-error':
  fixNuevoTipoError(errorList);
  break;

function fixNuevoTipoError(errors) {
  // Tu lógica de fix
}
```

### Añadir nuevas validaciones

Edita `scripts/pre-deploy-check.js`:

```javascript
{
  name: 'Nueva Validación',
  run: () => {
    // Tu validación
  }
}
```

## 📊 Monitoreo

Ver ejecuciones en:

- GitHub → Actions tab
- Vercel Dashboard → Deployments

## ⚡ Optimizaciones

- **Cache de pnpm**: Reduce tiempo de install
- **Parallel jobs**: Type check y lint en paralelo
- **Continue on error**: Auto-fix intenta corregir antes de fallar
- **Skip CI**: Commits de auto-fix no disparan nuevo workflow

## 🔐 Seguridad

- Service account con permisos mínimos necesarios
- Secrets encriptados en GitHub
- No se exponen tokens en logs
- Pre-commit hook previene código inválido

## 📝 Logs

Todos los logs están disponibles en:

- GitHub Actions UI
- Vercel deployment logs
