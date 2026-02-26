# Client Panel - Verifactu Business

Panel cliente multi-tenant (ruta base `apps/client`) con `AppShell` compartido y experiencia de Isaak contextual.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma (`@verifactu/db`)
- UI compartida (`@verifactu/ui`)

## Isaak en Client (2026)

- Isaak flotante activo en el `AppShell` del tenant.
- Proactividad por sección (dashboard, facturas, clientes, bancos, ajustes, asistente).
- Selector de personalidad:
  - `Amigable`
  - `Profesional`
  - `Directo`

### Persistencia de personalidad

- Endpoint: `GET/PATCH /api/preferences`
- Archivo: `app/api/preferences/route.ts`
- Modelo de persistencia actual:
  - Intenta resolver usuario por `x-vf-user-id` o `userId` en query.
  - Si no existe, usa fallback operativo por tenant (OWNER activo).
  - Si tampoco resuelve usuario, mantiene funcionamiento con fallback local.

> Nota: este comportamiento es temporal mientras se completa auth/sesión estricta en `apps/client`.

## Integración de AppShell

- `app/t/[tenantSlug]/AppShellLayout.tsx` pasa `toneApiPath` a Isaak:
  - `/api/preferences?tenantId=<tenantId>`
- El dock compartido (`packages/ui/src/isaak/IsaakDock.tsx`) consume ese endpoint cuando está disponible.

## Endpoints relevantes

- `POST /api/provision/demo`
- `POST /api/invoices/[invoiceId]/issue`
- `GET/PATCH /api/preferences`

## Arranque local

```bash
pnpm --filter verifactu-client dev
```

URL local por defecto: `http://localhost:3000` (según configuración del entorno).

## Estado

- Persistencia de personalidad: implementada con fallback robusto.
- Auth de client: pendiente de integración completa para identidad de usuario estricta.
