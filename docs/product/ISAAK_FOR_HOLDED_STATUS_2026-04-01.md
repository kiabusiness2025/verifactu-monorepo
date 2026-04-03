# Isaak for Holded - Estado y cambios 2026-04-01

## Resumen ejecutivo

Durante esta fase se cerraron cuatro bloques principales:

1. saneamiento del contrato de OpenAI para usar una clave de proyecto real y unica
2. restauracion del discovery publico del servidor MCP de Holded manteniendo protegida la ejecucion de tools
3. revision transversal de la integracion entre `apps/app`, `apps/holded` y `apps/isaak`
4. preparacion operativa de la submission publica en OpenAI, incluyendo criterios de cuenta de prueba, demo y materiales de review

El resultado actual es:

- el runtime compartido de OpenAI ya depende solo de `ISAAK_NEW_OPENAI_API_KEY`
- el conector MCP de Holded ya expone discovery publico compatible con ChatGPT
- la accion `tools/call` sigue protegida por autenticacion y tenant
- la documentacion de review ya deja claro que la experiencia revisada en ChatGPT debe ser gratuita y sin compra dentro del flujo
- queda pendiente cerrar la cuenta de prueba final, ejecutar pruebas reales de review y grabar el video definitivo

## Cambios tecnicos cerrados

### 1. Contrato de OpenAI unificado

Se elimino la dependencia operativa de nombres antiguos basados en `service account` y se fijo como variable canonica:

- `ISAAK_NEW_OPENAI_API_KEY`

Impacto principal:

- el runtime compartido ya solo resuelve esa variable
- se retiraron referencias antiguas de codigo compartido, docs y plantillas
- se elimino tambien el alias con typo `ISAAK_OPENAI_SERVICE_ACCAUNT`

Archivos y superficies afectadas en esta fase:

- `packages/utils/openai-responses.ts`
- `scripts/env-build.mjs`
- `turbo.json`
- docs operativas y de despliegue relacionadas con OpenAI y Vercel
- plantillas y `.env.local` rastreados en el repo

Commit asociado:

- `10fa01b8` - `chore: rename isaak openai env to project api key`

### 2. Discovery publico del MCP de Holded

Se ajusto el runtime MCP para que ChatGPT pueda descubrir el servidor y su catalogo de tools sin bloquearse con `401` demasiado pronto.

Comportamiento final esperado:

- `GET /api/mcp/holded` publico
- `initialize` publico
- `notifications/initialized` publico
- `tools/list` publico
- `tools/call` protegido

Con esto se alinea el flujo con el comportamiento esperado por clientes MCP y se evita el fallo de discovery temprano.

Archivos principales:

- `apps/app/app/api/mcp/holded/route.ts`
- `apps/app/app/api/mcp/holded/route.test.ts`
- docs MCP de Holded y setup operativo

Validacion realizada:

- tests focalizados del runtime MCP
- build completo de `verifactu-app`

Commit asociado:

- `c1b8b10b` - `fix: restore public holded mcp discovery`

### 3. Revisión de arquitectura entre `app`, `holded` e `isaak`

Se revisaron las superficies principales para confirmar ownership real, resolucion de tenant y reutilizacion de la conexion Holded.

Conclusiones operativas:

- `apps/holded` captura acceso, valida la API key y prepara el onboarding publico
- `apps/app` es el core del MCP remoto, OAuth y persistencia compartida
- `apps/isaak` sigue siendo la experiencia conversacional principal y contiene superficies de billing propias del producto, pero no del flujo revisado en ChatGPT
- la conexion Holded es `channel-aware` y distingue al menos `dashboard` y `chatgpt`
- la cuenta de Holded la determina la API key conectada al tenant, no el email de ChatGPT

Archivos revisados con mayor impacto conceptual:

- `apps/app/lib/api/tenantAuth.ts`
- `apps/app/lib/integrations/holdedConnectionResolver.ts`
- `apps/app/lib/integrations/accountingStore.ts`
- `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`
- `apps/holded/README.md`

### 4. Revisión de scopes y tools expuestas

Se confirmo que la superficie MCP no es solo de lectura. Existen tools de lectura y de escritura, incluyendo acciones sensibles y acciones de borrador.

