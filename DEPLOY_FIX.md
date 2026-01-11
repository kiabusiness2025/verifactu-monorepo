# Solución para Despliegue de App en Vercel - Monorepo

## Problema Actual

El despliegue falla porque:
1. **Root Directory en `apps/app`**: Vercel no tiene acceso a `packages/ui`
2. **@verifactu/ui no resuelve**: Las importaciones fallan porque el workspace está fuera del directorio raíz

## Solución Correcta

### Paso 1: Cambiar Root Directory en Vercel Dashboard

1. Ve a: https://vercel.com/ksenias-projects-16d8d1fb/app/settings/general
2. **Root Directory**: Cambiar de `apps/app` a `/` (raíz del repositorio)
3. Guardar cambios

### Paso 2: Actualizar vercel.json

El archivo `apps/app/vercel.json` debe tener:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build --prefix apps/app"
}
```

### Paso 3: Verificar package.json en raíz

El archivo `package.json` en la raíz debe tener los workspaces:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Paso 4: Redesplegar

```powershell
cd C:\dev\verifactu-monorepo\apps\app
vercel --prod --yes
```

---

## Alternativa: Crear vercel.json en la Raíz

Si cambiar el Root Directory no funciona, crea `/vercel.json`:

```json
{
  "buildCommand": "cd apps/app && npm run build",
  "devCommand": "cd apps/app && npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/app/.next"
}
```

Y **elimina** `apps/app/vercel.json`.

---

## Configuración Actual

✅ **pg instalado**: apps/app/node_modules/pg
✅ **Build local funciona**: TypeScript compila sin errores
✅ **Error corregido**: app/demo/page.tsx - propiedad duplicada fixed

❌ **Root Directory incorrecto**: apps/app (debe ser `/`)
❌ **DATABASE_URL no configurado**: Necesario para endpoints de Postgres

---

## Instrucciones Paso a Paso

### Opción A: Cambiar Root Directory (RECOMENDADO)

```powershell
# 1. Actualizar vercel.json local
cd C:\dev\verifactu-monorepo\apps\app

# Editar vercel.json para que contenga:
# {
#   "framework": "nextjs",
#   "buildCommand": "npm run build --prefix apps/app"
# }

# 2. Cambiar Root Directory en Vercel Dashboard a "/"

# 3. Redesplegar
vercel --prod --yes
```

### Opción B: Usar vercel.json en Raíz

```powershell
# 1. Eliminar apps/app/vercel.json
rm apps\app\vercel.json

# 2. Crear vercel.json en raíz
@"
{
  "buildCommand": "cd apps/app && npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/app/.next"
}
"@ | Out-File -FilePath vercel.json -Encoding UTF8

# 3. Cambiar Root Directory a "/" en dashboard

# 4. Redesplegar
cd apps\app
vercel --prod --yes
```

---

## Verificación Post-Despliegue

```bash
# 1. Verificar que el build pasa
# Debería mostrar: ✓ Compiled successfully

# 2. Verificar que los endpoints existen
curl https://app-verifactu.vercel.app/api/tenants
# Debería devolver: {"ok": false, "error": "missing session"} (401/403)

# 3. Configurar DATABASE_URL en Vercel
# https://vercel.com/ksenias-projects-16d8d1fb/app/settings/environment-variables

# 4. Ejecutar migración de DB
.\scripts\migrate-db.ps1
```

---

## Próximos Pasos Después del Despliegue

1. **Configurar DATABASE_URL** en Vercel
   - Crear base de datos en Vercel Postgres / Supabase / Railway
   - Añadir variable de entorno

2. **Ejecutar Migración**
   ```powershell
   $env:DATABASE_URL = "postgres://..."
   .\scripts\migrate-db.ps1
   ```

3. **Probar Endpoints**
   - Login en landing
   - Acceder a app
   - Crear tenant desde consola del navegador

---

## Comandos Rápidos

```powershell
# Ver configuración actual de Vercel
cd apps\app
vercel env ls

# Ver logs de último despliegue
vercel logs --prod

# Limpiar caché de Vercel (si persiste idealTree)
# Ir a dashboard > Settings > General > Clear Cache

# Build local
npm run build

# Desplegar
vercel --prod --yes
```
