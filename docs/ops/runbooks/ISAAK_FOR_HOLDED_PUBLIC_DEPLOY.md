# Holded Direct Connector - Public Deploy Runbook

## Objetivo

Runbook breve para desplegar el conector directo `Holded Connector for ChatGPT` y dejar `apps/app` listo para una prueba publica controlada.

## Orden recomendado

1. Confirmar secretos en Vercel para `apps/app`.
2. Confirmar migraciones de Prisma aplicadas para `external_connections` y soporte operativo del conector.
3. Desplegar `main`.
4. Validar endpoints OAuth, MCP y onboarding directo.
5. Ejecutar la checklist de `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`.

## Reglas fijas de despliegue en Vercel

Estas reglas evitan repetir los errores ya vistos al desplegar `apps/app`:

1. El proyecto correcto de Vercel para este runtime es `verifactu-monorepo-app`.
2. El despliegue debe salir de un commit ya empujado a `main` o de un snapshot limpio equivalente. No desplegar desde un workspace sucio.
3. No enlazar carpetas temporales, exports ni `worktree` a proyectos nuevos de Vercel. El link canonico es el de `apps/app`.
4. Si se hace deploy manual por CLI, comprobar antes que el proyecto enlazado no sea el repo raiz `verifactu-monorepo`, sino `verifactu-monorepo-app`.
5. En Windows, evitar la via `vercel deploy --prebuilt` como ruta principal: puede fallar al crear symlinks en `.vercel/output`.
6. Si el deploy manual por CLI devuelve un error generico antes de arrancar build, preferir redeploy desde el dashboard de Vercel sobre el commit ya empujado.
7. Cualquier cambio en `apps/app/vercel.json` debe revisarse junto con el script real de install usado por el proyecto; no dejar wrappers o rutas relativas a medio migrar.
8. Antes de declarar bueno un deploy, validar al menos `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/api/mcp/holded`, `/oauth/authorize`, `/oauth/token`, `/api/mcp/holded` y `/onboarding/holded`.

## Regla practica para futuros incidentes

Si hay dudas entre:

- redeploy rapido desde dashboard sobre un commit conocido
- o deploy manual desde un entorno local improvisado

la opcion recomendada es la primera.

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
