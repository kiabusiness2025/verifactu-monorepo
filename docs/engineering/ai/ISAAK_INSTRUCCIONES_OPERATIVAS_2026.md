# Isaak — Instrucciones Operativas (2026)

**Última actualización:** Marzo 2026

## Alcance

Este documento cubre la operación completa de Isaak en `apps/app`: chat, historial de conversaciones, sugerencias de gastos, libros AEAT, integraciones externas, MCP para ChatGPT y ajuste de personalidad por tenant.

---

## Autenticación real por contexto

### `apps/app` (dashboard / admin)

- Auth principal: cookie de sesión `__session` (httpOnly JWT).
- Lectura de sesión: `getSessionPayload()`.
- Fuente:
  - `packages/utils/session.ts`
  - `apps/app/lib/session.ts`
- Helper unificado de contexto de tenant: `requireTenantContext()` en `apps/app/lib/api/tenantAuth.ts`.

### `apps/client` (`/api/preferences`)

- No usa `__session` en la implementación actual.
- Resuelve usuario por:
  1. Header `x-vf-user-id`, o
  2. Query `userId`, o
  3. Fallback por `tenantId` al OWNER activo.
- Fuente: `apps/client/app/api/preferences/route.ts`.

### MCP (ChatGPT → Verifactu)

- Usa Bearer con `access_token` emitido por el OAuth propio de Verifactu.
- Verifica con `verifyAccessToken()` en `apps/app/lib/oauth/mcp.ts`.
- El tenant se resuelve desde el token OAuth, no desde cookie.
- Fuente: `apps/app/app/api/mcp/holded/route.ts`.

---

## Endpoints activos de Isaak

### Chat

- `POST /api/chat`
  - `context.type=landing`: permite uso sin tenant.
  - `context.type=dashboard|admin`: exige sesión válida + tenant resuelto.
  - Fuente: `apps/app/app/api/chat/route.ts`.

### Historial de conversaciones

- `GET /api/isaak/conversations` — lista conversaciones del usuario autenticado.
- `POST /api/isaak/conversations` — crea nueva sesión de conversación.
- `GET /api/isaak/conversations/[id]` — detalle de conversación.
- `DELETE /api/isaak/conversations/[id]` — eliminar conversación.
- `GET /api/isaak/conversations/[id]/messages` — mensajes de una conversación.
- `POST /api/isaak/conversations/[id]/messages` — añadir mensaje.
- `DELETE /api/isaak/conversations/[id]/messages/[messageId]` — eliminar mensaje.
- `GET /api/isaak/conversations/[id]/share` — obtener link compartido.
- `POST /api/isaak/conversations/[id]/share` — generar/renovar link compartido.

Todas estas rutas requieren `__session` y ownership de conversación.

### Sugerencias de gastos (Isaak Classify)

- `POST /api/expenses/intake` — ingesta de gasto bruto; clasifica, normaliza y crea `ExpenseRecord` en estado `suggested`.
- `POST /api/expenses/[id]/isaak-suggest` — reclasifica un gasto existente con Isaak; actualiza `canonicalStatus=suggested` con `warningsJson` y `confidenceJson`.
- `POST /api/expenses/[id]/confirm` — el usuario confirma la sugerencia de Isaak; cambia `canonicalStatus=confirmed`.

Estas rutas usan `requireTenantContext()` y el motor `classifyExpense()` de `apps/app/lib/expenses/classify.ts`.

### Acciones contextuales del dashboard

- `GET /api/dashboard/actions` — devuelve acciones proactivas priorizadas para Isaak según el tenant activo.
  - Respuesta: lista de `{ id, title, action, href }`.
  - Las acciones varían por tenant (demo, alpina, norte, etc.) y se usan para las burbujas proactivas del componente `IsaakSmartFloating`.

### Libros y exportación AEAT

