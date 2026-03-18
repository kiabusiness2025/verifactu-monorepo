# Isaak for Holded - Public Review Readiness

## Objetivo
Preparar `Isaak for Holded` para envio a revision de OpenAI como app publica basada en:

- servidor MCP propio de Verifactu
- autenticacion OAuth propia de Verifactu
- experiencia de producto y documentacion alineadas con una app publica revisable

## Fuentes oficiales OpenAI a tener en cuenta

- Apps in ChatGPT: https://help.openai.com/en/articles/11487775-apps-in-chatgpt
- Build with the Apps SDK: https://help.openai.com/en/articles/12515353-build-with-the-apps-sdk
- Developer mode and MCP apps in ChatGPT: https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta
- Submitting apps to the ChatGPT app directory: https://help.openai.com/en/articles/20001040-submitting-apps-to-the-chatgpt-app-directory

## Decision de alcance para la primera submission

Public v1 incluye:

- Invoice API
- Accounting API
- CRM API
- Projects API

Public v1 excluye:

- Team API

Razon:

- reduce superficie de revision
- evita exponer de inicio datos laborales o de empleados
- hace mas facil justificar el valor de negocio y la seguridad de la app

## Que debe quedar claro en producto

`Isaak` es un unico asistente fiscal y contable.

`Isaak for Holded` no es un producto separado a nivel de cerebro. Es el mismo Isaak operando sobre datos de Holded desde `verifactu.business`.

La app publica debe comunicar:

- que el usuario opera desde su tenant autorizado
- que Holded se conecta server-side
- que Verifactu es la capa de explicacion, decision y accion guiada
- que la API key de Holded no se expone al cliente

## Requisitos funcionales minimos

- listar facturas
- obtener una factura concreta
- listar contactos
- listar cuentas contables
- listar bookings CRM
- listar proyectos
- obtener un proyecto
- listar tareas de proyecto
- crear borradores de factura con confirmacion explicita

## Requisitos de seguridad minimos

- OAuth propio de Verifactu operativo
- resolucion de tenant robusta
- API key de Holded solo server-side
- tools con scopes por accion
- escritura solo con confirmacion
- logs de acceso basicos en MCP
- desactivar fallback de `HOLDED_TEST_API_KEY` en produccion

## Requisitos de presentacion publica

- pagina publica en landing: `/producto/integraciones/isaak-for-holded`
- politica de privacidad publica
- terminos publicos
- pagina de contacto/soporte publica
- nombre y descripcion consistentes con el comportamiento real de la app

## Requisitos MCP / tool review

- nombres de tools claros
- descripciones no ambiguas
- inputSchema cerrado con `additionalProperties: false`
- `readOnlyHint` en tools de lectura
- hints de escritura claros en tools mutativas
- outputs minimizados cuando sea posible

## Estado actual

Completado:

- MCP remoto operativo
- OAuth propio operativo
- onboarding `holded-first` para conectar Holded por API key desde ChatGPT
- tools de Invoice, Accounting, CRM y Projects expuestas
- modulo interno `Isaak for Holded` dentro del dashboard
- pagina publica inicial del producto en landing
- conexion compartida preparada para reutilizarse entre ChatGPT y dashboard

Pendiente antes de submission:

- capa Apps SDK explicita si OpenAI la exige en la ruta final de publicacion
- repaso fino de branding final
- QA manual end-to-end desde cuenta limpia
- revision de respuestas de error para lenguaje publico
- politica final de soporte y tiempos de respuesta
- deploy y smoke test del flujo `holded-first`

## Flujo publico actual

Para la version publica objetivo:

1. el usuario descubre `Isaak for Holded` en ChatGPT
2. inicia `Conectar con cuenta`
3. Verifactu resuelve identidad y tenant
4. si no existe conexion Holded, redirige a `/onboarding/holded`
5. el usuario pega su API key de Holded
6. Verifactu la valida y la guarda server-side
7. el navegador vuelve al flujo OAuth original
8. ChatGPT completa la conexion

Este flujo no sustituye el dashboard. Lo complementa.

## Referencias operativas

- Arquitectura compartida: `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- Checklist de deploy y QA: `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- Runbook de despliegue: `docs/ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md`

## Checklist de envio

1. Verificar que el flujo `Conectar con cuenta` funciona en produccion.
2. Verificar que el tenant correcto se resuelve tras OAuth.
3. Verificar que las tools de lectura funcionan con datos reales.
4. Verificar que `holded_create_invoice_draft` exige confirmacion.
5. Verificar privacidad, terminos y soporte visibles desde la pagina publica.
6. Verificar que `Team API` sigue fuera del alcance publico inicial.
7. Preparar capturas y copy final para submission.
