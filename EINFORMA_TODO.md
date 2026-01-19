# ✅ Configuración de eInforma - Checklist

## Estado Actual

He agregado las variables de configuración de eInforma en los siguientes archivos:

- ✅ `.env.local` (raíz del monorepo)
- ✅ `apps/app/.env.local`
- ✅ `.env.example` (raíz - para referencia)
- ✅ `apps/app/.env.example` (ya existía)

## 📋 Pasos para Completar la Configuración

### 1. Obtener Credenciales de eInforma

Contacta con eInforma para obtener:

- `EINFORMA_CLIENT_ID`
- `EINFORMA_CLIENT_SECRET`
- Confirmar las URLs de token y API

### 2. Actualizar Archivos Locales

Edita estos archivos y reemplaza los valores placeholder:

#### `.env.local` (raíz)

```bash
EINFORMA_CLIENT_ID=your_actual_client_id
EINFORMA_CLIENT_SECRET=your_actual_client_secret
```

#### `apps/app/.env.local`

```bash
EINFORMA_CLIENT_ID=your_actual_client_id
EINFORMA_CLIENT_SECRET=your_actual_client_secret
```

### 3. Configurar en Vercel

Ve a tu proyecto `app` en Vercel Dashboard:

1. **Ir a Settings → Environment Variables**

2. **Agregar las siguientes variables**:

   | Variable                 | Value                                  | Entornos                         |
   | ------------------------ | -------------------------------------- | -------------------------------- |
   | `EINFORMA_TOKEN_URL`     | `https://api.einforma.com/oauth/token` | Production, Preview, Development |
   | `EINFORMA_API_BASE_URL`  | `https://api.einforma.com/v1`          | Production, Preview, Development |
   | `EINFORMA_CLIENT_ID`     | Tu Client ID real                      | Production, Preview, Development |
   | `EINFORMA_CLIENT_SECRET` | Tu Client Secret real                  | Production, Preview, Development |
   | `EINFORMA_TIMEOUT_MS`    | `8000`                                 | Production, Preview, Development |

3. **Hacer Redeploy** después de agregar las variables

### 4. Verificar la Configuración

Después de reiniciar el servidor local:

```bash
cd apps/app
pnpm dev
```

1. Ve a Dashboard → Crear Nueva Empresa
2. Escribe un nombre de empresa (mínimo 3 caracteres)
3. Deberías ver sugerencias de eInforma

## 🔍 Verificación de Errores Comunes

### Error: "Missing env var EINFORMA_TOKEN_URL"

- **Causa**: Variable no encontrada
- **Solución**: Verifica que esté en `.env.local` y reinicia el servidor

### Error: "eInforma token error 401"

- **Causa**: Credenciales incorrectas
- **Solución**: Verifica CLIENT_ID y CLIENT_SECRET

### Error: "No se pudo consultar eInforma"

- **Causa**: API no disponible o configuración incorrecta
- **Solución**: Verifica las URLs y credenciales

## 📚 Documentación

He creado documentación completa en:

- `docs/EINFORMA_SETUP.md` - Guía completa de configuración

## 🎯 Próximos Pasos

1. [ ] Obtener credenciales de eInforma
2. [ ] Actualizar `.env.local` (raíz)
3. [ ] Actualizar `apps/app/.env.local`
4. [ ] Agregar variables en Vercel
5. [ ] Reiniciar servidor de desarrollo
6. [ ] Probar búsqueda de empresas
7. [ ] Hacer redeploy en Vercel

## ⚠️ Recordatorios

- Las credenciales de eInforma son **PRIVADAS** - nunca las commits al repositorio
- Los archivos `.env.local` ya están en `.gitignore`
- Asegúrate de agregar las variables en **todos los entornos** de Vercel
- La búsqueda funciona con mínimo 3 caracteres
- Hay un debounce de 300ms para reducir requests a la API
