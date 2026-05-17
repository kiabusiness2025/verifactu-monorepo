# Isaak — Plan Maestro de Evolución (Ingeniería)

**Última actualización**: 2026-05-16
**Visión**: Isaak como agente fiscal y contable autónomo que conecta con datos reales del ERP, ejecuta acciones con confirmación, aprende de cada empresa y asesora en lenguaje llano.

> Para contexto de producto, pricing y estrategia de captación ver `docs/product/ISAAK_MASTER_PLAN.md`.

---

## Estado actual — apps/isaak

| Componente                                   | Estado | Notas                                                            |
| -------------------------------------------- | ------ | ---------------------------------------------------------------- |
| Auth + workspace layout                      | ✅     | Sesión, onboarding, sidebar, bottom nav                          |
| `/api/holded/chat` (chat con ERP)            | ✅     | Holded context, historial, memoria, invoice tool; model-per-plan |
| `/api/chat` (chat libre/público)             | ✅     | Auth opcional, fallback rules, rate-limit IP                     |
| `/resumen` dashboard KPIs                    | ✅     | Ventas, gastos, cobros, IVA, gráfico 6m                          |
| Verifactu — create + PDF + QR                | ✅     | S4 completo                                                      |
| Stripe billing (checkout/portal/cancel/cron) | ✅     | S5 completo; precios Stripe pendientes sync                      |
| OCR + upload gastos                          | ✅     | S6: `upload-expense`, Claude Vision, confirmación                |
| Voz STT + TTS                                | ✅     | S7: Web Speech API                                               |
| Google Calendar + Gmail + Drive              | ✅     | S8-A/B/C/D                                                       |
| Alertas fiscales cron                        | ✅     | S8-B: D-15/7/3/1                                                 |
| Push notifications                           | ✅     | S10-B: VAPID, Service Worker                                     |
| PWA                                          | ✅     | S10-A                                                            |
| Isaak admin copilot (IsaakDock)              | ✅     | Fase G-K base: chat + 4 tools BD                                 |
| Admin K1 — `get_tenant_holded_data`          | ✅     | Usa `external_connections.api_key_enc`                           |
| **Free tier diario (10 msg/día)**            | ✅     | `isaak-quota.ts` — DB + in-process fallback                      |
| **Pricing page actualizada**                 | ✅     | 4 planes €0/€19/€49/€149 + "IA incluida"                         |
| Markdown + feedback en IsaakDock             | ✅     | G1+G3: ReactMarkdown, ThumbsUp/Down, recharts                    |

---

## P0 — Bloqueantes inmediatos

### P0-1: Actualizar pricing page

**Archivo:** `apps/isaak/app/pricing/page.tsx`

Cambios necesarios:

- 4 planes: Free (€0) · Starter (€19) · Pro (€49) · Business (€149)
- Eliminar el plan "Conector Holded para Claude" de esta página (es un producto separado)
- Añadir badge "IA incluida" en todos los planes de Isaak
- Añadir FAQ: "¿Necesito Claude.ai o ChatGPT?" → "No. Isaak incluye toda la IA."

### P0-2: Free tier — límite diario 10 mensajes

**Archivo principal:** `apps/isaak/app/api/chat/route.ts`

Estrategia: campo `freeQueriesUsedToday` + `freeQueriesResetAt` en tabla `Tenant` (o tabla `IsaakDailyQuota` si se quiere separar).

```typescript
// Lógica a implementar en /api/chat
const FREE_DAILY_LIMIT = 10;

async function checkFreeLimit(
  tenantId: string | null,
  ip: string
): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  // Si tiene plan activo (Starter+), sin límite
  // Si no (free/sin auth), verificar contador diario
  // Reset automático a medianoche UTC
}
```

Respuesta cuando se alcanza el límite:

```json
{
  "error": "daily_limit_reached",
  "message": "Has llegado a tus 10 mensajes de hoy. Activa Isaak Starter desde 19 €/mes para seguir ahora.",
  "ctaUrl": "/pricing",
  "resetsAt": "2026-05-17T00:00:00Z"
}
```

### P0-3: Sincronizar precios Stripe

Verificar en Stripe dashboard que existen price IDs para:

- Starter mensual: €19 → `STRIPE_PRICE_STARTER_MONTHLY`
- Starter anual: €15.20/mes (=€182/año, −20%) → `STRIPE_PRICE_STARTER_ANNUAL`
- Pro mensual: €49 → `STRIPE_PRICE_PRO_MONTHLY`
- Pro anual: €39.20/mes (=€470/año, −20%) → `STRIPE_PRICE_PRO_ANNUAL`
- Business mensual: €149 → `STRIPE_PRICE_BUSINESS_MONTHLY`
- Business anual: €119.20/mes (=€1.430/año, −20%) → `STRIPE_PRICE_BUSINESS_ANNUAL`

Actualizar `createBillingCheckoutUrl` en `apps/isaak/app/lib/settings.ts` para usar los IDs correctos por plan seleccionado.

---

## Fase K — Multi-conector e inteligencia fiscal (admin)

| ID  | Tarea                                                            | Estado        | Esfuerzo |
| --- | ---------------------------------------------------------------- | ------------- | -------- |
| K1  | Tool `get_tenant_holded_data` en Isaak admin                     | ✅ COMPLETADO | —        |
| K2  | Análisis fiscal por tenant: IVA trimestral estimado, retenciones | ✅ COMPLETADO | —        |
| K3  | Alerta proactiva: "3 facturas sin contabilizar"                  | ✅ COMPLETADO | —        |
| K4  | Comparativa mensual/anual tenant                                 | ✅ COMPLETADO | —        |
| K5  | Resumen modelo 303 estimado por tenant                           | ✅ COMPLETADO | —        |

K2 depende de K1 (✅). Implementar K2 antes de K3/K4.

---

## Fase G — Aprendizaje continuo y respuestas ricas (admin)

| ID  | Tarea                                                         | Esfuerzo | Estado |
| --- | ------------------------------------------------------------- | -------- | ------ |
| G1  | Feedback thumbs up/down en IsaakDock → tabla BD               | 1h       | ✅     |
| G2  | Top-rated responses en `/connectors/isaak-tests`              | 30 min   | ✅     |
| G3  | Markdown rendering en IsaakDock (react-markdown + remark-gfm) | 30 min   | ✅     |
| G4  | SYSTEM_PROMPT mejorado: tablas, negrita, listas               | 10 min   | ✅     |

---

## Fase H — Datos, exportaciones y gráficos (admin)

| ID  | Tarea                                                          | Esfuerzo | Dependencia               |
| --- | -------------------------------------------------------------- | -------- | ------------------------- |
| H1  | Tool `get_activity_timeline` — actividad diaria 30d por tenant | 1h       | ✅ (en isaakTools.ts)     |
| H2  | Bloque estructurado `{ type: 'chart', ... }` en respuestas     | 2h       | ✅ (chart_block en tools) |
| H3  | Renderer barras/línea en IsaakDock (recharts)                  | 2h       | ✅ (IsaakDock.tsx)        |
| H4  | Tool `export_to_excel` — XLSX de cualquier dataset BD          | 2h       | ✅ (excel_block en tools) |
| H5  | Botón "Descargar Excel" en respuestas con tablas               | 1h       | ✅ (IsaakDock.tsx)        |

---

## Fase L — Isaak público con contexto por tenant

Depende de K1-K2 validados. Permite que el usuario final (no solo admin) use Isaak con datos reales.

| ID  | Tarea                                                         | Esfuerzo | Dependencia   |
| --- | ------------------------------------------------------------- | -------- | ------------- |
| L1  | Feature flag `isaak_holded_enabled` por tenant (admin activa) | 1h       | ✅ COMPLETADO |
| L2  | Consentimiento explícito de acceso a datos en onboarding      | 2h       | ✅ COMPLETADO |
| L3  | Isaak usa `IsaakConversation` del tenant para contexto        | 3h       | ✅ COMPLETADO |
| L4  | SYSTEM_PROMPT personalizado: empresa, sector, régimen         | 2h       | ✅ COMPLETADO |
| L5  | Few-shot por tenant: aprende del historial                    | 3h       | ✅ COMPLETADO |
| L6  | Métricas uso Isaak por tenant en admin                        | 2h       | ✅ COMPLETADO |

---

## Fase W — Canal WhatsApp para Isaak

