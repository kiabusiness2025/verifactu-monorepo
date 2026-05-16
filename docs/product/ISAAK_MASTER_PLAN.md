# Isaak — Plan Maestro de Producto

> Última actualización: 2026-05-16
> Estado: documento vivo — revisión completa post-auditoría

---

## Visión

**Isaak** es el copiloto fiscal y contable de la pyme española: un agente de IA que conecta con el ERP del cliente (Holded primero), lee sus datos reales, ejecuta acciones con confirmación explícita y asesora en lenguaje llano sobre IVA, IRPF, cobros, gastos y Verifactu. No sustituye al gestor — le da contexto de calidad y automatiza el trabajo repetitivo.

---

## Ecosistema de productos — 3 canales, 1 producto de pago

| Canal                | App               | URL                          | Estado                                           | Coste para usuario                    |
| -------------------- | ----------------- | ---------------------------- | ------------------------------------------------ | ------------------------------------- |
| **Conector ChatGPT** | `apps/app`        | `chatgpt.verifactu.business` | ✅ Operativo · ⏳ pendiente aprobación OpenAI    | Gratis (requiere ChatGPT Plus/Teams)  |
| **Conector Claude**  | `apps/holded-mcp` | `claude.verifactu.business`  | ✅ Operativo · ⏳ pendiente aprobación Anthropic | Gratis (requiere Claude.ai Pro/Teams) |
| **Isaak**            | `apps/isaak`      | `isaak.verifactu.business`   | ✅ En producción                                 | Ver tarifas abajo                     |

**Regla fundamental:**

- Los conectores son el **funnel de adquisición gratuito** — la IA corre a costa del usuario (Claude.ai / ChatGPT Plus).
- **Isaak** es el producto de pago — la IA corre a cuenta de Verifactu Business (Anthropic API). El usuario no necesita ninguna suscripción adicional.
- Esta distinción **debe estar explícita** en la landing de Isaak y en el pricing.

---

## Tarifas — versión definitiva

> Objetivo: resolver la inconsistencia entre `pricing/page.tsx` (€49), `ISAAK_SUBSCRIPTION_MODEL.md` (€69) y los sprints internos (€19/€49/€149).

| Plan           | Precio          | Límites                                                            | IA incluida                          |
| -------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------ |
| **Free**       | 0 €             | 10 mensajes/día · solo chat fiscal general · sin Holded            | Sí — Claude Haiku                    |
| **Starter**    | 19 €/mes        | Holded conectado · 200 consultas/mes · sin OCR ni Google           | Sí — Claude Haiku                    |
| **Pro**        | 49 €/mes        | Ilimitado · OCR · Google Calendar/Gmail/Drive · voz · push         | Sí — Claude Sonnet                   |
| **Business**   | 149 €/mes       | Todo Pro + multi-usuario (10) · modelos AEAT · banking · multi-ERP | Sí — Claude Sonnet + GPT-4o opcional |
| **Enterprise** | Desde 499 €/mes | White-label · on-premise · SSO · SLA 99,9%                         | A medida                             |

**Descuento anual:** −20% en todos los planes de pago (equivale a 2,4 meses gratis).

**Add-ons disponibles (Starter+):**

- Usuario adicional: 9 €/mes
- ERP adicional (Sage, A3…): 15 €/mes/ERP
- Banco adicional (>1 cuenta): 10 €/mes

---

## Funnel de conversión

```
Conector ChatGPT / Claude (gratis, requiere licencia propia)
  │
  ├─ Widget Isaak en holded.verifactu.business
  │    ├─ Modo soporte técnico → sin límite
  │    ├─ Modo servicios puntuales → sin límite
  │    └─ Modo vitrina (datos reales Holded) → 50 consultas/día → CTA Isaak
  │
  └─ Llegada a isaak.verifactu.business
       ├─ Free (10 msg/día) → prueba valor sin fricción
       ├─ Trial 14 días Pro (sin tarjeta) → onboarding activo
       └─ Conversión a plan de pago
```

**Copy del límite en el widget del conector:**

> "Has alcanzado el límite diario del conector. Para análisis continuo con memoria de tu empresa, Isaak está disponible en isaak.verifactu.business"

**Copy del límite free en Isaak:**

> "Has llegado a tus 10 mensajes de hoy. Tu progreso y contexto se guardan — mañana vuelves donde lo dejaste, o activa Isaak Starter desde 19 €/mes para seguir ahora."

---

## Estado actual del producto — mayo 2026

### ✅ Completado

