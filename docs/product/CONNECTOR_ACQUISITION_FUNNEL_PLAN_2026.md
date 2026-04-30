# Plan maestro: conectores como funnel de captación

> Última revisión: 2026-04-30
> Estado: documento vivo — activo como referencia estratégica de producto

---

## Objetivo

Definir cómo los conectores públicos de Holded (Claude y ChatGPT) actúan como funnel deliberado de captación hacia Isaak como producto principal de pago, sin derivar en tres productos separados.

La regla es simple:

- Conectores gratuitos → adquisición de usuarios reales con Holded
- Widget/chat de Isaak en los conectores → demostración de valor + invitación natural
- `isaak.verifactu.business` → producto de pago con historial, memoria y sin límites
- `app.verifactu.business` → plataforma avanzada para planes empresa/pro
- Un solo core, una sola base de datos, un solo modelo de planes

---

## El funnel completo

```
Usuario activo de Holded
        │
        ▼
Conector gratuito (ChatGPT o Claude)
holded.verifactu.business
        │
        ▼
Widget de Isaak en todas las páginas del conector
        │
    ┌───┴────────────────────────────────────────┐
    │                                            │
    ▼                                            ▼
Modo 1: Soporte técnico                  Modo 2: Servicios de pago puntual
del conector (sin límite)                Migración, formación, onboarding
Resuelve errores OAuth,                  demo gratuita (0€) · 490€-1.190€
API key, conexión                        Catálogo con precios ya en prompt
    │                                            │
    │                         Modo 3: Vitrina de Isaak completo
    │                         Responde con datos reales de Holded
    │                         Límite suave (50 consultas/día)
    │                                  │
    │                                  ▼
    │                         Al llegar al límite:
    │                         "Para análisis continuo con memoria,
    │                          prueba Isaak completo"
    │                                  │
    └──────────────────────────────────┘
                    │
                    ▼
        isaak.verifactu.business
        Trial 30 días → Plan mensual
        Historial · Memoria · Sin límites
        Holded conectado como fuente compartida
```

---

## Los tres modos del widget en los conectores

### Modo 1 — Soporte técnico del conector

- Sin límite de consultas
- Resuelve: conexión, errores OAuth, API key inválida, permisos, autenticación
- Objetivo único: el usuario termina con el conector funcionando
- Prompt: `buildIsaakSupportSystemPrompt` — ya implementado y correcto
- No menciona planes ni subscripciones; solo resuelve el problema técnico

### Modo 2 — Asesor de servicios de pago puntual

- Sin límite de consultas
- Catálogo disponible (precios sin IVA):
  - Demo gratuita de Holded — 0 € · 15 minutos
  - Onboarding inicial de Holded — 490 €
  - Migración de ejercicio actual + anterior — 790 €
  - Migración completa + inventario/productos — 1.190 €
  - Formación personalizada en Holded — 90 €/hora
- Cuándo proponerlos: cuando el usuario detecta que empieza con Holded, tiene datos desordenados, migra desde otro sistema, o pregunta cómo configurar algo
- Resultado: transacción directa (contacto o reserva), sin necesidad de suscripción
- Prompt ya incluye el catálogo completo; falta instrucción de cuándo mencionarlo

### Modo 3 — Vitrina de Isaak completo

- Límite suave de 50 consultas diarias por tenant
- El usuario hace preguntas de negocio reales con datos de Holded en tiempo real
- El widget responde usando herramientas de Holded — el usuario ve valor real antes de pagar
- Al llegar al límite: mensaje claro que explica qué es Isaak y por qué es diferente
- El límite no es una pared de rechazo; es el punto de invitación más natural posible

---

## Regla de oro de copy para el límite de cuota

No confundir usuario gratuito de conector con cliente que tiene plan actualizable.

```
MAL:  'Has alcanzado el límite diario de consultas. Vuelve mañana o actualiza tu plan para continuar.'

BIEN: 'Has alcanzado el límite diario del conector. Para análisis continuo con historial y memoria
       de tu empresa, Isaak completo está disponible en isaak.verifactu.business'
```

