# Configuración de Vercel para Monorepo

## Problema Resuelto
Error: "La instalación sin cabeza requiere un archivo pnpm-lock.yaml"

## Archivos Actualizados
1. ✅ `pnpm-lock.yaml` - commitado y pusheado
2. ✅ `vercel.json` (raíz) - actualizado con configuración de monorepo
3. ✅ `apps/landing/vercel.json` - configurado con comando turbo

## Configuración en Dashboard de Vercel

### Paso 1: Root Directory
En Vercel Dashboard → Project Settings → General:
- **Root Directory**: `apps/landing`
- Marcar: "Include source files outside of the Root Directory in the Build Step"

### Paso 2: Build & Development Settings
- **Framework Preset**: Next.js
- **Build Command**: `cd ../.. && pnpm turbo run build --filter=landing`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Output Directory**: `.next` (default)

### Paso 3: Environment Variables (si aplica)
Asegurarse de configurar todas las variables de entorno necesarias.

## Verificación Local
Para verificar que el build funciona localmente:

```bash
# Desde la raíz del monorepo
cd C:\dev\verifactu-monorepo
pnpm install --frozen-lockfile
pnpm turbo run build --filter=landing
```

## Estructura de Archivos Clave
- ✅ `pnpm-lock.yaml` (raíz)
- ✅ `pnpm-workspace.yaml` (raíz)
- ✅ `.npmrc` (raíz)
- ✅ `turbo.json` (raíz)
- ✅ `vercel.json` (raíz y apps/landing)

## Notas Importantes
- El comando `--frozen-lockfile` asegura que pnpm use exactamente las versiones en pnpm-lock.yaml
- Turbo gestiona las dependencias entre paquetes del monorepo
- El Root Directory debe apuntar a `apps/landing`, no a la raíz