Conclusiones:

- hay herramientas de lectura para facturas, contactos, cuentas, CRM y proyectos
- existe al menos una accion de escritura incluida en el preset de review (`holded_create_invoice_draft`)
- existen mas tools mutativas fuera del preset de review, por lo que el copy publico debe ser cuidadoso y no afirmar que la integracion es exclusivamente de solo lectura

Archivos clave:

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpTools.ts`

### 5. Compatibilidad con el refresco manual de acciones en OpenAI

Durante el redescubrimiento manual de tools en OpenAI aparecio un error `Link not found`.

Hallazgo operativo:

- el problema no apuntaba al catalogo MCP ni a los scopes ya publicados
- el candidato mas fuerte era `GET` y `HEAD` sobre `https://app.verifactu.business/oauth/register`, que en produccion respondian `405`
- ademas, una guia interna seguia empujando un `Authorization Server Base` desfasado usando la URL del documento `/.well-known/oauth-authorization-server` en lugar del issuer base

Correccion aplicada en codigo y docs:

- `apps/app/app/oauth/register/route.ts` ahora responde tambien a `GET` y `HEAD` con informacion minima compatible con validadores de enlaces
- la guia `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md` se alineo para usar:
  - `Authorization Server Base`: `https://app.verifactu.business`
  - `Protected Resource Metadata`: `https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded`

Validacion local:

- tests focalizados de `app/oauth/register/route.test.ts`, `lib/oauth/mcp.test.ts` y `app/api/mcp/holded/route.test.ts` en verde

## Hipotesis descartadas

### Cambio del Authorization Server Base

Se comparo el estado actual con el historial reciente y no se encontro evidencia de que el issuer base de OAuth sea la regresion principal.

Conclusion:

- `https://app.verifactu.business` ya era el issuer/base en la configuracion previa relevante
- el problema mas consistente con el fallo observado fue el bloqueo temprano del discovery MCP y no un cambio de issuer

## Submission publica en OpenAI

### Decision de producto para review

La app enviada a review en ChatGPT debe presentarse como una experiencia gratuita dentro del flujo revisado.

Esto significa:

- no incluir checkout dentro del flujo revisado
- no incluir CTAs de compra o upgrade durante la demo/review de ChatGPT
- no hacer depender la revision de una suscripcion de pago externa

Matiz importante:

- el producto completo Isaak si puede tener billing o suscripcion en otras superficies propias
- eso no debe mezclarse con la experiencia concreta enviada a OpenAI para ChatGPT

### Ajustes documentales ya hechos para review

Se alinearon materiales internos para que la grabacion y la submission no empujen al reviewer a un flujo comercial.

Cambios concretos:

- la checklist de demo ya no cierra con CTA a planes
- la guia de review ya exige evitar CTAs de compra o checkout en el flujo revisado

Archivos actualizados:

- `apps/holded/app/demo-recording/page.tsx`
- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`

### Materiales base para la submission

Los documentos base mas utiles a fecha de hoy son:

- `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md`
- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- `docs/product/DEMO_CAPTURE_README.md`
- `apps/holded/app/demo-recording/page.tsx`

## Cuenta de prueba para review

### Requisito funcional real

El login visible usa correo electronico y contrasena. No usa `username` plano como credencial primaria.

Implicacion:

- si se quiere usar el identificador humano `test_user`, lo correcto es crear un correo tipo `test_user@...`

### Criterio recomendado para la cuenta final

La cuenta de review debe quedar:

- precreada
- con correo ya verificado
- sin 2FA
- con tenant demo listo
- con acceso por email y contrasena
- idealmente con Holded ya conectado para no depender de pasos manuales extra durante la review

Nota operativa:

- la contrasena `123456` es compatible con la regla minima actual de 6 caracteres, aunque para uso externo real conviene una contrasena mas robusta fuera del contexto de review controlada

## Riesgos y desajustes todavia abiertos

### 1. Copy de solo lectura en algunas superficies

Se detecto desajuste entre parte del copy historico de onboarding publico y la realidad tecnica del MCP, que ya incluye capacidad de escritura en algunos casos.

Esto debe corregirse antes de ampliar mas la comunicacion publica para evitar afirmar algo incorrecto.

### 2. Review account todavia no cerrada

Falta materializar la cuenta final que se entregara al reviewer con todos los prerrequisitos ya resueltos.

### 3. Smoke tests y video final

Sigue pendiente cerrar pruebas reales end-to-end y la grabacion final con la URL publica y el estado final de la cuenta de review.

## Actualizacion adicional 2026-04-03

Durante el siguiente bloque se cerraron cuatro ajustes operativos que ya estaban afectando a onboarding, sesion y contrato publico del conector.

### 1. Identidad interna de usuario para memberships y tenant-switch

Se normalizo la regla de identidad compartida:

- `session.uid` representa el `authSubject` de Firebase y no debe usarse directamente como `User.id` SQL
- `memberships`, `user_preferences` y `tenant-switch` ya resuelven primero el id interno real del usuario
- con esto se corrigio el falso `403 no active membership for tenant` que aparecia tras onboarding y cambio de tenant

Resultado:

- onboarding y activacion de tenant ya no rompen por mezclar `authSubject` con ids SQL internos

### 2. Logout real del dashboard/app

Se alineo el cierre de sesion del dashboard con el modelo real de autenticacion:

- Firebase `signOut()` ya no se considera suficiente por si solo
- el flujo correcto limpia tambien la cookie `__session` desde `/api/auth/logout` en el mismo origen
- con esto se evita quedar aparentemente deslogueado en cliente mientras middleware y backend siguen viendo sesion activa

### 3. Superficie publica real del preset `openai_review_v2`

Se reviso el contrato publico real del conector y se fijo como referencia operativa:

- el preset publico por defecto sigue siendo `openai_review_v2`
- el catalogo publico validado queda en 11 tools:
  - `holded_list_invoices`
  - `holded_get_invoice`
  - `holded_list_contacts`
  - `holded_get_contact`
  - `holded_list_accounts`
  - `holded_list_daily_ledger`
  - `holded_list_bookings`
  - `holded_list_projects`
  - `holded_get_project`
  - `holded_list_project_tasks`
  - `holded_create_invoice_draft`
- `scopes_supported` sigue siendo mas amplio que `default_scopes`, asi que el copy publico no debe prometer mas capacidad que la expuesta por el preset activo
- la expresion correcta para las ausencias actuales es `capacidades no habilitadas en este canal publico ahora mismo`

### 4. Libro diario y alcance de red

Tambien se cerro el desajuste del tool de libro diario y se aclaro el limite de red del integrador:

- `holded_list_daily_ledger` mantiene el scope `holded.accounts.read`, pero ahora exige `startTimestamp` y `endTimestamp`
- el motivo es operativo: el endpoint productivo devuelve `400` cuando se consulta sin rango en tenants reales
- el integrador MCP de Holded sigue siendo `closed-world`
- esta restriccion aplica solo al conector MCP, no al chat principal completo
- el requisito correcto para el chat principal es acceso a Holded Academy y a paginas oficiales de AEAT, SEPE, Seguridad Social y otros organismos publicos espanoles
- en el runtime actual y en el historial directo auditado no se encontro todavia navegador, buscador ni fetch web generico para ese acceso oficial
- por tanto el integrador no puede consultar dinamicamente esas fuentes y el acceso web oficial sigue requiriendo una implementacion explicita en el chat principal

### 5. Decision estrategica para despues de la review

Se fija como decision de producto y de roadmap:

- primero se espera la aprobacion de OpenAI sobre la version limitada actual de `Isaak for Holded`
- hasta entonces el conector en review no debe ensancharse con capacidades de asesor universal, acceso web oficial amplio o nuevos contratos comerciales dentro del flujo revisado
- mientras la review siga abierta, solo se admiten fixes criticos de onboarding, seguridad, OAuth, estabilidad o coherencia del contrato publico ya prometido
- despues de la aprobacion se abren dos lineas separadas
- linea 1: Fase 2 del conector directo `Isaak for Holded`, ampliando escritura estructurada sobre datos de Holded
- linea 2: `Isaak Universal`, app o conector separado con API y OAuth propios, acceso a fuentes oficiales y modelo de pago
- la version futura universal no debe reciclar sin mas el conector actual de Holded; debe tener contrato de producto, pricing, mensaje comercial y superficie tecnica diferenciados
- la version limitada de Holded sigue siendo la experiencia estrecha y revisable; la version universal sera una oferta aparte

### 6. Fase 2 del conector directo Holded tras aprobacion

Se documenta ya la Fase 2 que solo deberia arrancar despues de la aprobacion de OpenAI.

Objetivo:

- abrir escritura estructurada sobre Holded desde ChatGPT sin romper el contrato claro del conector

Primera ola prevista:

- crear cuentas contables
- crear asientos contables

Segunda ola prevista:

- otras acciones estructuradas por familias, con despliegue progresivo y QA por dominio

Reglas de esta Fase 2:

- no activar antes de la aprobacion
- confirmar explicitamente antes de escribir
- desplegar por familias funcionales, no como apertura total sin control
- mantener este carril separado del roadmap de `Isaak Universal`

### 7. Preparacion tecnica no publica ya realizada para la ola contable

Sin cambiar el preset publico por defecto ni ampliar la surface en review, hoy ha quedado preparada la base tecnica inicial de la ola 2.1.

Implementado ya en codigo:

- existe el preset intermedio `holded_phase2_accounting`
- ese preset equivale a `openai_review_v2` mas `holded.accounts.write`
- `MCP_PUBLIC_SCOPE_PRESET=holded_phase2_accounting` ya es aceptado por la capa OAuth/MCP
- la discovery publica `tools/list` ya tiene cobertura de test para mostrar `holded_create_accounting_account` y `holded_create_daily_ledger_entry` solo cuando ese preset este activo
- `openai_review_v2` sigue intacto y continua siendo el preset publico por defecto

Archivos tocados en esta preparacion:

- `apps/app/lib/integrations/holdedMcpScopes.ts`
- `apps/app/lib/integrations/holdedMcpScopes.test.ts`
- `apps/app/lib/oauth/mcp.ts`
- `apps/app/lib/oauth/mcp.test.ts`
- `apps/app/app/api/mcp/holded/route.test.ts`

Estado de validacion al cierre de hoy:

- los archivos editados no reportan errores estaticos
- la validacion focalizada con Jest no pudo cerrarse por un bloqueo de configuracion a nivel repo en `apps/api/jest.config.cjs`
- el error observado fue la validacion de `extensionsToTreatAsEsm: ['.js']`, por lo que el bloqueo no apunta a esta preparacion del preset en si

Pendiente para retomar mas adelante:

- H2A-004 endurecer `holded_create_accounting_account`
- H2A-005 endurecer `holded_create_daily_ledger_entry`
- H2A-006 smoke y QA real de la ola contable

## Siguiente bloque recomendado

1. crear y verificar la cuenta de review final
2. dejar el tenant demo preparado y comprobar el login real desde cuenta limpia
3. ejecutar smoke test completo del flujo `Conectar con cuenta -> acceso -> tenant -> Holded -> tools`
4. grabar video real y capturas finales
5. completar `Short app description`, `Reviewer notes` y credenciales finales en OpenAI Platform

## Referencias

- `docs/product/ISAAK_FOR_HOLDED_PUBLIC_REVIEW.md`
- `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- `docs/product/DEMO_CAPTURE_README.md`
- `docs/product/ISAAK_FOR_HOLDED_STATUS_2026-03-19.md`
- `docs/product/ISAAK_POST_APPROVAL_WEEK1_PLAN_2026.md`
- `docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md`
- `docs/product/ISAAK_HOLDED_PHASE2_MATRIX_2026.md`
- `docs/product/ISAAK_HOLDED_PHASE2_BACKLOG_2026.md`
- `docs/product/ISAAK_UNIVERSAL_PRODUCT_CONTRACT_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TECHNICAL_ROADMAP_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_SPRINT_PLAN_2026.md`
- `docs/engineering/ai/ISAAK_UNIVERSAL_TICKETS_2026.md`
- `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md`
- `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`
