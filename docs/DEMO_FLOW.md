# Demo Flow (/demo) - Verifactu Business

Este documento describe el flujo real de la demo publica en `apps/app`, segun la implementacion actual.

## Objetivo

- Permitir que cualquier usuario pruebe una version realista del producto sin login.
- Mostrar datos simulados en todas las secciones clave del menu.
- Guiar la conversion a cuenta real y onboarding (prueba gratis).

## Rutas demo

Base:

- `/demo`

Subrutas con contenido:

- `/demo/invoices`
- `/demo/clients`
- `/demo/banks`
- `/demo/documents`
- `/demo/calendar`
- `/demo/settings`
- `/demo/isaak` (existente para muestras de IA)

Fallback:

- `/demo/[...path]` renderiza la misma vista que `/demo`.

## Acceso y middleware

Archivo: `apps/app/middleware.ts`

Comportamiento relevante:

- `/demo` y `/demo/*` son publicas (`NextResponse.next()`).
- `/` redirige a `/dashboard` (si no hay sesion, luego se redirige a login por flujo normal).
- `/dashboard/*` requiere sesion en produccion.
- `/api/admin/check` devuelve `200` con `{ isAdmin: false }` para compatibilidad con clientes legacy.
- `/api/admin/*` devuelve `410` (API admin legacy retirada).

## Layout demo y conversion CTA

Archivo: `apps/app/app/demo/layout.tsx`

El layout demo incluye:

- `Sidebar` y `Topbar` en modo demo (`isDemo`).
- Banner superior "Modo demo (datos simulados)".
- CTA "Probar con mis datos (1 mes gratis)".
- Barra flotante inferior persistente con CTA de conversion.

Destino actual del CTA:

- `${landingUrl}/auth/login?next=${appUrl}/onboarding`

## Navegacion demo

Archivos:

- `apps/app/config/nav.ts`
- `apps/app/components/layout/Sidebar.tsx`

`Sidebar` reutiliza `navItems` de dashboard y en modo demo transforma:

- `/dashboard/...` -> `/demo/...`

Resultado: Inicio, Facturas, Clientes, Bancos, Documentos, Calendario, Configuracion.

## Datos y comportamiento funcional

Fuente de datos demo:

- `apps/app/src/lib/data/client` (modo `"demo"`)

Formateo ES:

- `apps/app/src/lib/formatters.ts` usa locale `es-ES` para moneda, fechas y numeros.

Acciones bloqueadas:

- `apps/app/components/demo/DemoLockedButton.tsx`
- Todas las acciones de alta/edicion muestran toast de bloqueo y no ejecutan operaciones reales.

Paginas con datos simulados visibles:

- Inicio (`/demo`): resumen, mini PyG, facturas recientes, ejemplos Isaak.
- Facturas: listado + estado VeriFactu + QR demo.
- Clientes: facturacion agregada por cliente.
- Bancos: movimientos y conciliacion simulada.
- Documentos: listado y estado.
- Calendario: plazos simulados.
- Configuracion: tarjetas de ajustes en solo lectura.
- Isaak: tarjetas de sugerencias/respuestas demo.

## Isaak flotante y mensajes proactivos

Archivos:

- `apps/app/components/isaak/IsaakSmartFloating.tsx`
- `apps/app/components/isaak/IsaakProactiveBubbles.tsx`
- `apps/app/hooks/useIsaakDetection.ts`
- `apps/app/hooks/useProactiveMessages.ts`

Comportamiento:

- El chat flotante esta activo en demo.
- `useIsaakDetection` clasifica `/demo/*` como contexto `dashboard:user`.
- Los mensajes proactivos adaptan el enlace de seccion segun base path:
  - demo: `/demo/...`
  - app real: `/dashboard/...`

## Relacion con landing (hero y capturas)

Para generar assets reales del hero desde `/demo`, usar:

- `docs/DEMO_CAPTURE_README.md`

Scripts:

- `pnpm run capture:demo:mockups`
- `pnpm run capture:demo:hero`

## Checklist rapido de verificacion

1. Abrir `/demo` en incognito sin login.
2. Navegar por todas las secciones del menu lateral.
3. Confirmar que no hay operaciones reales (solo lectura + toasts de bloqueo).
4. Verificar boton flotante de Isaak y burbujas proactivas.
5. Probar CTA "Probar con mis datos (1 mes gratis)" y validar redireccion a login/onboarding.
6. Revisar que importes/fechas se muestren en formato `es-ES`.

## Archivos clave

- `apps/app/app/demo/layout.tsx`
- `apps/app/app/demo/page.tsx`
- `apps/app/app/demo/invoices/page.tsx`
- `apps/app/app/demo/clients/page.tsx`
- `apps/app/app/demo/banks/page.tsx`
- `apps/app/app/demo/documents/page.tsx`
- `apps/app/app/demo/calendar/page.tsx`
- `apps/app/app/demo/settings/page.tsx`
- `apps/app/app/demo/isaak/page.tsx`
- `apps/app/app/demo/[...path]/page.tsx`
- `apps/app/middleware.ts`

