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
8. Mantener disponible tambien `scripts/vercel-install.mjs` en la raiz del monorepo. Vercel puede ejecutar `installCommand` desde el root o desde `apps/app` segun el contexto del proyecto y del redeploy.
9. Antes de declarar bueno un deploy, validar al menos `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource/api/mcp/holded`, `/oauth/authorize`, `/oauth/token`, `/api/mcp/holded` y `/onboarding/holded`.

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
- `/onboarding`
- `/onboarding/holded`
- `/api/integrations/accounting/status?channel=chatgpt`

## Ajustes aplicados (2026-04-06)

### Public onboarding UX

- `apps/holded/app/onboarding/page.tsx` reescrita como pagina de alcance funcional del conector
- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx` reescrita con formulario unico de empresa + contacto + API key
- `apps/holded/app/onboarding/holded/page.tsx` actualizado para precargar identidad inicial desde tenant/profile

### Public navigation and mobile handoff

- `apps/holded/app/lib/holded-navigation.ts` agrega helpers de flujo (`buildConnectorIntroUrl`, `buildConnectorConnectUrl`)
- se preservan `source`, `channel`, `next`, `onboarding_token` entre intro y connect
- test de regresion en `apps/holded/app/lib/holded-navigation.test.ts`

### Public connect API and data capture

- `apps/holded/app/api/holded/connect/route.ts` ahora valida y persiste identidad minima requerida antes de conectar
- campos requeridos: `companyName`, `taxId`, `contactFirstName`, `contactLastName`, `contactEmail`
- campos opcionales: `legalName`, `contactPhone`
- persistencia: `tenant`, `tenant.profile` (`source: manual`) y `user`
- soporte de `validationToken` mantenido para evitar doble probe

### Test status

Validated test suites for this rollout:

- `apps/holded/app/api/holded/connect/route.test.ts`
- `apps/holded/app/lib/holded-navigation.test.ts`
- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.test.tsx`
- `apps/app/app/oauth/authorize/route.test.ts`
- `apps/app/app/api/integrations/accounting/validate/route.test.ts`
- `apps/app/app/api/integrations/accounting/connect/route.test.ts`
- `apps/app/app/api/mcp/holded/route.test.ts`
- `apps/app/lib/integrations/holdedMcpTools.test.ts`

Expected combined result from latest focused runs: all passing.

## Resultado esperado

- MCP descubre metadata sin bloquear usando la ruta especifica del recurso
- OAuth conserva el contexto original del conector
- si falta conexion Holded, redirige a onboarding directo sin login visible
- si la conexion ya existe, completa la autorizacion sin pedir API key
- `GET /api/mcp/holded` sin token responde `401` con challenge OAuth
- errores de `authorize`, `status`, `validate` y `connect` dejan `x-verifactu-request-id` para soporte
