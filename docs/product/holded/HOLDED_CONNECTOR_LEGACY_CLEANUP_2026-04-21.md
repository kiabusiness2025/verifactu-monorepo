# Holded Connector Legacy Cleanup 2026-04-21

## Resumen

Esta entrega cierra la limpieza especifica del proyecto `ChatGPT + Holded` sin tocar la linea de producto `Isaak` fuera del conector.

El foco ha sido separar contrato publico y compatibilidad interna:

- contrato canonico del conector con naming `holded`
- compatibilidad temporal para callers que aun usan headers legacy `x-isaak-*`
- documentacion del conector alineada con `Holded direct connector`

## Objetivo

Reducir la dependencia visible del naming historico `Isaak` en el flujo directo de Holded sin abrir una migracion completa de base de datos, runtime o producto.

## Cambios aplicados

### 1. Contrato canonico de headers

Headers canonicos del conector:

- `x-holded-entry-channel`
- `x-holded-tenant-id`

Headers legacy aceptados temporalmente:

- `x-isaak-entry-channel`
- `x-isaak-tenant-id`

## 2. Compatibilidad explicita

Las rutas del bloque `apps/app/app/api/integrations/accounting/*` ahora centralizan la lectura de headers en una utilidad comun:

- [apps/app/lib/integrations/holdedConnectorRequest.ts](../../../apps/app/lib/integrations/holdedConnectorRequest.ts)

Cuando una peticion entra con headers legacy, la API sigue respondiendo correctamente pero devuelve metadata de deprecacion:

- `deprecation: true`
- `x-verifactu-compatibility-mode: legacy-isaak-headers`
- `x-verifactu-deprecated-headers: ...`

Esto permite mantener compatibilidad sin seguir tratando el naming legacy como contrato valido a futuro.

## 3. Rutas revisadas

Se ha normalizado el bloque principal del conector:

- `connect`
- `validate`
- `status`
- `disconnect`
- `rotate-key`
- `sync/run`
- `sync/push`
- `sync/pull`
- `claims`
- `claims/[id]`
- `recipients`
- `access-requests`

## 4. Tests actualizados

Los tests del conector ahora usan `x-holded-*` como camino principal.

Se mantienen casos explicitos de compatibilidad legacy en:

- [connect/route.test.ts](../../../apps/app/app/api/integrations/accounting/connect/route.test.ts)
- [validate/route.test.ts](../../../apps/app/app/api/integrations/accounting/validate/route.test.ts)

## 5. Documentacion ajustada

Se ha actualizado la narrativa tecnica en:

- [apps/holded/README.md](../../../apps/holded/README.md)
- [packages/integrations/README.md](../../../packages/integrations/README.md)

El conector ya no se documenta como derivado funcional de `Isaak`. Si queda naming `isaak_*`, se considera detalle interno heredado.

## Lo que no se ha tocado

Esta limpieza no incluye:

- rename de tablas `isaak_*`
- rename de modelos Prisma heredados
- rename de env vars `ISAAK_*`
- limpieza de `apps/isaak`
- migracion del storage historico del asistente

Todo eso sigue siendo una posible migracion futura, pero no forma parte del cierre del conector directo.

## Criterio de decision

Para el conector directo se ha aplicado esta regla:

- `cambiar` si afecta a contrato publico, copy, docs o tests del flujo Holded
- `dejar` si es naming interno de persistencia o runtime compartido
- `deprecar` si puede seguir teniendo consumidores externos temporales

## Validacion

Verificaciones ejecutadas:

- `pnpm -C apps/app exec jest app/api/integrations/accounting/connect/route.test.ts app/api/integrations/accounting/status/route.test.ts app/api/integrations/accounting/validate/route.test.ts app/api/integrations/accounting/disconnect/route.test.ts app/api/integrations/accounting/sync/run/route.test.ts --runInBand`
- `pnpm -C apps/app exec tsc -p tsconfig.json --noEmit`

## Siguiente paso recomendado

Cuando confirmemos que no quedan callers externos usando `x-isaak-*`, el siguiente cierre natural es:

1. eliminar fallback de headers legacy
2. borrar tests de compatibilidad legacy
3. dejar solo `x-holded-*` en todo el bloque publico del conector
