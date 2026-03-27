# Client Panel - Verifactu Business

## Estado: LEGACY / CONGELADO

`apps/client` queda oficialmente congelado.

Reglas desde este sprint:

- no abrir nuevas features aqui
- no usarlo como destino de nuevas decisiones de producto
- solo aceptar fixes puntuales, migraciones o trabajo de retirada controlada
- cualquier capacidad nueva debe evaluarse primero en `apps/isaak`, `apps/app` o `apps/admin`

## Contexto actual

Panel cliente multi-tenant legacy (ruta base `apps/client`) con `AppShell` compartido y experiencia antigua de Isaak contextual.

## Stack

- Next.js (App Router)
- TypeScript
- Prisma (`@verifactu/db`)
- UI compartida (`@verifactu/ui`)

## Isaak en Client (estado heredado)

- Isaak flotante activo en el `AppShell` del tenant
- proactividad por seccion
- selector de personalidad legado:
  - `Amigable`
  - `Profesional`
  - `Directo`

### Persistencia de personalidad

- Endpoint: `GET/PATCH /api/preferences`
- Archivo: `app/api/preferences/route.ts`
- Modelo actual:
  - intenta resolver usuario por `x-vf-user-id` o `userId`
  - usa fallback operativo por tenant
  - mantiene fallback local si no resuelve identidad

> Este comportamiento se considera transitorio mientras el ownership de producto se consolida fuera de `apps/client`.

## Arranque local

```bash
pnpm --filter verifactu-client dev
```

## Estado operativo

- Persistencia de personalidad: implementada con fallback robusto
- Auth de client: incompleta para identidad estricta
- Producto: congelado mientras `apps/isaak` crece como producto principal y `apps/app` se consolida como core canónico

## Qué trabajo sí se permite

- fixes de estabilidad
- tareas de migración
- documentación de retirada
- extracción de lógica compartida hacia `packages/*` o `apps/app`

## Qué trabajo no se permite

- nuevos flujos principales de usuario
- nuevas integraciones de producto
- nuevas decisiones de UX principal
- nuevas superficies públicas de Isaak
