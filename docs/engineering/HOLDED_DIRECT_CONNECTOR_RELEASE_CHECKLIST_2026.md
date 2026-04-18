# Holded Direct Connector Release Checklist 2026

Ultima actualizacion: 2026-04-13

## Objetivo

Checklist operativo para desplegar y validar el conector directo Holded sin perder:

- dominio publico `holded.verifactu.business`
- OAuth Google existente
- rutas legales actuales
- runtime privado del panel en `apps/app`
- contratos ya estabilizados del conector

## Superficies incluidas

- `apps/holded`
- `apps/app`
- `packages/integrations`
- Prisma / migraciones ya aplicadas

## 1. Entorno requerido

### `apps/app`

Variables minimas:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `SESSION_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAILS`
- `INTEGRATIONS_SECRET_KEY`
- `HOLDED_API_BASE_URL`
- `HOLDED_TIMEOUT_MS`
- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_CONNECTION_LEGAL_VERSION`
- `MCP_SHARED_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_API_KEY_HOLDED`
- `RESEND_FROM_HOLDED`

Observaciones:

- `ADMIN_EMAILS` debe incluir la cuenta real de soporte y las cuentas autorizadas del panel admin del conector.
- No usar valores reales en `.env.example`.

### `apps/holded`

Variables minimas:

- `NEXT_PUBLIC_HOLDED_SITE_URL`
- `HOLDED_PUBLIC_URL`
- `SESSION_SECRET`
- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `INTEGRATIONS_SECRET_KEY`
- `HOLDED_API_BASE_URL`
- `HOLDED_TIMEOUT_MS`
- `NEXT_PUBLIC_HOLDED_FIREBASE_API_KEY`
- `NEXT_PUBLIC_HOLDED_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_HOLDED_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_HOLDED_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_HOLDED_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_HOLDED_FIREBASE_APP_ID`
- `NEXT_PUBLIC_HOLDED_ENABLE_GOOGLE_LOGIN`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `RESEND_FROM_HOLDED`

Si App Check esta activo:

- `NEXT_PUBLIC_HOLDED_RECAPTCHA_SITE_KEY`
- `NEXT_PUBLIC_HOLDED_FIREBASE_APP_CHECK_DEBUG_TOKEN` solo en local o diagnostico

## 2. Invariantes de release

- La landing publica sigue siendo `holded.verifactu.business`.
- No se cambian las URLs legales que ya usa OAuth Google.
- `apps/holded` no publica el runtime MCP.
- `apps/app` sigue siendo el runtime real del conector y del panel admin.
- El panel admin del conector sigue protegido por allowlist.

## 3. Smoke tecnico previo al despliegue

Desde la raiz:

```bash
pnpm --filter verifactu-holded exec tsc --noEmit
pnpm --filter verifactu-app exec tsc --noEmit
pnpm --filter @verifactu/integrations type-check
```

Tests minimos:

```bash
pnpm --filter verifactu-holded test -- --runInBand app/api/holded/validate/route.test.ts app/api/holded/connect/route.test.ts app/api/holded/access-requests/route.test.ts app/api/holded/claims/route.test.ts app/onboarding/holded/OnboardingHoldedClient.test.tsx
pnpm --filter verifactu-app test -- --runInBand app/dashboard/integrations/page.test.tsx app/dashboard/integrations/isaak-for-holded/page.test.tsx app/api/integrations/accounting/status/route.test.ts app/api/integrations/accounting/connect/route.test.ts app/api/integrations/accounting/disconnect/route.test.ts app/api/integrations/accounting/rotate-key/route.test.ts
```

Tests de rutas dinamicas:

```bash
pnpm --filter verifactu-holded test -- --runInBand --runTestsByPath app/api/holded/claims/[id]/route.test.ts
pnpm --filter verifactu-app test -- --runInBand --runTestsByPath app/api/integrations/accounting/access-requests/[id]/route.test.ts app/api/integrations/accounting/claims/[id]/route.test.ts app/api/integrations/accounting/memberships/[id]/route.test.ts app/api/integrations/accounting/recipients/[id]/route.test.ts
```

## 4. Smoke funcional posterior al despliegue

### Publico

Comprobar:

1. La landing carga en `https://holded.verifactu.business`.
2. El acceso por Google sigue funcionando con las URLs legales actuales.
3. `POST /api/holded/validate` responde y devuelve `requestId`.
4. El onboarding detecta empresa y maneja `duplicateConflict`.
5. `access-requests` y `claims` publicas responden correctamente.

### Privado

Comprobar:

1. `https://app.verifactu.business/dashboard/integrations/holded` carga con la cuenta admin allowlisted.
2. Una cuenta no allowlisted recibe bloqueo del panel admin.
3. El `status` privado devuelve `requestId`, `governanceFlags` y `availableActions`.
4. `disconnect` exige confirmacion reforzada y bloquea cuando aplica.
5. `rotate-key`, `memberships`, `recipients`, `access-requests` y `claims` responden con el contrato esperado.

## 5. Observabilidad minima

### `apps/app`

Puntos a revisar:

- logs de `status`
- logs de `connect`
- logs de `disconnect`
- logs de `rotate-key`
- logs de `claims`
- logs de `access-requests`

Campos minimos a seguir:

- `requestId`
- `entryChannel`
- `tenantId` cuando aplique
- `stage`
- `error`

### `apps/holded`

Puntos a revisar:

- `validate`
- `connect`
- `status`
- `claims`
- `access-requests`
- `/api/auth/google/diagnostics` si hay incidencia de Google/App Check

## 6. Riesgos que bloquean release

- `.env.example` con secretos o claves reales
- `tsc --noEmit` roto en `apps/app` o `apps/holded`
- regresiones en `validate`, `connect` o `disconnect`
- allowlist admin rota
- cambio de URLs legales del flujo Google
- perdida de `requestId` en errores del runtime privado

## 7. Criterio de salida

La release se considera lista cuando:

- los checks tecnicos pasan
- el smoke funcional publico y privado pasa
- no hay secretos en ejemplos de entorno
- el panel admin del conector sigue restringido
- `holded.verifactu.business` sigue siendo la landing publica

## Referencias

- [apps/app/README.md](../../apps/app/README.md)
- [apps/holded/README.md](../../apps/holded/README.md)
- [HOLDED_DIRECT_CONNECTOR_ENDPOINT_AND_CONTRACTS_2026.md](./HOLDED_DIRECT_CONNECTOR_ENDPOINT_AND_CONTRACTS_2026.md)
- [HOLDED_DIRECT_CONNECTOR_BACKFILL_RUNBOOK_2026.md](./HOLDED_DIRECT_CONNECTOR_BACKFILL_RUNBOOK_2026.md)
