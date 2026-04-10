# Holded Direct Connector - Release Notes 2026-04-10

## Resumen ejecutivo

Desde la ultima version documentada en el README raiz, el conector directo `ChatGPT <-> Holded` ha quedado significativamente mas estable, mas acotado en su contrato publico y mas robusto en onboarding, OAuth y resolucion de tenant.

La linea general de abril 2026 ha sido:

- cerrar bucles y errores reales de produccion en el flujo ChatGPT
- fijar el perimetro publico del beta sin mezclarlo con el catalogo interno completo
- endurecer seguridad y compatibilidad operativa del runtime `apps/app`

## Cambios principales cerrados

### 1. Onboarding directo de ChatGPT endurecido

- El flujo `channel=chatgpt` usa sesion temporal propia de conector.
- El onboarding ya arranca con identidad verificada antes de pedir la API key.
- Paso 1 soporta Google opcional o correo verificado.
- El flujo conserva `authMethod`, `emailVerified`, `verifiedAt`, `firstName` y `lastName` a lo largo del onboarding.
- La identidad verificada y el prefill reutilizable quedan recordados por `(uid, email)` para reentradas futuras.
- El correo final de bienvenida del conector ya no sale al crear tenant, sino solo tras una conexion Holded correcta.

### 2. Propagacion explicita de tenant y token para eliminar bucles

- El flujo ya no debe depender del estado React actualizado en el mismo submit.
- `tenantId` y onboarding token se propagan de forma explicita desde `/api/onboarding/tenant` hasta `connect` y `oauth/authorize`.
- Se corrigieron rebotes a pasos anteriores cuando el navegador o el backend resolvian un tenant distinto o un token stale.

### 3. Runtime Holded channel-aware consolidado

- `external_connections` es la fuente operativa activa para Holded.
- `dashboard` y `chatgpt` quedan aislados por `channel_key`.
- Connect, disconnect, estado de sync y errores ya se persisten y resuelven por canal.
- El runtime deja de depender del fallback historico como fuente principal para este flujo.

### 4. OAuth y seguridad reforzados

- OAuth de Holded en `apps/app` exige PKCE S256.
- Los codigos de autorizacion son de un solo uso.
- La metadata publica y protegida del recurso MCP queda alineada con el discovery esperado por OpenAI.
- Las rutas de identidad del onboarding fallan en cerrado si falta onboarding token.
- El service worker se desactiva o evita rutas tokenizadas del flujo Holded para no reinyectar estado cacheado obsoleto.

### 5. Compatibilidad con produccion y esquemas legacy

- `tenant_profiles` se lee y escribe segun disponibilidad real de columnas.
- Prisma `upsert` se ajusto para no romper en bases legacy por columnas opcionales ausentes.
- `holdedConnectionResolver` se corrigio para no generar SQL mal formado al leer `last_error`.
- Ese fix elimino el caso en el que `/oauth/authorize` y `/onboarding/holded` interpretaban la conexion como inexistente y devolvian al inicio del flujo.

### 6. Perimetro publico del beta mas claro

- El beta publico por defecto sigue siendo `openai_review_v2`.
- `scopes_supported` anuncia el catalogo soportado por el runtime, pero `default_scopes` sigue restringiendo la exposicion publica por defecto.
- La capacidad publica actual del beta se concentra en facturas, contactos, cuentas contables, diario, bookings y proyectos, con escritura publica limitada a borrador de factura.
- eInforma ya no debe tratarse como parte de la surface publica de este conector.

## Resultado operativo actual

- El onboarding directo de ChatGPT es mas corto, mas determinista y menos dependiente del estado de sesion web clasico.
- La ejecucion MCP sigue protegida, mientras discovery y metadata permanecen publicos.
- El contrato publico del beta queda acotado y documentado sin confundirlo con el runtime interno completo.

## Documentos de referencia ahora canonicos

- [HOLDED_DIRECT_CONNECTOR_BETA_CAPABILITY_MATRIX_2026-04-10.md](./HOLDED_DIRECT_CONNECTOR_BETA_CAPABILITY_MATRIX_2026-04-10.md)
- [HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md](./HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md)
- [HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md](./HOLDED_DIRECT_CONNECTOR_PHASE1_IMPLEMENTATION_PLAN_2026.md)
- [ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md](./ISAAK_FOR_HOLDED_DEPLOY_QA_CHECKLIST.md)

## Nota de uso

Si aparece una discrepancia entre una prueba puntual en ChatGPT y el catalogo completo de scopes del runtime, tomar como referencia para el beta publico la matriz de capacidades y no el catalogo interno completo.
