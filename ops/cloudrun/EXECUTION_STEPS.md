# 🚀 EJECUCIÓN: Sistema Auto-Fix de Vercel

## Estado Actual

✅ **Código preparado** (Commit: c262e17a)
- Cloud Function lista
- Setup script listo
- Documentación completa

🔴 **Pendiente**: Desplegar en Google Cloud

## Antes de Ejecutar: Checklist de Seguridad

```
⚠️ IMPORTANTE: Revocaste los tokens que compartiste ANTES? (CRÍTICO)
   Los tokens viejos están comprometidos, debes revocarlos:
   - Ve a https://github.com/settings/tokens
   - Ve a https://vercel.com/account/tokens
   - Revoca los tokens antiguos

✅ Tienes nuevos tokens generados?
   - GitHub personal access token (repo + workflow)
   - Vercel API token (Full Account)
   - NO los guardes en texto plano - el script te los pedirá

✅ Tienes gcloud CLI instalado?
   - gcloud --version
   - https://cloud.google.com/sdk/docs/install-sdk

✅ Estás autenticado en Google Cloud?
   - gcloud auth login
   - gcloud config set project verifactu-business
```

## 3 Pasos para Activar Auto-Fix

### Paso 1: Preparar el Entorno (5 minutos)

```bash
# 1. Clonar/actualizar repo
git clone https://github.com/kiabusiness2025/verifactu-monorepo.git
cd verifactu-monorepo

# 2. Navegar a la carpeta
cd ops/cloudrun

# 3. Hacer script ejecutable (Windows: saltar este paso)
chmod +x setup-auto-fixer.sh
```

### Paso 2: Ejecutar Setup (5 minutos)

**Windows (PowerShell):**
```powershell
cd C:\dev\verifactu-monorepo\ops\cloudrun

# Instalar gcloud si no lo tienes:
# https://cloud.google.com/sdk/docs/install-sdk

# Autenticar
gcloud auth login
gcloud config set project verifactu-business

# Ejecutar setup
# (El script te pedirá los tokens, cópialos pero NO los muestres)
bash setup-auto-fixer.sh
```

**Linux/Mac:**
```bash
cd ops/cloudrun
gcloud auth login
gcloud config set project verifactu-business
./setup-auto-fixer.sh
```

**El script hará:**
- ✅ Crear service account (vercel-auto-fixer)
- ✅ Configurar permisos IAM
- ✅ Almacenar tokens en Secret Manager (ENCRIPTADOS)
- ✅ Desplegar Cloud Function
- ✅ Mostrar URL del webhook

**Output esperado:**
```
1️⃣ Creating service account...
2️⃣ Granting permissions...
3️⃣ Storing secrets in Secret Manager...
   Enter your GitHub token (will not be displayed):
   Enter your Vercel token (will not be displayed):
4️⃣ Granting service account access to secrets...
5️⃣ Deploying Cloud Function...
6️⃣ Cloud Function deployed!

✅ Setup complete!
🔗 Webhook URL:
https://us-central1-verifactu-business.cloudfunctions.net/vercel-auto-fixer

Next steps:
1. Go to Vercel dashboard
2. Project settings → Integrations → Webhooks
3. Add the URL above
```

### Paso 3: Configurar Webhook en Vercel (3 minutos)

1. **Ve a Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Selecciona proyecto `verifactu-app`**

3. **Ir a Settings**
   - Click en el proyecto
   - Settings → Integrations

4. **Agregar Webhook**
   - Click "Add Webhook"
   - Pega la URL del Paso 2
   - Events: `Deployment Failed`
   - Click Create

5. **¡Listo!**

## Verificación (Opcional)

### Ver logs en tiempo real
```bash
gcloud functions logs read vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business \
  --follow
```

### Test manual del webhook
```bash
curl -X POST https://us-central1-verifactu-business.cloudfunctions.net/vercel-auto-fixer \
  -H "Content-Type: application/json" \
  -d '{
    "deployment": {
      "state": "ERROR",
      "url": "https://verifactu-app.vercel.app"
    },
    "logs": "./app/api/test.ts:10:5\nModule not found: Can'"'"'t resolve '"'"'@/lib/test'"'"'"
  }'
```

## Cómo Funciona (Diagram)

```
Vercel Build Fails
       ↓
Vercel → Webhook → Cloud Function
                        ↓
                   Parse Error
                        ↓
                   Identify Type
                        ↓
                   Apply Fix
                        ↓
                   Git Commit + Push
                        ↓
              Vercel Reintenta Build ✅
```

## Errores Auto-Arreglables

| Error | Fix |
|-------|-----|
| `Module not found: '@/lib/auth'` | → Cambiar a `@/lib/session` |
| `Module not found: '@/lib/firebaseAdmin'` | → Remover, usar storage.ts |
| `import { prisma }` (named) | → `import prisma` (default) |
| Missing `createdBy` field | → Agregar `session.uid` |
| Missing `tenantId` validation | → Agregar check |
| `Cannot find name 'getSession'` | → Cambiar a `getSessionPayload` |
| `Import path '../emails'` | → Cambiar a `'../../emails'` |

## Errores NO Auto-Arreglables

Estos siguen siendo manuales:
- Cambios lógicos complejos
- Errores de runtime
- Cambios en Prisma schema
- Refactorings estructurales

## Monitoreo Continuo

Después de configurar, puedes:

### Opción 1: Ver logs en Cloud Console
https://console.cloud.google.com/functions/details/us-central1/vercel-auto-fixer?project=verifactu-business

### Opción 2: Usar CLI
```bash
gcloud functions logs read vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business \
  --limit=50
```

### Opción 3: Alertas (Futuro)
Podemos agregar alertas por email si hay muchos failures.

## Rollback (Si algo falla)

```bash
# Eliminar Cloud Function
gcloud functions delete vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business

# Eliminar secretos
gcloud secrets delete github-token --project=verifactu-business
gcloud secrets delete vercel-token --project=verifactu-business

# Ir a Vercel y eliminar webhook manualmente
```

## 🎯 Resumen Final

- **Tiempo total**: 15-20 minutos
- **Tokens**: Seguros en Secret Manager (encriptados)
- **Auto-fix**: Dispara en cada build failure
- **Monitoreo**: Logs en Google Cloud
- **Rollback**: Rápido si algo falla

---

**¿Listo para ejecutar?**

1. ✅ Revoca tokens viejos
2. ✅ Crea tokens nuevos (GitHub + Vercel)
3. ✅ Ejecuta `bash setup-auto-fixer.sh`
4. ✅ Agrega webhook en Vercel
5. ✅ Espera a que falle un build y verás la magia 🪄

**Preguntas?** Revisa VERCEL_AUTO_FIXER_GUIDE.md para detalles.
