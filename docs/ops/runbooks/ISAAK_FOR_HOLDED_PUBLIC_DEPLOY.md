# Holded Direct Connector - Public Deploy Runbook

## Objetivo

Runbook breve para desplegar el conector directo `Holded Connector for ChatGPT` y dejar `apps/app` listo para una prueba publica controlada.

## Orden recomendado

1. Confirmar secretos en Vercel para `apps/app`.
2. Confirmar migraciones de Prisma aplicadas para `external_connections` y soporte operativo del conector.
3. Desplegar `main`.
4. Validar endpoints OAuth, MCP y onboarding directo.
5. Ejecutar la checklist de `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`.

## Secrets minimos

- `SESSION_SECRET`
- `MCP_OAUTH_SECRET`
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS`
- `INTEGRATIONS_SECRET_KEY`
- `MCP_DEFAULT_TENANT_NAME`
- `MCP_DEFAULT_TENANT_NIF`
- `HOLDED_CONNECTION_LEGAL_VERSION` si se versiona la aceptacion legal

## Endpoints a verificar tras deploy

- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource/api/mcp/holded`
- `/oauth/authorize`
- `/oauth/token`
- `/api/mcp/holded`
- `/onboarding/holded`
- `/api/integrations/accounting/status?channel=chatgpt`

## Resultado esperado

- MCP descubre metadata sin bloquear usando la ruta especifica del recurso
- OAuth conserva el contexto original del conector
- si falta conexion Holded, redirige a onboarding directo sin login visible
- si la conexion ya existe, completa la autorizacion sin pedir API key
- `GET /api/mcp/holded` sin token responde `401` con challenge OAuth
- errores de `authorize`, `status`, `validate` y `connect` dejan `x-verifactu-request-id` para soporte
