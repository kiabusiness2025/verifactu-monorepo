# Configuración de OAuth para Panel de Administración

Guía completa para configurar Google OAuth con restricción a dominio `@verifactu.business`.

## 📋 Prerrequisitos

- Cuenta Google Cloud Platform (GCP)
- Google Workspace con dominio `verifactu.business`
- Permisos de administrador en GCP

## 🔧 1. Crear Proyecto en Google Cloud

### 1.1 Acceder a Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Click en el selector de proyectos (arriba izquierda)
3. Click en "Nuevo proyecto"
4. Nombre: `verifactu-admin-panel`
5. Click en "Crear"

### 1.2 Habilitar APIs necesarias

```bash
# Navega a "APIs y servicios" > "Biblioteca"
# Habilita las siguientes APIs:
- Google+ API (para OAuth)
- Google Calendar API
- Gmail API
- Google Drive API
```

O usando `gcloud` CLI:

```bash
gcloud services enable \
  plus.googleapis.com \
  calendar-json.googleapis.com \
  gmail.googleapis.com \
  drive.googleapis.com \
  --project=verifactu-business-480212
```

## 🔐 2. Configurar Pantalla de Consentimiento OAuth

### 2.1 Tipo de Usuario

1. Ve a "APIs y servicios" > "Pantalla de consentimiento de OAuth"
2. Selecciona **"Interno"** (solo para Google Workspace)
3. Click en "Crear"

### 2.2 Información de la Aplicación

**Nombre de la aplicación:** `Verifactu Admin Panel`  
**Email de soporte:** `soporte@verifactu.business`  
**Logo:** (opcional) subir logo de Verifactu  
**Dominio de la aplicación:** `admin.verifactu.business`  
**Dominios autorizados:**

- `verifactu.business`
- `admin.verifactu.business`

**Email del desarrollador:** `dev@verifactu.business`

### 2.3 Alcances (Scopes)

Click en "Añadir o quitar alcances" y selecciona:

```
✅ .../auth/userinfo.email
✅ .../auth/userinfo.profile
✅ openid
```

Click en "Guardar y continuar"

### 2.4 Sincronización automática con Prisma

Al iniciar sesión con Google/Firebase:
- Si el usuario no existe en Prisma y el email es admin, se crea automáticamente con rol ADMIN.
- Si el usuario existe y el email es admin, se actualiza el rol a ADMIN si es necesario.
- El acceso admin está garantizado para soporte@verifactu.business y kiabusiness2025@gmail.com.
- `admin@verifactu.business`

## 🎫 3. Crear Credenciales OAuth 2.0

### 3.1 Cliente Web

1. Ve a "APIs y servicios" > "Credenciales"
2. Click en "Crear credenciales" > "ID de cliente de OAuth"
3. Tipo de aplicación: **"Aplicación web"**
4. Nombre: `Verifactu Admin Panel - Web`

**Orígenes de JavaScript autorizados:**

```
http://localhost:3003
https://admin.verifactu.business
```

**URIs de redireccionamiento autorizados:**

```
http://localhost:3003/api/auth/callback/google
https://admin.verifactu.business/api/auth/callback/google
```

5. Click en "Crear"
6. **Guarda las credenciales:**
   - `Client ID`: Copia tu Client ID
   - `Client Secret`: Copia tu Client Secret
   - **Importante:** Guarda estos valores en `apps/admin/.env.local`

### 3.2 Cuenta de Servicio (Para APIs)

1. En "Credenciales" > "Crear credenciales" > "Cuenta de servicio"
2. Nombre: `api-drive-gmail-calendario`
3. Rol: `Service Account Admin`
4. Click en "Crear y continuar"
5. Click en "Listo"

**Descargar clave privada:**

1. Click en la cuenta de servicio creada
2. Pestaña "Claves" > "Agregar clave" > "Crear clave nueva"
3. Tipo: **JSON**
4. Guarda el archivo JSON (ya lo tienes en el monorepo)

## ⚙️ 4. Configurar Next.js (NextAuth)

### 4.1 Instalar dependencias

```bash
cd apps/admin
pnpm add next-auth @auth/prisma-adapter
```

### 4.2 Archivo `.env.local`

Crea `apps/admin/.env.local` con:

```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3003"
NEXTAUTH_SECRET="<GENERAR_CON_openssl_rand_-base64_32>"

# Google OAuth
GOOGLE_CLIENT_ID="<TU_CLIENT_ID_AQUI>"
GOOGLE_CLIENT_SECRET="<TU_CLIENT_SECRET_AQUI>"
GOOGLE_WORKSPACE_DOMAIN="verifactu.business"
```

### 4.3 Configurar NextAuth

Archivo `apps/admin/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          hd: 'verifactu.business', // 🔒 Restricción de dominio
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Solo permitir @verifactu.business
      if (!user.email?.endsWith('@verifactu.business')) {
        return false;
      }
      return true;
    },
    async session({ session, token }) {
      // Añadir role al session
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST };
```

## 🔍 5. Restricción de Dominio (Workspace)

### 5.1 Parámetro `hd` (Hosted Domain)

El parámetro `hd: 'verifactu.business'` en la configuración de OAuth **sugiere** al usuario que inicie sesión con ese dominio, pero NO lo fuerza.

### 5.2 Verificación en Callback

**⚠️ CRÍTICO:** Siempre verifica el email en el callback:

```typescript
async signIn({ user }) {
  if (!user.email?.endsWith('@verifactu.business')) {
    console.error('Intento de acceso no autorizado:', user.email);
    return false; // Bloquear acceso
  }
  return true;
}
```

### 5.3 Configuración en Google Workspace (Opcional)

Para mayor seguridad, configura en Google Workspace Admin:

1. Ve a [admin.google.com](https://admin.google.com)
2. Security > API Controls > Manage Third-Party App Access
3. Añade tu Client ID como "app confiable"
4. Restringe scope a usuarios específicos

## 🧪 6. Pruebas

### 6.1 Probar en Local

```bash
cd apps/admin
pnpm dev
```

1. Abre `http://localhost:3003`
2. Click en "Iniciar sesión con Google"
3. Prueba con:
   - ✅ `soporte@verifactu.business` → Debe funcionar
   - ❌ `personal@gmail.com` → Debe fallar

### 6.2 Verificar Tokens

En la consola de desarrollo:

```javascript
// Obtener session
fetch('/api/auth/session')
  .then((r) => r.json())
  .then(console.log);
```

Debe retornar:

```json
{
  "user": {
    "name": "Soporte Verifactu",
    "email": "soporte@verifactu.business",
    "role": "ADMIN"
  }
}
```

## 🚀 7. Despliegue a Producción

### 7.1 Actualizar URIs en Google Cloud

1. Ve a Google Cloud Console > Credenciales
2. Edita el Client ID creado
3. Añade a "URIs de redireccionamiento":
   ```
   https://admin.verifactu.business/api/auth/callback/google
   ```

### 7.2 Variables de Entorno en Cloud Run

```bash
gcloud run services update verifactu-admin \
  --update-env-vars \
    NEXTAUTH_URL="https://admin.verifactu.business",\
    NEXTAUTH_SECRET="<TU_SECRET_PRODUCCION>",\
    GOOGLE_CLIENT_ID="<TU_CLIENT_ID>",\
    GOOGLE_CLIENT_SECRET="<TU_CLIENT_SECRET>"
```

### 7.3 Verificar en Producción

1. Ve a `https://admin.verifactu.business`
2. Inicia sesión con `@verifactu.business`
3. Verifica que usuarios externos NO puedan acceder

## 🆘 Troubleshooting

### Error: "Access blocked: Authorization Error"

**Causa:** La app está en modo "Testing" y el usuario no está en la lista de prueba.

**Solución:**

1. Ve a "Pantalla de consentimiento" > "Estado de publicación"
2. Click en "Publicar app" (solo si es Internal)

### Error: "redirect_uri_mismatch"

**Causa:** La URI de callback no coincide con las configuradas en GCP.

**Solución:**

1. Verifica que `NEXTAUTH_URL` en `.env.local` sea exacta
2. Asegúrate de añadir `/api/auth/callback/google` al final
3. Comprueba en GCP que la URI esté añadida

### Usuario externo puede acceder

**Causa:** Falta verificación en el callback de `signIn`.

**Solución:**

```typescript
async signIn({ user }) {
  if (!user.email?.endsWith('@verifactu.business')) {
    return false;
  }
  return true;
}
```

## 📚 Referencias

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Workspace API](https://developers.google.com/workspace)

---

✅ Configuración completa. Ahora solo usuarios `@verifactu.business` pueden acceder al admin panel.
