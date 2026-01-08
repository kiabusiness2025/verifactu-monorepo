# Configuración Firebase Admin

Este documento describe cómo configurar Firebase Admin SDK para validación de tokens en producción.

## Variables de entorno requeridas

### FIREBASE_SERVICE_ACCOUNT

La aplicación requiere una variable de entorno `FIREBASE_SERVICE_ACCOUNT` que contenga las credenciales del Service Account de Firebase en formato JSON.

## Obtener Service Account

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Project Settings** (⚙️) → **Service Accounts**
4. Click en **Generate new private key**
5. Descarga el archivo JSON

## Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade nueva variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Pega todo el contenido del JSON (minificado en una línea)
   - **Environment**: Production, Preview, Development (según necesites)

Ejemplo del formato JSON (minificado):
```json
{"type":"service_account","project_id":"verifactu-prod","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@verifactu-prod.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

## Configurar en desarrollo local

### Opción 1: Variable de entorno (recomendado)

Crea archivo `.env.local` en `apps/landing/`:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

### Opción 2: Credenciales de aplicación por defecto

Instala Google Cloud CLI y autentica:

```bash
gcloud auth application-default login
```

## Validación

El endpoint `/api/auth/session` ahora:
- ✅ Valida que el idToken sea auténtico
- ✅ Verifica que no haya expirado
- ✅ Extrae uid y email del token
- ✅ Rechaza tokens inválidos con 401

## TTL de sesión

- **Cookie**: expira en 14 días
- **Firebase token**: expira en 1 hora
- El cliente debe refrescar el token periódicamente
- Próxima implementación: middleware que verifique token en cada request

## Logout

Endpoint `/api/auth/logout` limpia la cookie `__session` cross-dominio.

En la app, usa el hook `useLogout()`:

```typescript
import { useLogout } from "@/hooks/useLogout";

function MyComponent() {
  const { logout, isLoggingOut } = useLogout();
  
  return (
    <button onClick={logout} disabled={isLoggingOut}>
      Cerrar sesión
    </button>
  );
}
```

## Seguridad

⚠️ **IMPORTANTE**:
- NUNCA commitees el Service Account JSON al repositorio
- Usa `.gitignore` para excluir archivos de credenciales
- Rota las claves si son comprometidas
- Limita los permisos del Service Account (solo Firebase Authentication)

## Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT no está configurado"

Asegúrate de que la variable esté configurada en tu entorno (Vercel o `.env.local`).

### Error: "Token inválido"

- Verifica que el token no haya expirado (TTL 1 hora)
- Confirma que el proyecto Firebase sea el correcto
- Revisa que el Service Account tenga permisos

### Error en parsing JSON

El JSON debe estar minificado en una sola línea. Usa:

```bash
cat service-account.json | jq -c
```