El "mal" mensaje asume que el usuario tiene un plan y lo puede cambiar dentro del conector. No tiene ninguno. El "bien" explica la propuesta de valor de Isaak y dirige al sitio correcto.

---

## Arquitectura de destino

```
holded.verifactu.business
├── Conector ChatGPT (OAuth gratuito)
│   ├── Widget Isaak: 3 modos
│   │   ├── Soporte técnico (sin límite)
│   │   ├── Servicios puntuales (sin límite)
│   │   └── Vitrina Isaak con datos Holded (límite → CTA)
│   └── Chat embebido: demostración con datos reales
│
├── Conector Claude (MCP gratuito)
│   └── (mismos 3 modos, mismo widget)
│
└── Sin checkout, sin planes, sin billing

isaak.verifactu.business  ← producto principal
├── Trial 30 días (sin tarjeta)
├── Plan Starter · Pyme · Empresa
├── Precio: STRIPE_PRICE_ISAAK_MONTHLY (no HOLDED_*)
├── Historial y memoria persistente
├── Sin límite de consultas
└── Holded conectado como fuente de datos compartida

app.verifactu.business  ← plataforma avanzada
├── Billing real conectado al core compartido (TenantSubscription)
├── Panel de integraciones contables (planes empresa/pro)
├── Accounting API validada por plan
└── Mismo tenant, misma DB, mismo modelo de planes
```

---

## Plan de implementación por fases

---

### Fase 0 — Correcciones urgentes (1–2 horas)

Son correcciones mínimas de copy o configuración que afectan a usuarios actuales y se pueden hacer sin riesgo.

#### F0-A: Mensaje de cuota en el chat del conector

**Archivo:** `apps/holded/app/api/isaak/chat/route.ts` — línea 27

```typescript
// ANTES
'Has alcanzado el límite diario de consultas. Vuelve mañana o actualiza tu plan para continuar.';

// DESPUÉS
'Has alcanzado el límite diario del conector. Para análisis continuo con historial y memoria de tu empresa, Isaak completo está disponible en isaak.verifactu.business';
```

**Por qué:** el usuario en el conector no tiene ningún plan que actualizar. El mensaje actual dirige al usuario al sitio equivocado y genera confusión.

#### F0-B: Variables de precio en el billing de Isaak

**Archivo:** `apps/isaak/app/lib/settings.ts` — función `readDefaultPriceId` (línea ~160)

```typescript
// ANTES
function readDefaultPriceId() {
  return (
    process.env.STRIPE_PRICE_HOLDED_FISCAL_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_HOLDED_MIGRACIONES_MONTHLY?.trim() ||
    ''
  );
}

// DESPUÉS
function readDefaultPriceId() {
  return (
    process.env.STRIPE_PRICE_ISAAK_MONTHLY?.trim() ||
    process.env.STRIPE_PRICE_HOLDED_FISCAL_MONTHLY?.trim() || // fallback temporal
    ''
  );
}
```

**Infraestructura:** añadir `STRIPE_PRICE_ISAAK_MONTHLY` como variable de entorno en Vercel (Isaak). El valor puede ser el mismo price ID que `STRIPE_PRICE_HOLDED_FISCAL_MONTHLY` ahora mismo; lo que se cambia es el naming.

**Por qué:** el producto que se vende es Isaak. La configuración debe reflejar eso desde el primer día para evitar errores cuando los price IDs divergan.

---

### Fase 1 — Funnel de captación del widget (2–4 horas)

Añadir la instrucción de invitación a Isaak en el prompt de soporte del widget flotante.

#### F1-A: Cuarta capa en el prompt del widget

**Archivo:** `apps/holded/app/lib/isaak-support-prompt.ts`

Añadir una constante `ISAAK_PROMOTION_LAYER` y incluirla en el array del builder:

```typescript
const ISAAK_PROMOTION_LAYER = `
CUÁNDO Y CÓMO MENCIONAR ISAAK COMPLETO:

Isaak completo (isaak.verifactu.business) es la aplicación principal de Verifactu Business.
Tiene historial persistente, memoria de empresa, análisis continuos y sin límite de consultas.

Menciona Isaak completo de forma natural (nunca como primer mensaje ni de forma forzada) cuando:
1. El usuario hace preguntas de análisis recurrentes que este widget no puede responder bien
   por falta de contexto histórico ("¿cómo fue el trimestre anterior?", "¿qué cambió respecto al mes pasado?")
2. El usuario pide que recuerdes algo para más adelante o pregunta si puedes guardar su contexto
3. El usuario hace más de 3 preguntas seguidas sobre su negocio y ya tiene Holded conectado
4. El usuario pregunta directamente si existe una versión más completa

Fórmula recomendada:
"Para ese tipo de análisis con historial y memoria de tu empresa, Isaak completo funciona mejor.
Está disponible en isaak.verifactu.business con prueba gratuita de 30 días."

Reglas:
- Una sola mención por conversación; no repetir
- Primero resuelve el problema o responde la pregunta; después menciona Isaak si aplica
- Nunca interrumpas soporte técnico urgente para hacer la mención
- No uses la mención como escape cuando no sabes responder algo
`.trim();
```

#### F1-B: Instrucción de servicios en el momento correcto

**Mismo archivo:** añadir en `SUPPORT_ROLE` cuándo proponerlo:

El prompt ya tiene el catálogo completo con precios. Solo falta añadir en `SUPPORT_ROLE` una guía de detección:

```
Señales para proponer un servicio puntual (migración, formación, onboarding, demo):
- El usuario comenta que está empezando con Holded o que tiene datos desorganizados
- El usuario migra desde otro software o desde Excel
- El usuario no sabe cómo configurar el plan de cuentas o la facturación
- El usuario pide ayuda para algo que va más allá del soporte técnico del conector
Propón el servicio con naturalidad, sin presión, después de haber ayudado primero.
```

---

### Fase 2 — Cuota persistente y mensajes de invitación cohesivos (1–2 días)

El objetivo es que el límite de consultas sea coherente entre instancias y el mensaje de invitación sea consistente en todas las superficies.

#### F2-A: Refactorizar `checkIsaakQuota` para devolver contexto

**Archivo:** `apps/holded/app/lib/isaak-quota.ts`

```typescript
// ANTES
export function checkIsaakQuota(tenantId: string): boolean;

// DESPUÉS
type QuotaResult = { allowed: true } | { allowed: false; cta: string; message: string };

export function checkIsaakQuota(tenantId: string): QuotaResult;
```

El route handler convierte el resultado en la respuesta HTTP con el mensaje y CTA correctos. Así el mensaje de invitación se gestiona en un solo punto.

#### F2-B: Cuota en DB (cuando esté disponible la tabla)

El archivo ya tiene el comentario que lo señala:

> "replace this with a real DB-backed quota check against IsaakSubscription.queriesUsed / queriesLimit"

La tabla `TenantSubscription` ya existe. Cuando se aplique la migración con el campo de cuotas, reemplazar la lógica en memoria por una consulta a `prisma.tenantSubscription.findFirst`.

---

### Fase 3 — Billing real en apps/app (1 día)

**Archivo:** `apps/app/app/dashboard/settings/page.tsx` — sección `activeTab === 'billing'`

El tab de billing en el panel avanzado muestra datos hardcodeados:

- "Plan Profesional - 99€/mes"
- "Mastercard terminada en 4242"
- "Factura INV-2026-01"

Reemplazar por una llamada al endpoint de billing compartido (`loadBillingData`) que ya existe en `apps/isaak/app/lib/settings.ts` y consume `TenantSubscription` de la base de datos compartida.

**Resultado:** el panel avanzado muestra el plan real del tenant, el método de pago real y el historial real de Stripe — exactamente la misma fuente de verdad que usa Isaak.

---

### Fase 4 — Variable de Stripe `STRIPE_PRICE_ISAAK_MONTHLY` en producción (30 minutos)

Una vez creado el nuevo price ID en Stripe con el nombre correcto:

