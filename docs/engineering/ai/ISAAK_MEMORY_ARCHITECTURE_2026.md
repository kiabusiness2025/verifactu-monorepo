# Isaak Memory Architecture 2026

## Objetivo

Construir una memoria privada de trabajo para `Isaak` que no dependa de la memoria nativa de ChatGPT.

La meta no es "entrenar el modelo con datos del usuario". La meta es que, antes de responder, `Isaak` pueda consultar:

- historial conversacional relevante
- hechos persistidos del usuario y del tenant
- documentos y adjuntos del usuario
- datos operativos vivos del negocio
- datos sincronizados desde Holded u otras integraciones

## Principio rector

`Isaak` debe recordar por infraestructura propia, no por una capacidad opcional del cliente ChatGPT.

Eso nos da:

- control de privacidad
- memoria consistente en `app`, `client`, `admin` y `Holded-first`
- continuidad si el usuario desactiva la memoria de ChatGPT
- capacidad de borrar, resumir, segmentar y auditar la memoria

## Lo que ya existe

### Conversaciones persistidas

El sistema ya tiene una base útil de memoria conversacional:

- `IsaakConversation`
- `IsaakConversationMsg`
- `IsaakConversationShare`

Referencia:

- [schema.prisma](../../../packages/db/prisma/schema.prisma)

### APIs de conversación

Ya existen rutas para:

- crear conversación
- listar conversaciones
- leer una conversación
- guardar mensajes
- compartir conversaciones

Referencias:

- [conversations route](../../../apps/app/app/api/isaak/conversations/route.ts)
- [messages route](../../../apps/app/app/api/isaak/conversations/[id]/messages/route.ts)

### Storage de documentos

Ya existe almacenamiento documental por tenant en:

- [storage.ts](../../../apps/app/lib/storage.ts)

Eso cubre:

- documentos
- facturas
- adjuntos
- avatars

### Chat route con tools

El endpoint principal de Isaak ya tiene contexto, tools y acceso a datos del negocio:

- [chat route](../../../apps/app/app/api/chat/route.ts)

Esto permite extender la respuesta con memoria antes de llamar al modelo.

## Problema actual

Hoy tenemos historial y storage, pero no una capa de `retrieval` previa a la respuesta.

Es decir:

- guardamos conversaciones
- guardamos mensajes
- guardamos archivos

pero `Isaak` no consulta todavía ese conocimiento de forma sistemática antes de responder.

## Arquitectura recomendada

## Capa 1. Historial conversacional

Mantener `IsaakConversation` y `IsaakConversationMsg` como registro fuente.

Añadir dos conceptos encima:

1. `conversation summary`
2. `memory facts`

### Conversation summary

Cada conversación debería tener un resumen incremental con:

- tema principal
- decisiones tomadas
- pendientes abiertos
- preferencias del usuario detectadas

Ese resumen no sustituye a los mensajes completos; reduce coste de contexto y mejora continuidad.

### Memory facts

Hechos persistidos pequeños, verificables y útiles.

Ejemplos:

- el usuario prefiere respuestas directas
- el foco principal es liquidez
- revisa facturas pendientes cada lunes
- trabaja con Holded
- quiere que Isaak priorice cobros antes que reporting

## Capa 2. Memoria documental

Para cada documento o adjunto:

1. guardar asset en storage
2. guardar índice en BD
3. extraer texto
4. trocear contenido
5. recuperar fragmentos relevantes antes de responder

Fuentes previstas:

- uploads directos
- documentos internos
- almacenamiento compartido
- Google Drive
- futuras integraciones documentales

## Capa 3. Memoria operativa del negocio

Antes de responder, Isaak debe consultar también el estado vivo del negocio:

- facturas
- gastos
- clientes
- bancos
- estados fiscales
- datos de Holded
- próximos pasos operativos

Esta capa no es "memoria histórica", sino `contexto operativo actual`.

## Capa 4. Retrieval orchestration

Antes de cada respuesta, `Isaak` debe ejecutar un pipeline parecido a este:

1. resolver `tenantId`, `userId`, `channel`, `context`
2. recuperar resumen de la conversación activa
3. recuperar últimos mensajes relevantes
4. recuperar `memory facts` del usuario y del tenant
5. recuperar documentos o chunks relacionados
6. consultar datos vivos del negocio
7. construir contexto final
8. llamar al modelo
9. guardar nuevos mensajes
10. actualizar resumen y facts

## Modelos nuevos recomendados

No hace falta romper los modelos actuales. Conviene extender alrededor.

## 1. `IsaakMemoryFact`

Responsabilidad:

- guardar hechos persistidos de usuario o tenant

Campos sugeridos:

- `id`
- `tenantId`
- `userId?`
- `scope` (`user`, `tenant`, `conversation`)
- `category` (`preference`, `business`, `workflow`, `risk`, `relationship`)
- `key`
- `valueJson`
- `source`
- `confidence`
- `lastConfirmedAt`
- `createdAt`
- `updatedAt`

