# Plan publico de landings para conectores Holded

Fecha: 2026-04-25

## Decision aprobada

`holded.verifactu.business` sera el dominio publico de referencia para conectores que trabajan con Holded.

Actualizacion 2026-04-30:

- la raiz `/` sigue congelada
- se implementa un hub seguro intermedio en `/conectores`
- se anaden paginas agregadoras `/conectores/docs`, `/conectores/privacy`, `/conectores/dpa` y `/conectores/soporte`
- ChatGPT y Claude mantienen sus rutas especificas bajo `/conectores/*`

La raiz `holded.verifactu.business/` se convertira en hub de conectores con Holded en la Fase 3, despues de la aprobacion de OpenAI para el conector `ChatGPT + Holded`.

Hasta entonces, la raiz actual se mantiene congelada para no alterar URLs, copy, documentos o claims que puedan formar parte de la revision de OpenAI.

## Arquitectura objetivo

```txt
holded.verifactu.business/
├── /                         -> Estado actual: landing ChatGPT + Holded congelada
│                              -> Fase 3: hub de conectores con Holded en raiz si deja de estar bloqueada
├── /conectores               -> Hub seguro actual de conectores Holded
├── /conectores/docs          -> Indice documental por conector
├── /conectores/privacy       -> Indice de privacidad por conector
├── /conectores/dpa           -> Indice DPA por conector
├── /conectores/soporte       -> Indice de soporte por conector
├── /conectores/chatgpt        -> Landing canonica ChatGPT + Holded
├── /conectores/chatgpt/docs   -> Documentacion del conector ChatGPT + Holded
├── /conectores/chatgpt/privacy
├── /conectores/chatgpt/dpa
├── /conectores/claude         -> Landing canonica Claude + Holded
├── /conectores/claude/docs    -> Documentacion MCP Claude + Holded
├── /conectores/claude/privacy
└── /conectores/claude/dpa

isaak.verifactu.business/
├── /                          -> Aplicacion y landing principal de Isaak
├── /docs                      -> Documentacion general de producto
├── /integraciones             -> Holded, Sage y futuros ERPs/software
├── /privacy
├── /dpa
└── /terms
```

## Principios

- ChatGPT actual no se toca mientras la aplicacion siga pendiente de aprobacion por OpenAI.
- Los paths nuevos para ChatGPT pueden duplicar informacion, pero no deben sustituir ni redirigir la raiz todavia.
- Claude se puede mover gradualmente porque el conector ya funciona y el ERP permite modificar el formulario.
- Isaak no es un conector. Isaak es la aplicacion/asistente contable que agrupa conectores, ERPs y canales de IA.
- Holded, Sage, ChatGPT y Claude deben presentarse como integraciones o canales dentro del ecosistema Verifactu Business/Isaak, no como marcas propias.
- No usar dominios tipo `chatgpt.verifactu.business` o `claude.verifactu.business` salvo necesidad tecnica fuerte y revision legal/marca.

## Fases

### Fase 0 - Inventario y congelacion

Objetivo: saber que URLs estan en aprobacion, produccion o libres para evolucionar.

Tareas:

- [ ] Inventariar URLs publicas actuales de `apps/holded`.
- [ ] Identificar URLs enviadas a OpenAI para revision.
- [ ] Identificar URLs y documentos usados por el formulario del ERP para Claude.
- [ ] Marcar cada URL como `bloqueada`, `editable` o `nueva`.
- [ ] Confirmar que la raiz actual queda congelada hasta cierre de aprobacion OpenAI.

### Fase 1 - Paths nuevos sin promocion publica

Objetivo: preparar la estructura objetivo sin romper lo existente.

Tareas:

- [x] Crear `/conectores/chatgpt` como duplicado seguro de la landing actual.
- [x] Crear `/conectores/chatgpt/docs` como duplicado seguro de `/docs/chatgpt`.
- [x] Crear `/conectores/chatgpt/privacy` como duplicado seguro de `/privacy`.
- [x] Crear `/conectores/chatgpt/dpa` como duplicado seguro de `/dpa`.
- [x] Crear `/conectores/claude` como landing canonica inicial.
- [x] Crear `/conectores/claude/docs` como alias de `/docs/claude`.
- [x] Crear `/conectores/claude/privacy` como pagina especifica inicial.
- [x] Crear `/conectores/claude/dpa` como pagina especifica inicial.
- [ ] No enlazar de forma prominente `/conectores/chatgpt` hasta que OpenAI apruebe la app.

### Fase 2 - Migracion gradual de Claude

Objetivo: convertir `/conectores/claude` en la ruta canonica sin cortar el flujo actual.

Tareas:

- [x] Revisar copy de `/conectores/claude` para que no parezca afiliacion oficial con Anthropic.
- [x] Anadir disclaimer visible: Verifactu Business no esta afiliado, patrocinado ni respaldado por Anthropic ni Holded.
- [x] Revisar `/conectores/claude/docs` contra el estado real de MCP, OAuth, permisos y datos tratados.
- [x] Revisar `/conectores/claude/privacy` y `/conectores/claude/dpa` para reflejar Claude como canal especifico.
- [ ] Actualizar el formulario del ERP con la nueva landing y docs cuando el cambio este validado.
- [ ] Mantener `/claude` durante el periodo de convivencia.
- [ ] Redirigir `/claude` a `/conectores/claude` solo si el ERP y el trafico real lo permiten.

### Fase 3 - Hub Holded en raiz despues de aprobacion OpenAI

Decision elegida: opcion 2.

Objetivo: decidir si el hub seguro de `/conectores` se promociona tambien en la raiz `holded.verifactu.business/`.

Tareas:

- [ ] Esperar confirmacion de aprobacion de OpenAI para `ChatGPT + Holded`.
- [x] Definir e implementar el contenido del hub seguro de `/conectores`: ChatGPT, Claude y accesos legales/documentales.
- [ ] Decidir si el mismo esquema se replica en la raiz cuando deje de estar congelada.
- [ ] Mover la narrativa canonica de ChatGPT a `/conectores/chatgpt`.
- [ ] Mantener compatibilidad con URLs incluidas en la aprobacion de OpenAI.
- [ ] Actualizar enlaces internos desde la raiz hacia `/conectores/chatgpt` y `/conectores/claude`.
- [ ] Actualizar sitemap, canonical URLs y metadatos.
- [ ] Revisar Search Console, logs y analytics durante la migracion.
- [ ] Hacer redirects solo despues de validar que no rompen aprobacion, OAuth, formularios ni trafico existente.

### Fase 4 - Isaak como producto principal

Objetivo: lanzar `isaak.verifactu.business` como aplicacion/asistente contable completo.

Tareas:

- [ ] Mantener Isaak separado de las landings de conectores hasta que exista producto real publicable.
- [ ] Presentar Isaak como asistente contable que agrupa ERPs, software y canales conversacionales.
- [ ] Crear o consolidar `/integraciones` en `isaak.verifactu.business`.
- [ ] Explicar Holded, Sage y futuros ERPs como integraciones de Isaak.
- [ ] Explicar ChatGPT, Claude y futuros asistentes como canales compatibles cuando aplique.
- [ ] Enlazar desde landings de conectores hacia Isaak solo cuando el posicionamiento este listo.

## Reglas de no ruptura

- No modificar `holded.verifactu.business/` hasta cierre de aprobacion OpenAI.
- No cambiar endpoints OAuth/MCP ni `/.well-known/*` dentro de esta iniciativa salvo tarea tecnica especifica.
- No redirigir `/claude` de forma inmediata.
- No cambiar documentos legales compartidos sin revisar impacto en OpenAI, Claude y usuarios actuales.
- No eliminar rutas legacy mientras existan formularios, aprobaciones o trafico activo dependiente de ellas.

## Checklist de QA por fase

- [ ] Carga la landing raiz.
- [ ] Carga `/conectores/chatgpt`.
- [ ] Carga `/conectores/chatgpt/docs`.
- [ ] Carga `/conectores/chatgpt/privacy`.
- [ ] Carga `/conectores/chatgpt/dpa`.
- [x] Carga `/conectores/claude`.
- [x] Carga `/conectores/claude/docs`.
- [x] Carga `/conectores/claude/privacy`.
- [x] Carga `/conectores/claude/dpa`.
- [ ] OAuth ChatGPT sigue usando las URLs existentes.
- [ ] Claude sigue funcionando con la URL actual mientras dure la convivencia.
- [ ] No hay enlaces rotos en header, footer, CTA principal ni documentos legales.

## Estado inicial de implementacion

Implementado en esta primera ola:

- Documento canonico del plan.
- Hub seguro en `/conectores` con navegacion publica agregada.
- Rutas duplicadas nuevas para ChatGPT bajo `/conectores/chatgpt`.
- Landing canonica inicial para Claude bajo `/conectores/claude`.
- Rutas legales/documentales especificas para Claude bajo `/conectores/claude`.
- Indices publicos para docs, privacidad, DPA y soporte.
- Enlaces desde los indices de documentacion.

Pendiente:

- Inventario completo de URLs en aprobacion.
- Reescritura gradual de la landing Claude.
- Conversion de la raiz en hub despues de aprobacion OpenAI.
- Plan publico completo de `isaak.verifactu.business` para Fase II.