- `GET /api/aeat/books/sales` — libro registro de facturas emitidas.
- `GET /api/aeat/books/purchases` — libro registro de facturas recibidas.
- `GET /api/aeat/export/303` — genera Modelo 303 en Excel compatible AEAT.
- `GET /api/aeat/export/130` — genera Modelo 130 en Excel compatible AEAT.
- `GET /api/aeat/preview/303` — previsualización de datos Modelo 303.
- `GET /api/aeat/preview/130` — previsualización de datos Modelo 130.

Disponibles para todos los planes. Usan `requireTenantContext()`.

### Presupuestos

- `GET /api/quotes` — listar presupuestos del tenant.
- `POST /api/quotes` — crear presupuesto.
- `GET /api/quotes/[id]` — detalle.
- `PATCH /api/quotes/[id]` — actualizar.
- `DELETE /api/quotes/[id]` — eliminar.
- `POST /api/quotes/[id]/accept` — marcar como aceptado.
- `POST /api/quotes/[id]/reject` — marcar como rechazado.
- `POST /api/quotes/[id]/send` — enviar al cliente.
- `POST /api/quotes/[id]/convert-to-invoice` — convertir a factura.

Bidireccional con ERP externo solo en Empresa/PRO (`canBidirectionalQuotes`).

### Movimientos bancarios

- `GET /api/banks/movements` — listar movimientos bancarios del tenant.
- `GET /api/banks/movements/[id]` — detalle de movimiento.
- `POST /api/banks/movements/[id]/match` — conciliar movimiento con factura/gasto.
- `POST /api/banks/movements/[id]/create-expense` — crear gasto desde movimiento bancario.

### Integración contable vía API (Empresa/PRO)

- `GET /api/integrations/accounting/status` — estado de conexión activa.
- `POST /api/integrations/accounting/connect` — conectar ERP por API key.
- `POST /api/integrations/accounting/disconnect` — desconectar ERP.
- `POST /api/integrations/accounting/sync/run` — ejecutar sincronización completa.
- `POST /api/integrations/accounting/sync/pull` — importar datos del ERP.
- `POST /api/integrations/accounting/sync/push` — exportar datos al ERP.
- `GET /api/integrations/accounting/conflicts` — listar conflictos de sync pendientes.
- `GET /api/integrations/accounting/logs` — historial de sincronizaciones.

Requiere `canUseAccountingApiIntegration=true` (plan Empresa/PRO).

### Integraciones Google

- `GET /api/integrations/gcalendar/auth` — iniciar OAuth Google Calendar.
- `GET /api/integrations/gcalendar/callback` — callback OAuth Google Calendar.
- `GET /api/integrations/gcalendar/events` — listar eventos del calendario.
- `GET /api/integrations/gdrive/auth` — iniciar OAuth Google Drive.
- `GET /api/integrations/gdrive/callback` — callback OAuth Google Drive.
- `GET /api/integrations/gdrive/status` — estado de conexión Google Drive.
- `POST /api/integrations/gdrive/disconnect` — desconectar Google Drive.
- `GET /api/integrations/gmail/auth` — iniciar OAuth Gmail.
- `GET /api/integrations/gmail/callback` — callback OAuth Gmail.

### Integraciones Microsoft

- `GET /api/integrations/microsoft/auth` — iniciar OAuth Microsoft.
- `GET /api/integrations/microsoft/callback` — callback OAuth Microsoft.
- `GET /api/integrations/onedrive/auth` — iniciar OAuth OneDrive.
- `GET /api/integrations/onedrive/callback` — callback OAuth OneDrive.

### eInforma (enriquecimiento de empresa)

- `GET /api/integrations/einforma/search` — buscar empresa por nombre/CIF.
- `GET /api/integrations/einforma/company` — datos detallados de empresa.
- `POST /api/integrations/einforma/enrich-tenant` — enriquecer perfil del tenant con datos de eInforma.
- `GET /api/einforma/search` — búsqueda pública (sin tenant obligatorio).

### MCP Holded (para ChatGPT)

