# Isaak for Holded - Public Review Readiness

## Objetivo

Preparar `Isaak for Holded` para envio a revision de OpenAI como app publica basada en:

- servidor MCP propio de Verifactu
- autenticacion OAuth propia de Verifactu
- experiencia de producto y documentacion alineadas con una app publica revisable

## Fuentes oficiales OpenAI a tener en cuenta

- Apps in ChatGPT: https://help.openai.com/en/articles/12503483-apps-in-chatgpt-and-the-apps-sdk
- Build with the Apps SDK: https://help.openai.com/en/articles/12515353-build-with-the-apps-sdk
- Developer mode, apps and full MCP connectors in ChatGPT: https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta
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

## Contratos publicos soportados

Desde abril de 2026 hay que distinguir dos contratos publicos distintos:

- `openai_review_v2` -> preset estrecho para review publica de OpenAI
- `full` -> preset amplio para exponer el catalogo ya implementado cuando se decida abrirlo publicamente

Regla operativa:

- el contrato visible se controla con `MCP_PUBLIC_SCOPE_PRESET`
- para review publica, el valor correcto sigue siendo `openai_review_v2`
- `full` no debe activarse por accidente durante review ni en demos que prometen una superficie mas estrecha

Matiz tecnico actual:

- `scopes_supported` puede anunciar el catalogo completo de scopes soportados por Holded para que apps internas soliciten mas permisos
- `default_scopes` sigue siendo el punto donde se estrecha la experiencia publica por defecto
- la review publica debe validar que el preset por defecto siga siendo el esperado aunque el catalogo soportado sea mas amplio

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
- listar libro diario
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

- landing publica dedicada en `holded.verifactu.business`
- politica de privacidad publica
- terminos publicos
- pagina de contacto/soporte publica
- nombre y descripcion consistentes con el comportamiento real de la app
- no incluir CTAs de compra, checkout ni enlaces a suscripcion dentro del flujo revisado en ChatGPT

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
- landing publica inicial en `holded.verifactu.business`
- conexion compartida preparada para reutilizarse entre ChatGPT y dashboard
- app enviada a revision publica en OpenAI Platform
- flujo `holded-first` sin login visible para usuario externo
- landing publica con soporte, privacidad y terminos
- verificacion de dominio completada

Bloqueador ya resuelto:

- el fallo `No se pudo guardar la conexion de Holded` quedo aislado finalmente como un problema de conectividad Postgres en `persist`
- la integracion ya valida la API key y persiste correctamente cuando la conectividad de base de datos esta bien configurada

Pendiente operativo actual:

- smoke tests finales tras el ultimo ajuste de infraestructura
- seguimiento de la revision de OpenAI
- cambio de URL beta a URL publica final cuando OpenAI la publique
- activar el preset `full` solo cuando producto, QA y despliegue lo aprueben explicitamente

Pendiente antes de submission:

- capa Apps SDK explicita si OpenAI la exige en la ruta final de publicacion
- repaso fino de branding final
- QA manual end-to-end desde cuenta limpia
- revision de respuestas de error para lenguaje publico
- politica final de soporte y tiempos de respuesta
- deploy y smoke test del flujo `holded-first`

## Que ya dejamos adelantado para OpenAI

- verificar la cuenta de OpenAI Platform que va a presentar la app
- cerrar nombre final, logo, descripcion corta y notas de version
- revisar privacidad, terminos y soporte publico enlazables desde la landing
- dejar lista la landing `holded.verifactu.business`
- preparar capturas, casos de prueba y expected behavior
- auditar que las tools publicas devuelven solo datos minimos necesarios
- confirmar que `Team API` sigue fuera del alcance de la primera submission
- documentar claramente que la cuenta de Holded se determina por la API key del usuario y que la credencial se guarda server-side

## Ruta recomendada de publicacion con Apps SDK

Segun OpenAI, la ruta recomendada para una app publica es:

1. construir la experiencia con `Apps SDK`
2. probarla en `Developer Mode`
3. revisar seguridad, privacidad y comportamiento funcional
4. enviar la app desde la cuenta verificada de OpenAI Platform
5. publicar la app desde el dashboard de Platform una vez aprobada

Notas operativas:

- `Apps in ChatGPT` confirma que las apps publicas viven en el directorio de apps y que el Apps SDK es la forma recomendada de empaquetarlas
- `Build with the Apps SDK` confirma que el SDK se apoya en MCP y que se puede conectar a backend propio
- `Submitting apps to the ChatGPT app directory` confirma que la submission se hace desde la cuenta verificada de OpenAI Platform y que, tras la aprobacion, la publicacion final se realiza desde el dashboard de Platform

## Flujo publico actual

Para la version publica objetivo:

1. el usuario descubre `Isaak for Holded` en ChatGPT
2. inicia `Conectar con cuenta`
3. Verifactu resuelve identidad y tenant
4. si no existe conexion Holded, redirige a `/onboarding/holded`
5. el usuario pega su API key de Holded
6. Verifactu la valida, guarda server-side la conexion y registra la aceptacion legal del flujo
7. el navegador vuelve al flujo OAuth original
8. ChatGPT completa la conexion

Este flujo no sustituye el dashboard. Lo complementa.

## Checklist previo a submission en Platform

1. Cuenta de OpenAI Platform verificada como persona o empresa.
2. Metadata final de la app cerrada.
3. Landing publica operativa y enlazada.
4. Politica de privacidad publica y coherente con los datos que devuelven las tools.
5. Terminos y soporte publico visibles.
6. Casos de prueba definidos con expected outputs claros.
7. QA manual en ChatGPT web y, cuando aplique, en mobile.
8. Flujo real `Conectar con cuenta -> onboarding -> conectar Holded -> volver a ChatGPT` pasando en produccion.
9. Release notes claras para la version que se envie.

## Referencias operativas

- Arquitectura compartida: `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- Checklist de deploy y QA: `docs/product/ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md`
- Runbook de despliegue: `docs/ops/runbooks/ISAAK_FOR_HOLDED_PUBLIC_DEPLOY.md`
