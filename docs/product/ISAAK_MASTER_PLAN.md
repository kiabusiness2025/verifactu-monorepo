# Isaak — Plan Maestro de Producto

> Última actualización: 2026-05-02  
> Estado: documento vivo — añadir ✅ cuando se complete cada ítem

---

## Visión

**Isaak** es el copiloto fiscal inteligente de Verifactu Business: el primer asistente para pymes españolas que no solo responde preguntas sino que **ejecuta acciones contables reales** sobre el ERP conectado (Holded primero), con voz, con archivos, con integraciones de Google y con alertas fiscales proactivas.

---

## Arquitectura de apps

| App            | URL                         | Propósito                              |
| -------------- | --------------------------- | -------------------------------------- |
| `apps/isaak`   | `isaak.verifactu.business`  | App principal Isaak — workspace + chat |
| `apps/holded`  | `holded.verifactu.business` | Widget flotante en páginas Holded      |
| `apps/app`     | `app.verifactu.business`    | Conector ChatGPT/Claude — API REST     |
| `apps/admin`   | `admin.verifactu.business`  | Panel de administración interno        |
| `apps/landing` | `verifactu.business`        | Landing pública + checkout Stripe      |

---

## Estrategia de captación: conectores como funnel

Los conectores públicos (ChatGPT y Claude) no son productos separados ni variantes de Isaak.
Son el funnel deliberado de adquisición hacia Isaak como producto principal de pago.

**La regla:**

- Conector → gratuito, sin checkout, sin billing
- Widget de Isaak en el conector → demostración de valor + invitación natural
- `isaak.verifactu.business` → producto de pago con historial, memoria y sin límites

**Los tres modos del widget en los conectores:**

| Modo                | Función                                                                  | Límite                         |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Soporte técnico     | Resuelve errores del conector (OAuth, API key, conexión)                 | Sin límite                     |
| Servicios puntuales | Migración, formación, onboarding, demo Holded (0–1.190 €)                | Sin límite                     |
| Vitrina de Isaak    | Responde con datos reales de Holded — el usuario ve valor antes de pagar | 50 consultas/día → CTA a Isaak |

**Copy correcto para el límite de cuota:**

> "Has alcanzado el límite diario del conector. Para análisis continuo con historial y memoria de tu empresa, Isaak completo está disponible en isaak.verifactu.business"

El mensaje incorrecto ("actualiza tu plan") asume que el usuario del conector tiene un plan que puede cambiar. No tiene ninguno.

**Documento de referencia:** `docs/product/CONNECTOR_ACQUISITION_FUNNEL_PLAN_2026.md`

---

## Estado actual (Semana 5 — 2026-05-02)

### ✅ Implementado

- Chat con LLM usando snapshot Holded (callLLM, prompt snapshot)
- Historial de conversaciones (Prisma `IsaakConversation`)
- 12 tools MCP Holded (ventas, gastos, contactos, proyectos, equipo)
- Workspace autenticado con sidebar oscuro (6 secciones)
- KPI cards reales en `/resumen` — Holded analytics en tiempo real
- Recharts bar chart 6 meses en `/resumen`
- `react-markdown` + `remark-gfm` (tablas, code, listas, links)
- Sidebar refresh automático cuando se crea nueva conversación
- Widget flotante en holded.verifactu.business
- Brand alignment: colores, avatar, tipografía coherentes con landing
- Auth con Firebase/cookie + guard en workspace
- **S4-A ✅** `create_verifactu_invoice` conversacional en chat: detección de intención → extracción de datos con Claude tool → borrador en DB → confirmación → emisión a AEAT vía VeriFactu API
- **S4-B ✅** `GET /api/invoices/[id]/pdf` — PDF estilado con cabecera de marca, bloques emisor/receptor, tabla de importes, QR dibujado como módulos PDF nativos desde `verifactuQr`; links de descarga integrados en el chat
- **S4-C ✅** Card Verifactu en `/resumen`: emitidas / borradores / errores AEAT en tiempo real
- **S8-A 🟡 parcial** Google Calendar: rutas OAuth + sync implementadas (`/api/isaak/google/*`); tarjeta conectar/desconectar/sincronizar en `/integrations`
- **S10-A ✅** PWA: `manifest.json`, service worker (`sw.js`), 8 iconos (72–512 px), headers en `next.config.js`, viewport y `appleWebApp` en root layout
- **IsaakCopilotPanel ✅** Panel derecho colapsable con chat contextual en cada sección del workspace
- **Integrations page ✅** `/integrations`: 3 pestañas — Conectores activos (Holded + Google Calendar), Catálogo (6 conectores + próximos), API & MCP (API keys + MCP server + webhooks placeholder)
- **Sidebar v2 ✅** Colapsable a iconos, plan badge en perfil, enlace Integraciones con punto verde de estado, dropdown de perfil con ajustes + logout