## 2. `IsaakDocumentAsset`

Responsabilidad:

- metadatos del archivo guardado

Campos sugeridos:

- `id`
- `tenantId`
- `userId?`
- `conversationId?`
- `storagePath`
- `mimeType`
- `originalName`
- `source`
- `status`
- `textExtracted`
- `metadataJson`
- `createdAt`
- `updatedAt`

## 3. `IsaakDocumentChunk`

Responsabilidad:

- fragmentos recuperables del documento

Campos sugeridos:

- `id`
- `assetId`
- `tenantId`
- `chunkIndex`
- `text`
- `tokenCount`
- `embeddingRef?`
- `createdAt`

## 4. `IsaakConversationSummary`

Responsabilidad:

- resumen incremental por conversación

Campos sugeridos:

- `conversationId`
- `summary`
- `openLoopsJson`
- `userPreferencesJson`
- `updatedAt`

## 5. `IsaakRetrievalLog`

Responsabilidad:

- trazabilidad de qué memoria se usó para cada respuesta

Campos sugeridos:

- `id`
- `conversationId?`
- `tenantId`
- `userId?`
- `query`
- `selectedFactsJson`
- `selectedDocumentsJson`
- `selectedSnapshotsJson`
- `createdAt`

## Esquema de ownership

La memoria debe separarse siempre por:

- `tenant`
- `user`
- `channel`

Nunca debemos mezclar memoria entre tenants.

Y conviene distinguir:

- memoria privada del usuario
- memoria compartida del tenant
- memoria específica de una conversación

## Dónde integrar el retrieval

El primer punto natural es:

- [chat route](../../../apps/app/app/api/chat/route.ts)

Ahí mismo podemos introducir un builder tipo:

- `buildIsaakRuntimeContext()`

Responsabilidades:

- leer resumen conversacional
- leer facts
- leer snapshots relevantes
- recuperar documentos relacionados
- construir un bloque de contexto compacto

## Fases de implementación recomendadas

## Fase 1. Resumen y facts

Entregables:

- `IsaakMemoryFact`
- `IsaakConversationSummary`
- pipeline de actualización después de guardar mensajes
- retrieval simple antes de responder

Impacto:

- alto valor
- bajo riesgo
- bajo coste de infraestructura

## Fase 2. Documentos

Entregables:

- `IsaakDocumentAsset`
- `IsaakDocumentChunk`
- extracción de texto
- búsqueda básica por documento

Impacto:

- convierte adjuntos en memoria útil
- prepara Drive y storage compartido

## Fase 3. Retrieval semántico

Entregables:

- embeddings
- ranking de chunks
- mezcla de contexto estructurado + semántico

Impacto:

- respuestas mucho más contextualizadas
- mejor continuidad longitudinal

## Fase 4. Memoria proactiva

Entregables:

- recordatorios
- pendientes abiertos
- señales operativas sugeridas
- priorización automática por usuario/tenant

Impacto:

- Isaak deja de ser solo reactivo

## Qué no recomendamos

- depender de la memoria nativa de ChatGPT
- llamar a esto "training"
- almacenar todo sin resumen ni jerarquía
- mezclar datos entre usuarios del mismo tenant sin criterio
- cargar hilos completos en cada respuesta

## Lenguaje recomendado de producto

Mejor decir:

- `Isaak construye una memoria privada de trabajo`
- `Isaak recuerda contexto operativo, conversaciones y documentos autorizados`
- `Puedes borrar esa memoria cuando quieras`

Evitar decir:

- `entrenamos el modelo con tus datos`
- `ChatGPT recordará todo`

## Riesgos a controlar

- consentimiento y transparencia
- derecho al borrado
- multi-tenant isolation
- documentos sensibles
- sobrecargar el prompt con contexto irrelevante

## Siguiente implementación concreta

### Sprint recomendado

1. crear migración para `IsaakMemoryFact`
2. crear migración para `IsaakConversationSummary`
3. añadir servicio `buildIsaakRuntimeContext()`
4. leer facts y summary antes de responder en `apps/app/app/api/chat/route.ts`
5. actualizar facts y summary después de cada turno

### Sprint siguiente

1. crear `IsaakDocumentAsset`
2. conectar uploads y documentos de tenant
3. extraer texto y chunking
4. retrieval documental previo a respuesta

## Resultado esperado

Cuando esta arquitectura esté activa, el usuario no dependerá de que ChatGPT tenga memoria activada.

La experiencia debería sentirse así:

- `Isaak ya conoce mi contexto`
- `Isaak recuerda lo que decidimos`
- `Isaak sabe qué documentos importan`
- `Isaak consulta mis datos reales antes de responder`

Ese es el nivel correcto para convertir a Isaak en un copiloto de negocio real.