Número de Verifactu asignado por Meta (no acepta llamadas). Los tenants escriben a ese número y Isaak responde con el mismo contexto Holded que en el chat web.

**Credenciales** — en `apps/isaak/.env.local` y en Vercel (proyecto `isaak`):

- `WHATSAPP_ACCESS_TOKEN` — System User Token (no caduca) ✅
- `WHATSAPP_PHONE_NUMBER_ID` — `1068988046305906` ✅
- `WHATSAPP_BUSINESS_ACCOUNT_ID` — `61589736486918` ✅
- `WHATSAPP_APP_ID` — `1487740656465960` ✅
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — `isaak-wa-hook-2026-vb` ✅
- `WHATSAPP_APP_SECRET` — ⏳ pendiente (Meta → Configuración → Básica)

**Webhook Meta a configurar:**

- URL: `https://isaak.verifactu.business/api/whatsapp/webhook`
- Token de verificación: `isaak-wa-hook-2026-vb`
- Suscripciones: `messages`

**Arquitectura — mapeo teléfono → tenant (Opción A):**
El tenant registra su número de WhatsApp en `Ajustes → Perfil`. Cuando llega un mensaje de un número no registrado, Isaak responde pidiendo que se vincule en `isaak.verifactu.business/settings`.

| ID  | Tarea                                                                         | Estado        | Esfuerzo |
| --- | ----------------------------------------------------------------------------- | ------------- | -------- |
| W1  | `GET/POST /api/whatsapp/webhook` — verificación Meta + recepción mensajes     | ✅ COMPLETADO | 1h       |
| W2  | Mapeo `whatsapp_phone` → tenant: `User.phone` + UI Ajustes con badge WhatsApp | ✅ COMPLETADO | 1h       |
| W3  | Pipeline: mensaje entrante → LLM (`loadIsaakBusinessContext`) → respuesta     | ✅ COMPLETADO | 2h       |
| W4  | Rate limit + model-per-plan en webhook (`resolveModelForTenant`)              | ✅ COMPLETADO | 30min    |
| W5  | Mensaje opt-in en primer contacto de número desconocido                       | ✅ COMPLETADO | 30min    |
| W6  | Admin: actividad WhatsApp por tenant en panel                                 | pendiente     | 1h       |

---

## Loop de conversión conector → Isaak (P1-1)

El widget en `holded.verifactu.business` actualmente usa `/api/isaak/support` (soporte técnico, sin límite). Falta el tercer modo "vitrina" que accede a datos reales de Holded y tiene límite diario.

**Implementación pendiente:**

1. Nueva API en `apps/holded`: `POST /api/isaak/vitrina` — llama a Holded con la API key del tenant, responde con datos reales
2. Contador diario por `tenantId` (o por `sessionId` si no autenticado): máximo 50 consultas/día
3. Al superar límite: respuesta con CTA a `isaak.verifactu.business`
4. El modo se activa cuando el usuario está conectado en `holded.verifactu.business` y hace preguntas con datos reales

---

## Stack técnico por fase

| Fase | Librerías nuevas               | Notas                            |
| ---- | ------------------------------ | -------------------------------- |
| P0   | —                              | Solo cambios de código existente |
| G    | `react-markdown`, `remark-gfm` | Ya en node_modules               |
| H    | `recharts`, `xlsx` (SheetJS)   | XLSX ya usado en admin exports   |
| L    | —                              | Infraestructura existente        |

---

## Decisiones de arquitectura

- **Motor IA:** `callLLM` en `@verifactu/utils` abstrae el provider. Free/Starter → Haiku (`claude-haiku-4-5`). Pro/Business → Sonnet (`claude-sonnet-4-6`). El plan del usuario determina qué modelo se inyecta.
- **Rate limit free:** por `tenantId` cuando autenticado; por IP cuando público. Ventana 24h rolling, reset a medianoche UTC. NO usar solo el rate limit por IP actual (20/min) — es anti-abuso de red, no límite de producto.
- **Acciones con escritura:** confirmación obligatoria. El assistant propone, el usuario confirma con "sí/confirmar/ok". Sin excepciones en ningún plan.
- **Contexto tenant en admin:** `SYSTEM_PROMPT` base + contexto dinámico con `tenantId` extraído de la URL. K1 provee datos reales de Holded.