---

## Roadmap por sprints

---

## SPRINT 4 — Verifactu nativo desde chat ✅ COMPLETADO (2026-05-02)

> Sistema Verifactu ya ~70% implementado en `apps/app`. Exponer via tools en Isaak.

### S4-A ✅ `create_verifactu_invoice` tool

- Implementado en `apps/isaak/app/api/holded/chat/route.ts`
- Flujo completo: `isInvoiceCreationIntent()` → `callAnthropicForInvoiceData()` (Claude tool) → `createIsaakInvoiceDraft()` → confirmación usuario → `issueIsaakInvoice()` → AEAT vía VeriFactu API

### S4-B ✅ PDF de factura con QR Verifactu

- `GET /api/invoices/[id]/pdf` en `apps/isaak` (sesión Isaak propia)
- PDF raw con cabecera azul marino, bloques emisor/receptor, tabla de importes
- QR dibujado como módulos rectangulares PDF nativos (sin dependencias de imagen)
- Links "[📄 Ver borrador en PDF]" y "[📄 Descargar PDF]" en el chat tras crear/emitir

### S4-C ✅ Dashboard Verifactu en Resumen

- Card Verifactu en `/resumen`: emitidas / borradores / errores AEAT
- Queries Prisma directas por `verifactuStatus` en tiempo real

---

## SPRINT 5 — Suscripciones y monetización (3–4 días)

> Base Stripe ya implementada (webhook, checkout, portal, modelos Prisma).
> Falta la UI de usuario y completar admin.

### S5-A: UI de planes en Isaak `/settings?section=billing`

- Mostrar plan actual + estado trial (días restantes)
- 3 tiers propuestos:

| Plan        | Precio/mes | Límites                                                                |
| ----------- | ---------- | ---------------------------------------------------------------------- |
| **Starter** | 19 €/mes   | 1 ERP, 100 preguntas/mes, sin herramientas avanzadas                   |
| **Pyme**    | 49 €/mes   | 1 ERP, ilimitado, tools avanzadas, integraciones Google                |
| **Empresa** | 149 €/mes  | 3 ERPs, multi-usuario, API access, notificaciones, onboarding dedicado |

- Trial 30 días gratis en todos los planes (ya implementado en `start-trial` route)
- Botones: "Empezar prueba gratuita" / "Gestionar suscripción" (Stripe portal)
- Sin tarjeta para el trial (Stripe SetupIntent diferido)

### S5-B: Trial expiration automation

- Cron job diario: detectar trials expirados → `status = 'past_due'`
- Email D-7, D-3, D-0 recordando expiración (Resend)
- Bloqueo soft en workspace: banner + modal, no cortar acceso abruptamente

### S5-C: Admin panel — billing y Stripe (completar placeholders)

- `apps/admin/app/(admin)/integrations/stripe/page.tsx` — actualmente stub
  - Métricas Stripe: MRR, churn, trials activos, conversiones
  - Estado webhook (último evento, latencia)
- `apps/admin/app/(admin)/tenants/[id]/billing/page.tsx` — actualmente stub
  - Ver plan + estado trial del tenant
  - Extender/cancelar trial manualmente
  - Ver historial de pagos Stripe
  - Forzar cambio de plan (con motivo)
- Panel de Isaak en admin: usuarios, conversaciones, uso por tenant

### S5-D: Publicidad y configuración de usuario

- En `/settings?section=isaak`: toggle para mensajes de marca Verifactu
- En admin: gestión de campañas/banners por plan (Starter ve promo, Empresa no)
- Metrics de CTR por banner en `UsageEvent`

---

## SPRINT 6 — Carga de archivos con OCR (4–5 días)

> Primera funcionalidad de "input de datos" que diferencia Isaak de cualquier chat genérico.

### S6-A: Upload endpoint + storage

