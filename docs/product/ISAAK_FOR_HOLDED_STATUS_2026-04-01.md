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
- `apps/holded/HOLDED_CHATGPT_MCP_CONNECTOR_SETUP.md`
- `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`
