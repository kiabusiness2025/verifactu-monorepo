# Vercel Auto-Fixer Setup Guide

Sistema automático para arreglar fallos de build en Vercel usando Google Cloud Run.

## 🎯 Qué hace

- Recibe webhooks cuando Vercel tiene un build failure
- Parsea automáticamente el error
- Aplica fixes conocidos
- Hace commit y push automático
- Vercel reintenta el build

## 🔧 Requisitos

- Google Cloud Project: `verifactu-business` (536174799167)
- GitHub personal access token (con permisos de repo)
- Vercel API token
- gcloud CLI instalado y autenticado

## 📋 Paso 1: Preparar Tokens (UNA SOLA VEZ)

### GitHub Token
1. Ve a https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Permisos necesarios:
   - `repo` (full control of private repositories)
   - `workflow` (update GitHub Action workflows)
4. Copia el token (no lo guardes en texto plano)

### Vercel Token
1. Ve a https://vercel.com/account/tokens
2. Click "Create Token"
3. Scope: `Full Account`
4. Copia el token

## 🚀 Paso 2: Desplegar la Cloud Function

```bash
cd ops/cloudrun

# Hacer ejecutable
chmod +x setup-auto-fixer.sh

# Ejecutar setup (pedirá los tokens)
./setup-auto-fixer.sh
```

El script hará automáticamente:
- ✅ Crear service account
- ✅ Almacenar tokens en Secret Manager (SEGURO)
- ✅ Configurar permisos IAM
- ✅ Desplegar Cloud Function
- ✅ Mostrar webhook URL

## 🔗 Paso 3: Configurar Webhook en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona proyecto `verifactu-app`
3. Settings → Integrations → Webhooks
4. Create Hook:
   - **URL**: Copia la URL del paso anterior
   - **Events**: `Deployment Failed`
   - **Description**: "Auto-fix build failures"
5. Click "Create"

## ✅ Verificar que funciona

### Método 1: Log en Google Cloud
```bash
gcloud functions logs read vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business \
  --limit=50
```

### Método 2: Triggerear un error falso
```bash
curl -X POST https://[WEBHOOK_URL] \
  -H "Content-Type: application/json" \
  -d '{
    "deployment": {
      "state": "ERROR",
      "url": "https://verifactu-app.vercel.app"
    },
    "logs": "./app/api/test.ts:10:5\nModule not found: Can'"'"'t resolve '"'"'@/lib/test'"'"'"
  }'
```

## 🛠️ Tipos de Errores Auto-Arreglables

| Error | Auto-fix | Ejemplo |
|-------|----------|---------|
| Module not found `@/lib/auth` | ✅ Sí | `@/lib/auth` → `@/lib/session` |
| Module not found `@/lib/firebaseAdmin` | ✅ Sí | Remove import, use storage.ts |
| Named import `{ prisma }` | ✅ Sí | `{ prisma }` → `prisma` (default) |
| Missing field `createdBy` | ✅ Sí | Agrega `createdBy: session.uid` |
| Missing field `tenantId` | ✅ Sí | Agrega validación en type guard |
| `getSession` undefined | ✅ Sí | `getSession()` → `getSessionPayload()` |
| Import path `../emails` | ✅ Sí | `../emails/` → `../../emails/` |

## ⚠️ Errores NO Auto-Arreglables

- Cambios lógicos complejos
- Refactorings estructurales
- Cambios en Prisma schema
- Errores de runtime

Para estos, el webhook simplemente reporta (sin hacer cambios).

## 🔐 Seguridad

- **Tokens**: Almacenados en Secret Manager (encriptados)
- **Service Account**: Acceso limitado solo a secretos
- **Cloud Function**: Sin permisos a otros servicios
- **Git**: Usa token vía HTTPS (no SSH keys)

## 📊 Monitoreo

### Ver logs en tiempo real
```bash
gcloud functions logs read vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business \
  --follow
```

### Ver errores
```bash
gcloud functions logs read vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business \
  --limit=100 | grep "❌"
```

## 🔄 Actualizar el código

Si quieres cambiar la lógica de fixes:

```bash
# Editar vercel-auto-fixer.js

# Redeploy
gcloud functions deploy vercel-auto-fixer \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=vercel_auto_fixer \
  --service-account=vercel-auto-fixer@verifactu-business.iam.gserviceaccount.com \
  --set-env-vars="GCP_PROJECT=verifactu-business" \
  --region=us-central1 \
  --project=verifactu-business \
  --source=.
```

## 🧹 Limpieza (si necesitas eliminar)

```bash
# Eliminar webhook en Vercel dashboard manualmente

# Eliminar Cloud Function
gcloud functions delete vercel-auto-fixer \
  --region=us-central1 \
  --project=verifactu-business

# Eliminar secretos
gcloud secrets delete github-token --project=verifactu-business
gcloud secrets delete vercel-token --project=verifactu-business

# Eliminar service account
gcloud iam service-accounts delete \
  vercel-auto-fixer@verifactu-business.iam.gserviceaccount.com \
  --project=verifactu-business
```

## 📞 Soporte

Si algo falla:

1. **Revisa los logs**: `gcloud functions logs read vercel-auto-fixer`
2. **Verifica permisos**: IAM → Service Accounts → vercel-auto-fixer
3. **Prueba el webhook**: Usa curl como en "Verificar"
4. **Revoca y regenera tokens** si sospechas compromiso de seguridad

---

**Creado por**: Isaak Auto-Fixer Bot
**Última actualización**: 2026-01-14