1. Añadir `STRIPE_PRICE_ISAAK_MONTHLY` en Vercel (app `isaak`)
2. Eliminar el fallback temporal de `STRIPE_PRICE_HOLDED_FISCAL_MONTHLY` de `readDefaultPriceId`
3. Actualizar `ADMIN_ENV_VERCEL.md` con la nueva variable

---

### Fase 5 — Copy de invitación en el widget (1–2 horas)

Una vez que la instrucción del prompt (F1-A) está probada en producción, añadir también en el widget client (`IsaakWidget.tsx`) un CTA visual cuando el usuario ve el mensaje de límite de cuota:

```tsx
// En lugar de solo mostrar el mensaje de error de texto
// mostrar además un botón visual
{
  quotaExceeded && (
    <div className="rounded-2xl border border-[#2361d8]/20 bg-[#2361d8]/5 p-3 text-xs leading-5 text-slate-600">
      <span className="font-semibold text-[#2361d8]">Prueba Isaak completo.</span> Historial,
      memoria y sin límites diarios.{' '}
      <a
        href="https://isaak.verifactu.business"
        className="font-semibold text-[#2361d8] underline hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Empezar prueba gratuita →
      </a>
    </div>
  );
}
```

---

## Resumen de archivos y fases

| Fase | Archivo                                       | Cambio                          | Impacto                       |
| ---- | --------------------------------------------- | ------------------------------- | ----------------------------- |
| F0-A | `apps/holded/app/api/isaak/chat/route.ts`     | Mensaje de cuota                | 🔴 Urgente                    |
| F0-B | `apps/isaak/app/lib/settings.ts`              | Variable de precio              | 🔴 Urgente                    |
| F1-A | `apps/holded/app/lib/isaak-support-prompt.ts` | Capa invitación Isaak           | 🟠 Alta                       |
| F1-B | `apps/holded/app/lib/isaak-support-prompt.ts` | Guía de servicios puntuales     | 🟠 Alta                       |
| F2-A | `apps/holded/app/lib/isaak-quota.ts`          | Refactorizar resultado de cuota | 🟡 Media                      |
| F2-B | `apps/holded/app/lib/isaak-quota.ts`          | Cuota en DB                     | 🟡 Media (requiere migración) |
| F3   | `apps/app/app/dashboard/settings/page.tsx`    | Billing real en panel avanzado  | 🟡 Media                      |
| F4   | Vercel + `apps/isaak/app/lib/settings.ts`     | Separar price ID Isaak          | 🟢 Baja (administrativo)      |
| F5   | `apps/holded/app/components/IsaakWidget.tsx`  | CTA visual al límite de cuota   | 🟢 Baja                       |

---

## Qué NO cambiar

- La arquitectura de un solo core, una sola DB y un solo esquema de planes: ya está bien
- El widget/chat de Isaak dentro de los conectores: es la puerta de captación, no un error de arquitectura
- El checkout desactivado en Holded (`/api/checkout` → 410): correcto, el pago sucede solo en Isaak
- El sistema de prompt del widget de soporte (`buildIsaakSupportSystemPrompt`): ya tiene el catálogo completo con precios; solo necesita las capas de F1-A y F1-B
- El flujo OAuth ChatGPT/Claude: funciona, no tocar
- `TenantSubscription`, `ExternalConnection`, `IsaakConversation`: modelos correctos, no fragmetar

---

## Relación con otros documentos

- Arquitectura de producto: `docs/product/ISAAK_PRODUCT_REORDER_PLAN_2026.md`
- Conexiones compartidas Holded: `docs/product/ISAAK_HOLDED_SHARED_CONNECTIONS.md`
- Contrato del conector Fase 1: `docs/product/HOLDED_DIRECT_CONNECTOR_PHASE1_CONTRACT_2026.md`
- Arquitectura de conexión pública: `apps/holded/HOLDED_CONNECTION_ARCHITECTURE.md`
- Plan maestro de producto: `docs/product/ISAAK_MASTER_PLAN.md`
