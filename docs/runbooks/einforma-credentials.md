# eInforma: credenciales y operaci�n

## Variables de entorno (Vercel)

Configurar en **Project ? Settings ? Environment Variables**:

- `EINFORMA_CLIENT_ID`
- `EINFORMA_CLIENT_SECRET`
- `EINFORMA_TOKEN_URL`
- `EINFORMA_BASE_URL`
- `EINFORMA_SCOPE` (o `EINFORMA_AUDIENCE_OR_SCOPE` si aplica)

> No almacenar secretos en el repo ni en documentaci�n p�blica.

## Rotaci�n de credenciales (pasos)

1. Generar nuevas credenciales en el portal de eInforma.
2. Actualizar variables en Vercel (Production/Preview/Development).
3. Redeploy de `app` y `admin`.
4. Verificar acceso en endpoints internos.

## C�mo probar

- `GET /api/integrations/einforma/search?q=<texto>`
- `GET /api/integrations/einforma/company?taxId=<CIF/NIF>`

## Qu� revisar si falla

- **401/403**: credenciales inv�lidas o expiradas.
- **429**: rate limit / cr�ditos agotados.
- **Timeouts**: revisar conectividad y latencia.

## Logs �tiles

- Logs de Vercel de `app` y `admin`.
- Errores en `/api/integrations/einforma/*`.
