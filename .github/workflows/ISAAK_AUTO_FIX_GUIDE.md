# 🤖 GitHub Actions Auto-Fix Workflow

Sistema automático de detección y corrección de errores usando GitHub Actions.

## ¿Cómo funciona?

```
Push a main
    ↓
GitHub Actions dispara
    ↓
Detecta errores comunes en código
    ↓
Aplica fixes automáticos
    ↓
Hace commit si hay cambios
    ↓
Push automático
    ↓
Vercel recibe el push y redeploy ✅
```

## Errores que detecta y arregla automáticamente

✅ `import { getSession } from '@/lib/auth'` → `import { getSessionPayload } from '@/lib/session'`
✅ `import { prisma }` → `import prisma` (default)
✅ `import { initFirebaseAdmin } from '@/lib/firebaseAdmin'` → Remove (no existe)
✅ `await getSession()` → `await getSessionPayload()`
✅ `session.tenant.id` → `session.tenantId`
✅ `if (!session?.user?.id || !session?.tenant?.id)` → `if (!session || !session.tenantId)`
✅ `dueDate` field en invoices → Remove (no existe en schema)

## Ventajas

- ✅ **No requiere credenciales compartidas**
- ✅ **Usa GitHub token nativo** (ya existe en acciones)
- ✅ **Auditable** - ver cada cambio en git history
- ✅ **Seguro** - cambios automáticos pero commitados
- ✅ **Reversible** - si algo falla, es un simple revert
- ✅ **Rápido** - detecta y arregla en segundos

## Cómo activar

El workflow está en `.github/workflows/isaak-auto-fix.yml` y se ejecuta automáticamente cuando:

1. **Haces push a main** (verifica código)
2. **Manualmente** desde GitHub UI → Actions → "Isaak Auto-Fix Build Failures" → Run workflow

## Ver ejecuciones

https://github.com/kiabusiness2025/verifactu-monorepo/actions

Busca "Isaak Auto-Fix" para ver:
- ✅ Errores detectados
- ✅ Fixes aplicados
- ✅ Commits automáticos

## Configuración

Actualmente detecta en:
- `apps/app/**`
- `apps/landing/**`
- `packages/**`

## Logs de ejecución

Cada ejecución muestra:

```
🔍 Detect common errors in code
❌ Found: @/lib/auth imports
❌ Found: Named prisma imports

🔧 Apply auto-fixes
Fixing AUTH imports...
Fixing Prisma imports...

📝 Commit auto-fixes
[main a1b2c3d] fix(auto): apply automatic code fixes

🚀 Push changes
To github.com/kiabusiness2025/verifactu-monorepo.git
   5ef0bf1..a1b2c3d  main -> main

✅ Summary
Errors found: AUTH_IMPORT PRISMA_IMPORT
Status: ✅ Fixed and committed
```

## Limitaciones

❌ No arregla cambios lógicos complejos
❌ No cambia Prisma schema
❌ No detecta errores de runtime
❌ No revisa TypeScript types (solo strings)

Para esos, sigue siendo manual.

## Seguridad

- ✅ Usa `GITHUB_TOKEN` nativo (no requiere credenciales)
- ✅ Cambios commitados en main (auditable)
- ✅ Cada cambio tiene commit message detallado
- ✅ No accede a secretos
- ✅ Lectura-escritura en el repo solamente

## Próximos pasos

1. El workflow ya está deployado ✅
2. Siguiente push a main lo activará automáticamente
3. O ejecuta manualmente desde GitHub Actions UI

---

**Cuando Vercel falle:**
1. GitHub Actions detecta automáticamente (próximo push)
2. Aplica fixes
3. Hace commit
4. Vercel redeploy automáticamente
5. ¡Build pasa! ✅
