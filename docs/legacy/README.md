# Legacy documentation

Estado: carpeta canonica para documentacion historica, obsoleta o no canonica.

Esta carpeta agrupa documentos que ya no deben usarse como fuente principal para nuevas decisiones de producto, arquitectura, marketing, inversion o implementacion.

## Regla principal

Un documento puede estar aqui por tres motivos:

1. Describe una arquitectura o estrategia anterior.
2. Contiene naming, rutas o ownership que ya no encajan con la estrategia actual.
3. Sigue siendo util como memoria historica, pero no debe guiar trabajo nuevo.

## Arquitectura actual de referencia

La lectura canonica actual es:

- `verifactu.business` = hub principal, marca madre y capa de confianza regulatoria.
- `isaak.verifactu.business` = producto principal y orquestador conversacional empresarial.
- `holded.verifactu.business` = primer hub vertical de conectores, empezando por Holded.
- ChatGPT y Claude = canales/conectores, no identidad central del producto.
- `apps/app` = core tecnico compartido, panel avanzado y runtime OAuth/MCP.
- `apps/client` = legacy congelado.
- `apps/mobile` = fuera del roadmap inmediato hasta estabilizar core web.

## Como marcar un documento como legacy

Antes de mover un archivo aqui, anadir en el documento original o en el commit:

```md
> Estado documental: LEGACY / historico.
> No usar como fuente canonica para nuevas decisiones.
> Fuente actual: docs/product/MONOREPO_CURRENT_STRUCTURE_2026.md
```

## Subcarpetas sugeridas

```txt
docs/legacy/
  root/                 # documentos antiguos movidos desde raiz
  isaak-old/            # planes anteriores de Isaak no canonicos
  holded-old/           # planes anteriores del conector Holded no canonicos
  client-old/           # documentacion de apps/client si se archiva
  mobile-old/           # documentacion mobile fuera del roadmap actual
  2026-reorg/           # notas de la reorganizacion actual
```

## No mover sin revision

No mover directamente documentos que afecten a:

- revision OpenAI o Anthropic;
- OAuth/MCP;
- `/.well-known/*`;
- privacidad, DPA o legal;
- rutas publicas ya indexadas o enviadas a revision;
- valores exactos de issuer/resource/callback.

Estos documentos deben marcarse primero como `bloqueado` en el inventario y revisarse en un PR separado.

Actualizado: 2026-04-30