- `POST /api/holded/upload` — multipart form data
- Storage: Supabase Storage o S3 (bucket `isaak-user-files/{tenantId}/`)
- Tipos aceptados: PDF, JPG/PNG, DOCX, XLSX, XML (Facturae), CSV
- Límite por plan: Starter 10 MB/archivo, Pyme 25 MB, Empresa 100 MB
- Registro en tabla `IsaakFile` (tenantId, userId, path, mimetype, ocrStatus)

### S6-B: OCR y reconocimiento de documentos

- Motor OCR: Google Vision API o Tesseract (fallback open-source)
- Pipeline de extracción:
  - **Facturas (PDF/imagen)**: NIF, número, fecha, importe, IVA, proveedor/cliente
  - **Tickets de gastos**: fecha, comercio, importe, categoría sugerida
  - **Movimientos bancarios (CSV/XLSX)**: fecha, concepto, importe, saldo
  - **XML Facturae**: parse directo sin OCR (schema conocido)
  - **Facturas de Word/Excel**: extracción estructurada + fallback LLM
- Resultado: JSON normalizado → mostrado al usuario para confirmación

### S6-C: Aplicar a Holded

- Confirmación por el usuario antes de cualquier escritura
- Factura de proveedor → `POST /api/holded/invoices` (purchase invoice)
- Ticket de gasto → `POST /api/holded/expenses` (expense entry)
- Movimientos bancarios → conciliación automática sugerida en Holded
- Mensaje de Isaak: "He reconocido esta factura de [proveedor] por [importe]. ¿La registro en Holded?"

### S6-D: UI de carga en el chat

- Botón clip en `ChatInput` (junto al botón de enviar)
- Preview inline del archivo antes de confirmar
- Progress bar de OCR con mensajes de estado
- Lista de archivos recientes en sidebar o en `/archivos` (nueva sección)

---

## SPRINT 7 — Voz: entrada y salida (3–4 días)

> Permite conversación natural con Isaak sin teclado. Diferenciador clave para autónomos.

### S7-A: Voice input (Speech-to-Text)

- Web Speech API (navegador) como primera implementación — cero coste
- Fallback: OpenAI Whisper API para mayor precisión
- Botón micrófono en `ChatInput`: graba, transcribe, envía automáticamente
- Indicador visual de grabación (ondas animadas)
- Idioma por defecto: `es-ES`, configurable en `/settings`

### S7-B: Voice output (Text-to-Speech)

- Web Speech Synthesis API para respuestas cortas (<200 palabras)
- ElevenLabs API (futuro) para voz más natural tipo Isaak
- Toggle de TTS en la UI: el usuario elige si Isaak habla
- Solo leer respuestas del asistente, no las del usuario
- Pausar TTS si el usuario empieza a escribir

### S7-C: Modo "manos libres"

- Escucha continua: después de que Isaak termina de hablar, activa micrófono
- Wake word simple: doble tap o icono (no "hey Isaak" por complejidad)
- Optimizado para móvil y tablet (autónomos en movimiento)

---

## SPRINT 8 — Integraciones Google (4–5 días) 🟡 PARCIAL

> MCP tools de Google Calendar, Gmail y Drive ya disponibles vía claude.ai.
> El trabajo es conectarlas al workspace de Isaak con auth propia.

### S8-A ✅ Google Calendar — Calendario Fiscal (rutas implementadas)

- OAuth2 Google con scope `calendar.events` — guardar token en `ExternalConnection`
- Crear/actualizar eventos en Google Calendar del usuario
- **Calendario Fiscal Automatizado**:
  - Modelo 303 IVA: trim. 1→20 abr, trim. 2→20 jul, trim. 3→20 oct, trim. 4→30 ene
  - Modelo 100 IRPF: 1–30 junio (estimación directa)
  - Modelo 130 IRPF trimestral (autónomos): mismas fechas que IVA
  - Modelo 349 operaciones intracomunitarias: mensual o trimestral según volumen
  - Personalizado según CNAE del usuario (actividades especiales, IAE)
- Sync periódico: Isaak actualiza el calendario si cambian los datos del usuario

### S8-B: Notificaciones proactivas

- Sistema de alertas en `IsaakAlert` (Prisma): tipo, fecha, tenantId, canal, estado
- Canales por prioridad:
  - **Push web**: Service Worker + Web Push API (gratuito, ya en PWA)
  - **Email**: Resend — plantilla HTML con el branding Isaak
  - **WhatsApp** (Semana 12+): API de 360dialog o Twilio (previo consentimiento)