- Ruta: `POST /api/mcp/holded` (JSON-RPC 2.0 sobre HTTP).
- Auth: Bearer con token OAuth propio de Verifactu.
- Aislamiento actual: el canal OAuth de ChatGPT ya no hace fallback a la sesion web del dashboard para resolver la API key de Holded.
- Efecto practico: ChatGPT y dashboard/Isaak ya tienen independencia de autenticacion por canal.
- Limite actual: ambos canales siguen compartiendo la misma conexion Holded a nivel tenant.
- Siguiente paso recomendado para independencia total real: guardar conexiones Holded separadas por canal, por ejemplo `chatgpt` y `dashboard`, con resolucion y revocacion independientes.
- Tools expuestas:
  - `holded_list_invoices` — listar facturas (readOnly).
  - `holded_get_invoice` — detalle de factura (readOnly).
  - `holded_list_contacts` — listar contactos (readOnly).
  - `holded_list_accounts` — listar cuentas contables (readOnly).
  - `holded_create_invoice_draft` — crear borrador con confirmación explícita.
- Metadata OAuth en `/.well-known/oauth-authorization-server` y `/.well-known/oauth-protected-resource`.
- Documentación extendida: `docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md`.

### Onboarding

- `GET /api/onboarding/status` — estado del onboarding del usuario.
- `POST /api/onboarding/tenant` — crear/completar perfil del tenant.
- `POST /api/onboarding/start-trial` — activar trial.
- `GET /api/onboarding/einforma/search` — búsqueda de empresa en onboarding.
- `GET /api/onboarding/einforma/company` — datos de empresa en onboarding.

### Soporte

- `POST /api/support/end` — cerrar sesión de soporte activa.
- `POST /api/workflows/support-ticket` — crear ticket de soporte (Resend inbound + Isaak).
- `POST /api/workflows/user-onboarding` — disparar workflow de bienvenida.
- `POST /api/webhooks/resend/inbound` — recepción de email inbound para soporte.

### Otros endpoints clave

- `POST /api/storage/upload` — subida de archivos (facturas, documentos).
- `GET /api/session/info` — info de sesión activa.
- `POST /api/session/tenant-switch` — cambiar tenant activo.
- `GET /api/app/me` — perfil del usuario autenticado.
- `PATCH /api/user/preferences` — preferencias de usuario (tono Isaak, notificaciones).
- `PATCH /api/user/profile` — actualizar perfil.
- `POST /api/user/upload-photo` — subir foto de perfil.
- `GET /api/cron` — ejecución de tareas programadas (plazos fiscales, recordatorios).

---

## Variables de entorno (mínimas recomendadas)

### Chat y AI (`apps/app`)

- `SESSION_SECRET`
- `SESSION_SECRET_PREVIOUS` (opcional, rotación)
- `CLAVE_API_AI_VERCEL` o `VERCEL_AI_API_KEY`
- `OPENAI_API_KEY` (fallback si no hay AI Gateway)

### Share links

- `NEXT_PUBLIC_APP_URL` (base para URL compartida)

### Integración contable (Holded)

- `INTEGRATIONS_SECRET_KEY` — clave para cifrar API keys de tenants
- `HOLDED_API_BASE_URL` — `https://api.holded.com`
- `HOLDED_TIMEOUT_MS` — timeout en ms (por defecto 10000)
- `HOLDED_TEST_API_KEY` — solo desarrollo/staging; desactivar en producción

### MCP OAuth

- `MCP_SHARED_SECRET`
- `MCP_OAUTH_SECRET`
- `MCP_OAUTH_ALLOWED_REDIRECT_ORIGINS` — p.ej. `https://chatgpt.com,https://chat.openai.com`

### Integraciones OAuth Google/Microsoft

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

### eInforma

- `EINFORMA_API_KEY`
- `EINFORMA_API_URL`

### Soporte por email (inbound)

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `ADMIN_NOTIFICATION_EMAIL`
- `ISAAK_SUPPORT_ENABLED`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## Reglas operativas

1. Para smoke/manual API en `apps/app`, usar cookie:
   - `-H "Cookie: __session=<TOKEN>"`
2. Para el MCP, usar Bearer token OAuth:
   - `-H "Authorization: Bearer <ACCESS_TOKEN>"`
