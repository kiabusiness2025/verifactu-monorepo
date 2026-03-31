# Isaak for Holded - Public Deploy Runbook

## Objetivo

Runbook breve para desplegar `Isaak for Holded` y dejar el entorno listo para una prueba publica controlada.

## Orden recomendado

1. Confirmar secretos en Vercel para `apps/app`.
2. Confirmar migracion de Prisma aplicada en la base de datos.
3. Desplegar `main`.
4. Validar endpoints OAuth y MCP.
5. Ejecutar la checklist de `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`.

## Secrets minimos

- `SESSION_SECRET`
- `MCP_OAUTH_SECRET`
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
- `INTEGRATIONS_SECRET_KEY`
- `MCP_DEFAULT_TENANT_NAME`
- `MCP_DEFAULT_TENANT_NIF`

## Endpoints a verificar tras deploy

- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource/api/mcp/holded`
- `/oauth/authorize`
- `/oauth/token`
- `/api/mcp/holded`
- `/onboarding/holded`

## Resultado esperado

- MCP descubre metadata sin bloquear usando la ruta especifica del recurso
- OAuth resuelve tenant
- si falta conexion Holded, redirige a onboarding
- si la conexion ya existe, completa la autorizacion sin pedir API key
- `GET /api/mcp/holded` sin token responde `401` con challenge OAuth