- Tipos de alerta:
  - Plazo fiscal próximo (D-15, D-7, D-3, D-1)
  - Factura vencida sin cobrar (+30 días)
  - Requerimiento AEAT recibido (detección en Gmail o entrada manual)
  - IVA a devolver / a ingresar calculado
  - Trial expirando
- Configuración por usuario en `/settings?section=notificaciones`

### S8-C: Gmail — Detección de documentos fiscales

- OAuth2 Google scope `gmail.readonly`
- Scan periódico: buscar facturas de proveedores, requerimientos AEAT
- Extracción automática → pipeline OCR (S6-B) → propuesta a usuario
- "Isaak ha detectado una factura de Iberdrola en tu Gmail. ¿La registro?"
- Privacy-first: solo leer, nunca enviar sin confirmación explícita

### S8-D: Google Drive — Archivo de documentos

- OAuth2 Google scope `drive.file` (solo archivos creados por la app)
- Guardar PDFs de facturas Verifactu en carpeta "Isaak — Facturas/{año}"
- Guardar exportaciones de informes (CSV, PDF resumen mensual)
- Mostrar documentos recientes en `/archivos` o desde chat

---

## SPRINT 9 — Admin Panel completo (3–4 días)

> Completar los placeholders existentes y añadir gestión de Isaak.

### S9-A: Admin Stripe (completar stub)

- Métricas en tiempo real: MRR, ARR, trials activos, churn rate
- Lista de suscripciones con filtros: plan, estado, fecha expiración trial
- Acciones: extender trial, cambiar plan, cancelar, emitir crédito

### S9-B: Admin Tenant Billing (completar stub)

- Vista billing por tenant: plan, estado, historial de facturas Stripe
- Logs de `UsageEvent` por tenant (preguntas, uploads, acciones ejecutadas)
- Alertas de uso anómalo (spike repentino)

### S9-C: Admin Isaak Users

- Lista de usuarios Isaak con: plan, ERP conectado, última actividad, conversaciones
- Detalle de tenant: conversaciones, archivos subidos, integraciones activas
- Impersonación controlada (soporte: ver chat sin acceder a datos reales)
- Exportar CSV de usuarios por plan / por estado / por fecha de creación

### S9-D: Admin Notificaciones

- Cola de alertas pendientes / enviadas
- Estadísticas de entrega por canal (email open rate, push CTR)
- Plantillas de email editables sin deploy

---

## SPRINT 10 — PWA + Móvil (2–3 días) 🟡 PARCIAL

> Isaak en el bolsillo del autónomo. Voice input ya hace la experiencia mobile-first.

### S10-A ✅ Progressive Web App

- `manifest.json` completo con nombre, descripción, iconos 72–512 px, shortcuts, screenshots
- Service Worker (`sw.js`) con estrategias: cache-first para estáticos, network-first para navegación, stale-while-revalidate para assets; push notifications futuro incluido
- Iconos generados desde `isaak-avatar-2.png` (8 tamaños en `public/icons/`)
- `next.config.js` headers para `sw.js` y `manifest.json`
- Viewport export + `appleWebApp` metadata en root layout
- Registro del Service Worker inline en `_document` (script en layout)

### S10-B ⬜ Push notifications nativas

- Service Worker registra push subscription → guardada en `PushSubscription` (Prisma)
- Backend envía via Web Push API cuando se genera una alerta (S8-B)
- Icono y vibración configurables

---

## SPRINT 11–12 — Futuro / Backlog

| Ítem                   | Descripción                                           | Prioridad |
| ---------------------- | ----------------------------------------------------- | --------- |
| Multi-ERP              | Conectar Sage, A3, Contaplus además de Holded         | Alta      |
| WhatsApp Bot           | Isaak responde por WhatsApp vía Twilio/360dialog      | Alta      |
| Firma digital          | Firmar facturas con certificado digital (FNMT)        | Media     |
| Isaak para asesores    | Perfil asesor: gestiona N empresas desde un dashboard | Media     |
| Reporting avanzado     | Informes PDF personalizados (P&L, cashflow)           | Media     |
| Banco conectado        | PSD2/Open Banking: lectura automática de movimientos  | Alta      |
| App nativa iOS/Android | Si PWA no es suficiente para push/voz                 | Baja      |
| ERP propio Verifactu   | Modulo básico de facturación sin Holded               | Baja      |