| Área                      | Detalle                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Auth + workspace          | Login, sesión, onboarding Holded                                                         |
| Chat Holded               | `/api/holded/chat` — contexto real, historial, memoria simple, herramientas              |
| Chat libre (free/público) | `/api/chat` — sin Holded, con sistema de prompts contextual                              |
| Dashboard KPIs            | `/resumen` — ventas, gastos, pendiente cobro, IVA estimado, gráfico 6m                   |
| Verifactu nativo          | `create_verifactu_invoice`, PDF+QR, registro AEAT                                        |
| Billing Stripe            | Checkout, portal, cancel, webhooks, trial banner, cron expiry                            |
| OCR + upload              | `POST /api/holded/upload-expense`, Claude Vision, confirmación → Holded                  |
| Voz                       | STT (Web Speech), TTS (Speech Synthesis), botón micrófono                                |
| Google Calendar           | OAuth, sync, calendario fiscal automatizado                                              |
| Gmail scan                | `gmail.readonly`, scan + caché, GmailCard                                                |
| Google Drive              | `drive.file`, carpeta «Isaak — Facturas»                                                 |
| Push notifications        | VAPID JWT, Service Worker, suscripción, preferencias                                     |
| PWA                       | manifest.json, sw.js, 8 iconos                                                           |
| Alertas fiscales          | `IsaakAlert`, cron D-15/7/3/1, email Resend                                              |
| Admin K1                  | `get_tenant_holded_data` en Isaak admin — usa `external_connections` (todos los canales) |
| Admin Isaak copilot       | IsaakDock en panel admin, 3 tools BD, chat route                                         |

### ⚠️ Inconsistencias a resolver (P0)

| Nº   | Problema                                                                                                | Archivo afectado                         | Acción                                         |
| ---- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| I-01 | Precio Pro en UI = 49 € pero doc interna = 69 €                                                         | `apps/isaak/app/pricing/page.tsx`        | Decidir precio → sincronizar UI                |
| I-02 | Plan Starter (19 €) no aparece en pricing UI                                                            | `apps/isaak/app/pricing/page.tsx`        | Añadir card Starter                            |
| I-03 | Free tier en código = solo rate-limit por IP (20/min) — no hay límite diario de 10 mensajes por usuario | `apps/isaak/app/api/chat/route.ts`       | Implementar `dailyFreeQueries` por tenantId/IP |
| I-04 | Pricing page no dice "IA incluida, sin Claude.ai"                                                       | `apps/isaak/app/pricing/page.tsx`        | Añadir copy explícito                          |
| I-05 | FAQ pricing no responde "¿Necesito Claude.ai o ChatGPT?"                                                | `apps/isaak/app/pricing/page.tsx`        | Añadir FAQ entry                               |
| I-06 | `ISAAK_SUBSCRIPTION_MODEL.md` tiene precios distintos al plan definitivo                                | `docs/isaak/ISAAK_SUBSCRIPTION_MODEL.md` | Actualizar con tabla definitiva                |

---

## Backlog priorizado

### P0 — Bloqueantes de conversión (esta semana)

| ID   | Tarea                                                                                                                                               | Esfuerzo |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| P0-1 | Actualizar `pricing/page.tsx`: 4 cards (Free €0 / Starter €19 / Pro €49 / Business €149) con copy "IA incluida"                                     | 2h       |
| P0-2 | Añadir FAQ en pricing: "¿Necesito Claude.ai o ChatGPT para usar Isaak?" → "No. Isaak incluye toda la IA en el precio."                              | 30 min   |
| P0-3 | Implementar límite diario Free: tabla `IsaakDailyQuota` o campo en `IsaakTenant`, contador por `tenantId` (auth) e IP (público), reset a medianoche | 3h       |
| P0-4 | Sincronizar precios en Stripe dashboard con tabla definitiva (€19/€49/€149) y actualizar IDs en código                                              | 1h       |
| P0-5 | Actualizar `ISAAK_SUBSCRIPTION_MODEL.md` con tarifas definitivas                                                                                    | 30 min   |

### P1 — Diferenciadores de producto (próximas 2 semanas)

| ID   | Tarea                                                                                                                                           | Esfuerzo | Dependencia |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| P1-1 | Loop conversión widget conector → Isaak: contabilizar consultas del widget de holded.verifactu.business, mostrar CTA a Isaak al llegar a 50/día | 3h       | —           |
| P1-2 | Markdown rendering en IsaakDock admin (Fase G3: react-markdown + remark-gfm)                                                                    | 30 min   | —           |
| P1-3 | Feedback thumbs up/down en chat Isaak y en IsaakDock admin (Fase G1)                                                                            | 1h       | —           |
| P1-4 | K2: Isaak admin — análisis fiscal automatizado por tenant (IVA trimestral estimado, retenciones, resumen 303) usando K1                         | 4h       | K1 ✅       |
| P1-5 | Banners in-app por plan (Free ve CTA; Pro/Business no)                                                                                          | 1h       | P0-3        |

### P2 — Crecimiento (mes 2)

