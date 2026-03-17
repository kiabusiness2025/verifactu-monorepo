# Isaak — Instrucciones Operativas (2026)

## Alcance

Este documento cubre la operación de Isaak en `apps/app` (chat productivo y storage de conversaciones) y el ajuste de personalidad en `apps/client`.

## Autenticación real por contexto

### `apps/app` (dashboard / admin)

- Auth principal: cookie de sesión `__session` (httpOnly JWT).
- Lectura de sesión: `getSessionPayload()`.
- Fuente:
  - `packages/utils/session.ts`
  - `apps/app/lib/session.ts`

### `apps/client` (`/api/preferences`)

- No usa `__session` en la implementación actual.
- Resuelve usuario por:
  1. Header `x-vf-user-id`, o
  2. Query `userId`, o
  3. Fallback por `tenantId` al OWNER activo.
- Fuente: `apps/client/app/api/preferences/route.ts`.

## Endpoints activos de Isaak

### Chat

- `POST /api/chat`
  - `context.type=landing`: permite uso sin tenant.
  - `context.type=dashboard|admin`: exige sesión válida + tenant resuelto.
  - Fuente: `apps/app/app/api/chat/route.ts`.

### Historial de conversaciones

- `GET /api/isaak/conversations`
- `POST /api/isaak/conversations`
- `GET /api/isaak/conversations/[id]/messages`
- `POST /api/isaak/conversations/[id]/messages`
- `GET /api/isaak/conversations/[id]/share`
- `POST /api/isaak/conversations/[id]/share`

Todas estas rutas en `apps/app` requieren `__session` y ownership de conversación.

## Variables de entorno (mínimas recomendadas)

### Chat (`apps/app`)

- `SESSION_SECRET`
- `SESSION_SECRET_PREVIOUS` (opcional rotación)
- `CLAVE_API_AI_VERCEL` o `VERCEL_AI_API_KEY`
- `OPENAI_API_KEY` (fallback si no hay AI Gateway)

### Share links

- `NEXT_PUBLIC_APP_URL` (base para URL compartida)

### Soporte por email (si se usa inbound)

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `ADMIN_NOTIFICATION_EMAIL`
- `ISAAK_SUPPORT_ENABLED`

## Reglas operativas

1. Para smoke/manual API en `apps/app`, usar cookie:
   - `-H "Cookie: __session=<TOKEN>"`
2. Evitar asumir Bearer para endpoints de facturas/Isaak en `apps/app`.
3. Mantener prompts sin exponer detalles internos de infraestructura al usuario final.
4. Para contextos sin sesión (landing), no invocar lógica dependiente de tenant.

## Checklist de despliegue rápido de Isaak

- [ ] `POST /api/chat` responde en `landing`.
- [ ] `POST /api/chat` responde autenticado en `dashboard`.
- [ ] `GET /api/isaak/conversations` devuelve historial autenticado.
- [ ] `POST /api/isaak/conversations/[id]/share` genera `shareUrl` con expiración.
- [ ] Logs sin errores de resolución de tenant (`No tenant selected`).

## Notas

- El documento `docs/ISAAK_SUPPORT_SYSTEM.md` se mantiene para el flujo de soporte email; este archivo es la referencia operativa principal para producto/API en 2026.