---

## Sistema de suscripciones — estado actual

### Ya implementado

- `TenantSubscription` Prisma model con `trialEndsAt`, `stripeCustomerId`, `stripeSubscriptionId`
- `Plan` model con `code` ('basico', 'pyme', 'empresa', 'pro', 'trial')
- `POST /api/onboarding/start-trial` — crea tenant con trial 30 días
- Stripe webhook handler (checkout.session, subscription events, invoice events)
- `POST /api/subscriptions/portal` — Stripe billing portal
- `GET /api/subscriptions/current` — estado suscripción con datos Stripe
- Checkout Stripe: `apps/landing/app/api/checkout/route.ts` + `apps/isaak/app/api/settings/billing/checkout/route.ts`
- Feature flags por plan en `apps/app/lib/billing/tenantPlan.ts`

### Pendiente

- UI de planes en `/settings?section=billing` (S5-A)
- Banner de trial expirando en workspace (S5-B)
- Cron de expiración automática (S5-B)
- Admin billing pages (S9-A / S9-B)
- Emails de recordatorio trial (S5-B)

---

## Admin Panel — estado actual

### Apps Admin (`apps/admin` → `admin.verifactu.business`)

| Ruta                         | Estado               |
| ---------------------------- | -------------------- |
| `/dashboard`                 | ✅ Operativo         |
| `/tenants`                   | ✅ Operativo         |
| `/tenants/[id]/overview`     | ✅ Operativo         |
| `/tenants/[id]/billing`      | 🔴 Placeholder vacío |
| `/tenants/[id]/users`        | ✅ Operativo         |
| `/tenants/[id]/emails`       | ✅ Operativo         |
| `/tenants/[id]/integrations` | ✅ Operativo         |
| `/tenants/[id]/audit`        | ✅ Operativo         |
| `/users`                     | ✅ Operativo         |
| `/integrations/stripe`       | 🔴 Placeholder vacío |
| `/integrations/resend`       | ✅ Operativo         |
| `/demo-requests`             | ✅ Operativo         |
| `/audit-log`                 | ✅ Operativo         |
| `/operations`                | ✅ Operativo         |

### Holded Admin (`apps/holded/app/admin`)

| Ruta                 | Estado       |
| -------------------- | ------------ |
| `/admin/users`       | ✅ Operativo |
| `/admin/connections` | ✅ Operativo |
| `/admin/activity`    | ✅ Operativo |

### Pendiente para Admin Isaak

- Vista global de usuarios Isaak (conversaciones, plan, actividad)
- Admin billing con datos Stripe en tiempo real
- Panel de notificaciones enviadas
- Gestión de alertas fiscales globales

---

## Principios de diseño del sistema de alertas

```
Alerta fiscal → IsaakAlert (DB) → fan-out por canal configurado
  ├── Web Push (Service Worker)
  ├── Email (Resend template)
  └── WhatsApp (futuro, previo consentimiento explícito)

Configuración usuario → /settings?section=notificaciones
  ├── Activar/desactivar por tipo de alerta
  ├── Selección de canales por alerta
  └── Horario de no molestar
```

---

## Principios de privacidad (obligatorio por GDPR)

- Google OAuth: pedir **solo los scopes mínimos necesarios** (no `gmail.modify`, solo `gmail.readonly`)
- WhatsApp: consentimiento explícito + doble opt-in antes de enviar
- Archivos subidos: encriptados en reposo, eliminados tras N días sin uso
- Impersonación en admin: log inmutable de cada sesión
- Datos LLM: no enviar datos fiscales identificables fuera del contexto de sesión

---

## Métricas de éxito por sprint

| Sprint             | KPI principal                                    |
| ------------------ | ------------------------------------------------ |
| S4 (Verifactu)     | Facturas creadas desde chat / mes                |
| S5 (Suscripciones) | Trial → Paid conversion rate (objetivo: >15%)    |
| S6 (Archivos)      | Documentos procesados por usuario activo / mes   |
| S7 (Voz)           | % sesiones con voice input activado              |
| S8 (Google)        | Calendarios fiscales creados, alertas entregadas |
| S9 (Admin)         | TTFR (time to first resolution) soporte          |
| S10 (PWA)          | % usuarios con PWA instalada                     |

---

_Este documento es la fuente de verdad del roadmap de Isaak. Actualizarlo con cada sprint completado._