| ID   | Tarea                                                                                             | Esfuerzo | Dependencia |
| ---- | ------------------------------------------------------------------------------------------------- | -------- | ----------- |
| P2-1 | K3: Alertas proactivas Isaak admin — "3 facturas sin contabilizar con vencimiento hoy"            | 2h       | K2          |
| P2-2 | K4: Comparativa mensual/anual por tenant en Isaak admin                                           | 2h       | K2          |
| P2-3 | Fase L1: Feature flag `ISAAK_PUBLIC_ENABLED` por tenant — activación manual desde admin           | 1h       | —           |
| P2-4 | Fase L2–L4: Onboarding Isaak público con consentimiento + SYSTEM_PROMPT personalizado por empresa | 5h       | L1          |
| P2-5 | Gráficos y exports Excel en Isaak admin (Fase H: recharts + SheetJS)                              | 5h       | —           |
| P2-6 | Open Banking Salt Edge — completar flujo mandato + transacciones en workspace Isaak               | 4h       | —           |

### P3 — Asesorías y B2B (mes 3+)

| ID   | Tarea                                                                       | Esfuerzo |
| ---- | --------------------------------------------------------------------------- | -------- |
| P3-1 | Modo Asesoría: workspace multi-cliente bajo una cuenta, pricing por volumen | —        |
| P3-2 | White-label: Isaak con marca propia (Enterprise)                            | —        |
| P3-3 | Modelos AEAT en Business: borradores 303, 130, 390 pre-rellenados           | —        |
| P3-4 | Conector Sage / A3 (segundo ERP)                                            | —        |

---

## Métricas de negocio

| Métrica                 | Target M3 | Target M6 | Target M12 |
| ----------------------- | --------- | --------- | ---------- |
| MRR                     | €1.500    | €5.000    | €15.000    |
| Usuarios Free activos   | 200       | 800       | 2.000      |
| Trial → Paid conversion | 20%       | 28%       | 35%        |
| Churn mensual           | <8%       | <6%       | <4%        |
| ARPU (pagando)          | €40       | €50       | €60        |
| NPS                     | >40       | >55       | >65        |

---

## Variables de entorno críticas

```env
# Anthropic API (motor IA de Isaak — no necesario para los conectores)
ANTHROPIC_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_STARTER_MONTHLY=price_...   # €19/mes
STRIPE_PRICE_PRO_MONTHLY=price_...       # €49/mes
STRIPE_PRICE_BUSINESS_MONTHLY=price_...  # €149/mes

# Google OAuth (Calendar + Gmail + Drive)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Push notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... (igual que VAPID_PUBLIC_KEY)
VAPID_SUBJECT=mailto:soporte@verifactu.business

# Alertas + cron
CRON_SECRET=...
RESEND_API_KEY=...

# Open Banking
SALTEDGE_CLIENT_ID=...
SALTEDGE_SERVICE_SECRET=...
```

---

## Decisiones de arquitectura vigentes

- **Motor IA por plan:** Free/Starter → Claude Haiku (coste ~€0.003/consulta). Pro → Claude Sonnet (coste ~€0.008/consulta). Business → Sonnet + GPT-4o opcional.
- **Rate limit free tier:** por `tenantId` si autenticado, por IP si público. Ventana = 24h rolling. Almacenamiento: campo `freeQueriesUsedToday + freeQueriesResetAt` en `Tenant` o tabla dedicada `IsaakDailyQuota`.
- **Contexto por tenant:** SYSTEM_PROMPT base + sección dinámica con empresa, sector, régimen, señales del workspace.
- **Acciones con escritura:** siempre requieren confirmación explícita del usuario (factura, gasto, asiento). Sin excepciones.
- **Conectores como funnel:** el widget en `holded.verifactu.business` llama a `/api/isaak/support` para soporte y a la Holded API para "vitrina". El límite de vitrina (50/día) dispara CTA a Isaak — este límite **no está implementado** aún (P1-1).

---

## Estrategia de captación — conectores pendientes de aprobación

Mientras los conectores ChatGPT y Claude están **pendientes de aprobación** por OpenAI y Anthropic respectivamente, la captación se apoya en:

1. Widget Isaak en `holded.verifactu.business` (activo, sin límite de aprobación externa)
2. SEO y contenido en `isaak.verifactu.business`
3. Campaña directa a usuarios de Holded (email, LinkedIn)
4. Demo pública en `/demo`

Una vez aprobados los conectores, se activa el loop principal:

```
Usuario en ChatGPT/Claude → conecta Holded → usa conector gratis
  → llega al límite diario del widget
  → CTA → registra en Isaak gratis
  → trial 14 días Pro → conversión
```

---

## Documentos relacionados

| Doc                                                              | Descripción                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/isaak/ISAAK_SUBSCRIPTION_MODEL.md`                         | Modelo de suscripción detallado (actualizar con precios definitivos) |
| `docs/isaak/ISAAK_PLATFORM_VISION.md`                            | Visión de plataforma a largo plazo                                   |
| `docs/engineering/ISAAK_MASTER_PLAN.md`                          | Plan técnico por fases (G-L) con desglose de implementación          |
| `docs/product/CONNECTOR_ACQUISITION_FUNNEL_PLAN_2026.md`         | Estrategia detallada del funnel conector → Isaak                     |
| `docs/engineering/ADMIN_PANEL_CONNECTORS_AUDIT_AND_PLAN_2026.md` | Auditoría y plan del panel de administración                         |
