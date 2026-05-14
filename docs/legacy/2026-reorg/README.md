# Legacy staging - reorganizacion 2026

Estado: staging documental para la limpieza del monorepo.

Esta carpeta sirve para preparar la migracion de documentos historicos sin borrar contexto ni romper rutas de referencia.

## Objetivo

Separar documentacion actual de documentacion historica para que el equipo pueda trabajar con una estructura clara:

- producto actual;
- ingenieria actual;
- operaciones actuales;
- inversores y viabilidad economica;
- legacy congelado.

## Estrategia actual consolidada

La reorganizacion debe proteger esta lectura:

```txt
verifactu.business        -> hub principal / cumplimiento / confianza / marca madre
isaak.verifactu.business  -> producto principal / orquestador empresarial
holded.verifactu.business -> primer hub vertical de conectores
apps/app                  -> core tecnico compartido + OAuth/MCP + panel avanzado
apps/client               -> legacy congelado
apps/mobile               -> congelado hasta estabilizar web/core
```

## Candidatos iniciales a revisar como legacy

Estos candidatos no se mueven automaticamente. Deben auditarse antes:

- changelogs largos en README raiz;
- secciones antiguas de `Isaak estado Feb 2026`;
- documentos que presenten Isaak como subpantalla o derivado de Holded;
- docs de `apps/client` como producto activo;
- docs mobile que sugieran roadmap inmediato;
- documentos antiguos de root ya duplicados en `docs/legacy/root/`;
- documentos de review publica anterior que ya no sean canonicos.

## Candidatos bloqueados

No mover sin PR separado:

- setup del conector ChatGPT + Holded enviado a revision;
- documentos con valores OAuth/MCP exactos;
- privacy/DPA/legal;
- docs vinculados a `/.well-known/*`;
- root actual de `holded.verifactu.business` mientras siga congelado por review.

## Criterio de archivo

Mover a legacy cuando:

1. exista documento canonico nuevo;
2. el README o indice apunte al canonico nuevo;
3. el documento antiguo tenga valor historico pero no operativo;
4. no este vinculado a revision externa o legal.

## Criterio de eliminacion futura

Eliminar solo despues de una segunda revision si:

- es duplicado exacto;
- esta vacio;
- no tiene referencias;
- no contiene informacion legal/operativa/historica util.

## Archivado

### Tanda 2026-05-14 — limpieza de coherencia conectores

Documentos point-in-time sin referencias vivas, superados por el estado
actual del conector. Cumplen los 4 criterios de archivo.

- `HOLDED_DIRECT_CONNECTOR_ONBOARDING_LIGHT_PROFILE_EXECUTION_PLAN_2026-04-14.md` — plan de ejecucion ya completado.
- `HOLDED_DIRECT_CONNECTOR_ONBOARDING_LIGHT_PROFILE_QA_MATRIX_2026-04-14.md` — matriz QA de esa misma entrega.
- `HOLDED_PUBLIC_LANDINGS_REMEDIATION_2026-04-30.md` — remediacion puntual de landings, ya desplegada.
- `INTEGRATIONS_PUBLIC_LAYER_PLAN_2026-04-10.md` — plan de capa publica, superado por la estructura `/conectores/*`.
- `LANDING_AUDIT_2026.md` — auditoria visual puntual (2026-05-03).

Actualizado: 2026-05-14
