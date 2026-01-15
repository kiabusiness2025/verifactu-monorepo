# Configuración de Acceso de Admin

## ¿Qué es ADMIN_EMAILS?

`ADMIN_EMAILS` es una variable de entorno que define qué usuarios tienen acceso al **Panel de Administración** en `/dashboard/admin`.

Solo los emails listados en esta variable podrán:
- Ver usuarios del sistema
- Gestionar empresas (crear, editar, eliminar)
- Ver datos de contabilidad consolidados
- Acceder a todas las funciones administrativas

## Formato

```bash
ADMIN_EMAILS=email1@dominio.com,email2@dominio.com,email3@dominio.com
```

**Importante:** 
- Separar emails con comas (sin espacios)
- No incluir espacios al inicio ni final
- Los emails NO son case-sensitive (se comparan en minúsculas)

## Configuración en Vercel

### Proyecto: app.verifactu.business

1. Ir a: https://vercel.com/ksenias-projects-16d8d1fb/verifactu-app
2. Settings → Environment Variables
3. Agregar nueva variable:
   - **Key:** `ADMIN_EMAILS`
   - **Value:** `kiabusiness2025@gmail.com`
   - **Environments:** Production, Preview, Development (todas)
4. **Save**
5. **Importante:** Hacer redeploy para que tome efecto

### Redeploy rápido

Opción A - Desde terminal:
```bash
cd apps/app
vercel --prod
```

Opción B - Desde Vercel dashboard:
1. Ir a: Deployments
2. Hacer click en los 3 puntos del último deployment
3. Click en "Redeploy"

## Verificación

1. Ir a: https://app.verifactu.business
2. Login con tu cuenta
3. Click en tu avatar (esquina superior derecha)
4. Deberías ver: **"⚙️ Panel de Administración"** en el menú desplegable
5. Click para acceder a `/dashboard/admin`

## Agregar más administradores

Si quieres agregar más usuarios admin en el futuro:

```bash
ADMIN_EMAILS=kiabusiness2025@gmail.com,otro.admin@empresa.com
```

## Seguridad

⚠️ **IMPORTANTE:**
- Solo agregar emails de personas de confianza
- Los admins pueden ver TODOS los datos de TODAS las empresas
- Pueden crear, modificar y eliminar empresas
- Pueden ver información sensible de usuarios

## Troubleshooting

### No veo el botón de Admin después de configurar

1. Verificar que el email en `ADMIN_EMAILS` coincide EXACTAMENTE con el email de tu cuenta Google
2. Hacer logout y volver a login
3. Verificar en Vercel que la variable está guardada correctamente
4. Verificar que hiciste redeploy después de agregar la variable

### "ADMIN_EMAILS not configured"

Este error significa que la variable no está definida en el servidor.
Asegúrate de haberla agregado en Vercel y haber hecho redeploy.

## Logs útiles

Para verificar que funciona correctamente:

```bash
# Desde terminal
vercel logs --prod --app=verifactu-app
```

Buscar líneas con `[Admin Check]` o `requireAdmin` para ver intentos de acceso.

---

**Última actualización:** 2026-01-15  
**Usuario actual admin:** kiabusiness2025@gmail.com