3. Evitar asumir Bearer para endpoints de facturas/Isaak en `apps/app` (usan cookie).
4. Mantener prompts sin exponer detalles internos de infraestructura al usuario final.
5. Para contextos sin sesión (landing), no invocar lógica dependiente de tenant.
6. La API key de Holded nunca se expone al cliente; siempre se resuelve server-side cifrada.
7. Endpoints de integración contable vía API solo para planes Empresa/PRO (`canUseAccountingApiIntegration`).
8. Bidireccional de presupuestos solo Empresa/PRO (`canBidirectionalQuotes`).
9. Libros AEAT disponibles para todos los planes (`canExportAeatBooks=true`).
10. En producción, desactivar `HOLDED_TEST_API_KEY` y cualquier fallback de credenciales de test.
11. En el chat Holded de Isaak, priorizar tono cercano, optimista y tranquilizador; si ayuda a la calidez, se permiten emojis suaves sin convertir la respuesta en algo informal en exceso.

---

## Hooks de Isaak (apps/app)

| Hook                  | Responsabilidad                                                |
| --------------------- | -------------------------------------------------------------- |
| `useIsaakContext`     | Contexto activo del módulo (dashboard, invoices, expenses…)    |
| `useIsaakTone`        | Tono activo (friendly / professional / minimal) + persistencia |
| `useIsaakPreferences` | 17 preferencias de comportamiento con localStorage             |
| `useIsaakAnalytics`   | Tracking de eventos (bubble_view, chat_open, message_sent…)    |
| `useIsaakVoice`       | Text-to-speech con Web Speech API (ES, EN, PT, FR)             |
| `useIsaakDetection`   | Detección de contexto, ruta activa y estado del tour           |

---

## Componentes de Isaak (apps/app)

| Componente                   | Rol                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| `IsaakSmartFloating`         | Componente principal: chat flotante, historial, voz, analytics |
| `IsaakProactiveBubbles`      | Burbujas proactivas por contexto                               |
| `IsaakDeadlineNotifications` | Alertas flotantes de plazos fiscales                           |
| `IsaakPreferencesModal`      | Modal de preferencias con 5 pestañas                           |
| `IsaakGreetingCard`          | Tarjeta de bienvenida contextual                               |
| `IsaakDrawer`                | Drawer lateral de Isaak (historial y conversaciones largas)    |
| `IsaakContextBridge`         | Puente de contexto entre módulos y el chat                     |

Dock compartido (multi-app): `packages/ui/src/isaak/IsaakDock.tsx`.

---

## Checklist de despliegue rápido de Isaak

- [ ] `POST /api/chat` responde en context `landing`.
- [ ] `POST /api/chat` responde autenticado en context `dashboard`.
- [ ] `GET /api/isaak/conversations` devuelve historial autenticado.
- [ ] `POST /api/isaak/conversations/[id]/share` genera `shareUrl` con expiración.
- [ ] `POST /api/expenses/intake` crea gasto con `canonicalStatus=suggested`.
- [ ] `POST /api/expenses/[id]/isaak-suggest` reclasifica gasto existente.
- [ ] `GET /api/aeat/export/303` genera Excel descargable.
- [ ] `GET /api/integrations/accounting/status` devuelve estado correcto.
- [ ] `POST /api/mcp/holded` responde a `tools/list` con Bearer válido.
- [ ] `/.well-known/oauth-authorization-server` responde con metadata OAuth.
- [ ] Logs sin errores de resolución de tenant (`No tenant selected`).
- [ ] `HOLDED_TEST_API_KEY` desactivado en producción.

---

## Notas

- El documento `docs/isaak/ISAAK_SUPPORT_SYSTEM.md` se mantiene para el flujo de soporte email.
- El documento `docs/engineering/ai/ISAAK_FOR_HOLDED_MCP_SETUP.md` cubre la arquitectura MCP en detalle.
- El documento `docs/product/ISAAK_PLATFORM_SYNC_PLAN.md` define el modelo de ownership de datos por tenant.
