# eInforma: credenciales y operacion

## Variables de entorno (Vercel)

Configurar en **Project > Settings > Environment Variables**:

- `EINFORMA_CLIENT_ID`
- `EINFORMA_CLIENT_SECRET`
- `EINFORMA_TOKEN_URL`
- `EINFORMA_API_BASE_URL` (o `EINFORMA_BASE_URL` si aplica)
- `EINFORMA_SCOPE` (o `EINFORMA_AUDIENCE_OR_SCOPE` si aplica)
- `EINFORMA_TIMEOUT_MS` (opcional, recomendado)

> No almacenar secretos en el repo ni en documentacion publica.

## Rotacion de credenciales (pasos)

1. Generar nuevas credenciales en el portal de eInforma.
2. Actualizar variables en Vercel (Production/Preview/Development).
3. Redeploy de `app` y `admin`.
4. Verificar acceso en endpoints internos.

## Como probar

- `GET /api/integrations/einforma/search?q=<texto>`
- `GET /api/integrations/einforma/company?taxId=<CIF/NIF>`
- `POST /api/integrations/einforma/enrich-tenant` (usa el tenant activo)
- Admin: `GET /api/admin/einforma/profile?taxId=<CIF/NIF>`
  - Forzar refresh: `...&refresh=1`

## Que revisar si falla

- **401/403**: credenciales invalidas o expiradas.
- **429**: rate limit / creditos agotados.
- **Timeouts**: revisar conectividad y latencia.

## Logs utiles

- Logs de Vercel de `app` y `admin`.
- Errores en `/api/integrations/einforma/*`.

## Cache y consumo

- Cache por snapshot (TenantProfile): 30 dias si `einformaTaxIdVerified=true`.
- Respuesta incluye `cached`, `cacheSource`, `lastSyncAt`.
- En Admin existe boton **Actualizar** (refresh=1) que fuerza llamada y consume creditos.
