# Estado consolidado - Holded + ChatGPT (2026-04-15)

## Objetivo del documento

Dejar trazabilidad completa antes de continuar desarrollo:

- que se cambio
- que se publico
- que se valido
- que quedo pendiente y donde
- como retomar sin perder trabajo

## Resumen ejecutivo

- El flujo publico del conector quedo ajustado para abrir login primero al iniciar desde ChatGPT.
- La activacion minima obligatoria queda en `OAuth + API key`.
- La UX de errores del formulario se mejoro con mensajes claros, borde rojo y foco automatico al primer campo invalido.
- Cambios publicados en `main`.
- El arbol local se limpio y el trabajo paralelo no incluido se guardo en stash con inventario completo.

## Commits relevantes (orden reciente)

1. `8959a61f` - Enforce ChatGPT login-first and polish onboarding error UX
2. `25377834` - Show explicit onboarding field errors and keep tax/legal optional
3. `f84122cc` - Separate Holded connector from Isaak namespaces
4. `0cb624b2` - Add canonical Holded integration routes and replace legacy links
5. `98ea2f7d` - Unify Holded reconnect flow and branded notification emails

## Cambios funcionales entregados

### 1) Entrada ChatGPT con login explicito

- Si el flujo OAuth arranca sin sujeto autenticado, redirige primero a `/auth/holded` con source dedicado.
- Tras login, continua a onboarding del conector con token de contexto.

Archivos:

- `apps/app/app/oauth/authorize/route.ts`
- `apps/app/app/oauth/authorize/route.test.ts`
- `apps/holded/app/auth/holded/page.tsx`

### 2) Activacion minima obligatoria: OAuth + API key

- En canal `chatgpt`, incluso con `reset=1`, el onboarding arranca en paso de API key.
- Datos de persona/empresa pasan a completado posterior sin bloquear activacion inicial.

Archivos:

- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx`
- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.test.tsx`

### 3) UX de errores mas clara

- Mensajes explicitos por campo.
- Borde rojo en inputs con error.
- Foco automatico al primer campo invalido.

Archivo principal:

- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.tsx`

## Validacion ejecutada

Suites ejecutadas y en verde:

- `apps/app/app/oauth/authorize/route.test.ts`
- `apps/holded/app/onboarding/holded/OnboardingHoldedClient.test.tsx`

Resultado final validado:

- 2 suites OK, 16 tests OK.

## Documentacion de QA operativa

Checklist de validacion manual (5-10 minutos):

- `docs/ops/runbooks/HOLDED_CHATGPT_LOGIN_FIRST_QA_2026-04-15.md`

Contrato de fase actualizado:

- `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`

## Estado actual del repositorio

- Branch: `main`
- HEAD remoto/local: alineados en `8959a61f`
- Working tree: limpio (sin cambios locales activos)

## Trabajo paralelo preservado en stash

Stash principal:

- `stash@{0}` - `wip-cleanup-2026-04-15`

### Inventario completo de archivos en stash (tracked + untracked)

- `.claude/settings.json`
- `.claude/settings.local.json`
- `apps/holded/app/admin/page.tsx`
- `apps/holded/app/capacidades/page.tsx`
- `apps/holded/app/components/HoldedHeroVisual.tsx`
- `apps/holded/app/components/HoldedSiteChrome.tsx`
- `apps/holded/app/components/SupportAssistantClient.tsx`
- `apps/holded/app/cookies/page.tsx`
- `apps/holded/app/dashboard/page.tsx`
- `apps/holded/app/demo-recording/DemoVideoGrid.tsx`
- `apps/holded/app/demo-recording/page.tsx`
- `apps/holded/app/legal/page.tsx`
- `apps/holded/app/onboarding/page.tsx`
- `apps/holded/app/onboarding/profile/HoldedConversationalOnboardingClient.tsx`
- `apps/holded/app/onboarding/profile/page.tsx`
- `apps/holded/app/onboarding/success/HoldedFusionSuccess.tsx`
- `apps/holded/app/page.tsx`
- `apps/holded/app/planes/page.tsx`
- `apps/holded/app/privacy/page.tsx`
- `apps/holded/app/registro/gracias/page.tsx`
- `apps/holded/app/support/page.tsx`
- `apps/holded/app/terms/page.tsx`
- `apps/holded/app/verificar/page.tsx`
- `apps/holded/scripts/generate-demo-clips.mjs`
- `apps/holded/scripts/verify-sora-access.mjs`
- `apps/isaak/app/api/settings/connections/holded/disconnect/route.ts`
- `apps/isaak/app/lib/communications/holded-disconnect-emails.ts`

## Como retomar el trabajo guardado

Aplicar sin borrar stash:

```bash
git stash apply "stash@{0}"
```

Aplicar y eliminar stash:

```bash
git stash pop "stash@{0}"
```

Ver diffs del stash antes de aplicar:

```bash
git stash show --include-untracked --name-only "stash@{0}"
git stash show -p "stash@{0}"
```

## Nota de seguridad de alcance

El stash contiene cambios amplios de copy/branding y demos en `apps/holded`, ademas de cambios de emails en `apps/isaak`.
Se recomienda recuperarlo en una rama dedicada antes de mezclar con el flujo publico ya publicado.
