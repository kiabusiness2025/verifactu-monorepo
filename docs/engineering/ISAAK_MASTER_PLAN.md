# Isaak — Plan Maestro de Evolución (Ingeniería)

**Última actualización**: 2026-05-16
**Visión**: Isaak como agente fiscal y contable autónomo que conecta con datos reales del ERP, ejecuta acciones con confirmación, aprende de cada empresa y asesora en lenguaje llano.

> Para contexto de producto, pricing y estrategia de captación ver `docs/product/ISAAK_MASTER_PLAN.md`.

---

## Estado actual — apps/isaak

| Componente                                   | Estado | Notas                                             |
| -------------------------------------------- | ------ | ------------------------------------------------- |
| Auth + workspace layout                      | ✅     | Sesión, onboarding, sidebar, bottom nav           |
| `/api/holded/chat` (chat con ERP)            | ✅     | Holded context, historial, memoria, invoice tool  |
| `/api/chat` (chat libre/público)             | ✅     | Auth opcional, fallback rules, rate-limit IP      |
| `/resumen` dashboard KPIs                    | ✅     | Ventas, gastos, cobros, IVA, gráfico 6m           |
| Verifactu — create + PDF + QR                | ✅     | S4 completo                                       |
| Stripe billing (checkout/portal/cancel/cron) | ✅     | S5 completo; precios Stripe pendientes sync       |
| OCR + upload gastos                          | ✅     | S6: `upload-expense`, Claude Vision, confirmación |
| Voz STT + TTS                                | ✅     | S7: Web Speech API                                |
| Google Calendar + Gmail + Drive              | ✅     | S8-A/B/C/D                                        |
| Alertas fiscales cron                        | ✅     | S8-B: D-15/7/3/1                                  |
| Push notifications                           | ✅     | S10-B: VAPID, Service Worker                      |
| PWA                                          | ✅     | S10-A                                             |
| Isaak admin copilot (IsaakDock)              | ✅     | Fase G-K base: chat + 4 tools BD                  |
| Admin K1 — `get_tenant_holded_data`          | ✅     | Usa `external_connections.api_key_enc`            |
| **Free tier diario (10 msg/día)**            | ❌     | P0-3: pendiente implementar                       |
| **Pricing page actualizada**                 | ❌     | P0-1: muestra €49 Pro, falta Starter €19          |

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
| K2  | Análisis fiscal por tenant: IVA trimestral estimado, retenciones | ⬜ P1-4       | 4h       |
| K3  | Alerta proactiva: "3 facturas sin contabilizar"                  | ⬜ P2-1       | 2h       |
| K4  | Comparativa mensual/anual tenant                                 | ⬜ P2-2       | 2h       |
| K5  | Resumen modelo 303 estimado por tenant                           | ⬜ P2         | 3h       |

K2 depende de K1 (✅). Implementar K2 antes de K3/K4.

---

## Fase G — Aprendizaje continuo y respuestas ricas (admin)

| ID  | Tarea                                                         | Esfuerzo | Estado  |
| --- | ------------------------------------------------------------- | -------- | ------- |
| G1  | Feedback thumbs up/down en IsaakDock → tabla BD               | 1h       | ⬜ P1-3 |
| G2  | Top-rated responses en `/connectors/isaak-tests`              | 30 min   | ⬜      |
| G3  | Markdown rendering en IsaakDock (react-markdown + remark-gfm) | 30 min   | ⬜ P1-2 |
| G4  | SYSTEM_PROMPT mejorado: tablas, negrita, listas               | 10 min   | ⬜      |

---

## Fase H — Datos, exportaciones y gráficos (admin)

| ID  | Tarea                                                          | Esfuerzo | Dependencia |
| --- | -------------------------------------------------------------- | -------- | ----------- |
| H1  | Tool `get_activity_timeline` — actividad diaria 30d por tenant | 1h       | —           |
| H2  | Bloque estructurado `{ type: 'chart', ... }` en respuestas     | 2h       | H1          |
| H3  | Renderer barras/línea en IsaakDock (recharts)                  | 2h       | H2          |
| H4  | Tool `export_to_excel` — XLSX de cualquier dataset BD          | 2h       | —           |
| H5  | Botón "Descargar Excel" en respuestas con tablas               | 1h       | H4          |

---

## Fase L — Isaak público con contexto por tenant

Depende de K1-K2 validados. Permite que el usuario final (no solo admin) use Isaak con datos reales.

| ID  | Tarea                                                         | Esfuerzo | Dependencia |
| --- | ------------------------------------------------------------- | -------- | ----------- |
| L1  | Feature flag `ISAAK_PUBLIC_ENABLED` por tenant (admin activa) | 1h       | —           |
| L2  | Consentimiento explícito de acceso a datos en onboarding      | 2h       | L1          |
| L3  | Isaak usa `IsaakConversation` del tenant para contexto        | 3h       | L2          |
| L4  | SYSTEM_PROMPT personalizado: empresa, sector, régimen         | 2h       | L3          |
| L5  | Few-shot por tenant: aprende del historial                    | 3h       | G1, L3      |
| L6  | Métricas uso Isaak por tenant en admin                        | 2h       | G1, L1      |

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
