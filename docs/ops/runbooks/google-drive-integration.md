# Google Drive Integration (Cliente) - Runbook

Fecha: 2026-03-06

## Objetivo
Habilitar integración opcional de Google Drive para clientes desde `Dashboard > Integraciones`, creando automáticamente la carpeta `verifactu_business` en el Drive del cliente.

## Variables requeridas
En `apps/app`:
- `NEXTAUTH_URL` (ej. `https://app.verifactu.business`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `INTEGRATIONS_SECRET_KEY` (clave privada para cifrar tokens en `tenant_integrations.api_key_enc`)

## Configuración OAuth en Google Cloud
1. Ir a **APIs & Services > Credentials**.
2. Crear o editar **OAuth Client ID** (Web application).
3. Añadir Authorized redirect URI:
   - `https://app.verifactu.business/api/integrations/gdrive/callback`
4. Guardar `client_id` y `client_secret` en variables de entorno.

## Scopes solicitados
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.metadata`
- `https://www.googleapis.com/auth/drive.file`

## Flujo
1. Usuario pulsa **Conectar Google Drive** en `/dashboard/integrations`.
2. `GET /api/integrations/gdrive/auth` inicia OAuth.
3. Google redirige a callback:
   - `GET /api/integrations/gdrive/callback`
4. Callback:
   - intercambia `code` por tokens
   - busca/crea carpeta `verifactu_business`
   - guarda estado cifrado en `tenant_integrations` (`provider = google_drive`)
5. UI consulta:
   - `GET /api/integrations/gdrive/status`
   - `POST /api/integrations/gdrive/disconnect`

## Validación rápida
1. Abrir `/dashboard/integrations`.
2. Conectar Google Drive.
3. Verificar:
   - estado `connected`
   - email Google asociado
   - carpeta `verifactu_business`
4. Probar desconexión.

## Estado actual (implementado)
- OAuth endpoints listos en:
  - `/api/integrations/gdrive/auth`
  - `/api/integrations/gdrive/callback`
  - `/api/integrations/gdrive/status`
  - `/api/integrations/gdrive/disconnect`
- En callback se crea automáticamente la carpeta `verifactu_business` en el Drive del cliente.
- Tokens y metadata se guardan cifrados en `tenant_integrations`.

## Pendiente para activar en producción
- Completar OAuth config en Google Cloud con el mismo proyecto del workspace.
- Cargar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en entorno de Vercel.
- Verificar `NEXTAUTH_URL` público correcto para callback.

## Notas de seguridad
- Drive se usa como integración opcional, no como storage primario.
- Tokens guardados cifrados en DB.
- Si falta configuración OAuth, las rutas devuelven error controlado.
