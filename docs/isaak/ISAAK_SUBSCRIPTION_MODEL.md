# ISAAK — Modelo de Suscripción y Negocio

> Última actualización: 2026-05-18

---

## Planes

|                                     | **Free**     | **Starter**    | **Pro**        | **Business**           |
| ----------------------------------- | ------------ | -------------- | -------------- | ---------------------- |
| **Precio mensual**                  | **€0**       | **€19/mes**    | **€49/mes**    | **€149/mes**           |
| **Precio anual**                    | —            | €15/mes (−20%) | €39/mes (−20%) | €119/mes (−20%)        |
| **IA incluida**                     | ✅           | ✅             | ✅             | ✅                     |
|                                     |              |                |                |                        |
| **Chat fiscal y contable**          | ✅           | ✅             | ✅             | ✅                     |
| **Consultas IA**                    | 10/día       | 200/mes        | Ilimitado      | Ilimitado              |
| **Motor IA**                        | Claude Haiku | Claude Haiku   | Claude Sonnet  | Claude Sonnet + GPT-4o |
| **Historial conversaciones**        | —            | 90 días        | 1 año          | Ilimitado              |
|                                     |              |                |                |                        |
| **Holded conectado (ERP)**          | ❌           | ✅             | ✅             | ✅                     |
| **Dashboard KPIs**                  | ❌           | ✅             | ✅             | ✅                     |
| **OCR imágenes en chat**            | ❌           | ❌             | ✅             | ✅                     |
| **Google Calendar / Gmail / Drive** | ❌           | ❌             | ✅             | ✅                     |
| **Voz (entrada + salida)**          | ❌           | ❌             | ✅             | ✅                     |
| **Notificaciones push**             | ❌           | ❌             | ✅             | ✅                     |
| **Alertas fiscales proactivas**     | ❌           | ❌             | ✅             | ✅                     |
|                                     |              |                |                |                        |
| **Modelos AEAT (303, 130, 390)**    | ❌           | ❌             | ❌             | ✅                     |
| **Open Banking / Banco**            | ❌           | ❌             | ❌             | ✅                     |
| **Multi-ERP**                       | ❌           | ❌             | ❌             | ✅                     |
|                                     |              |                |                |                        |
| **Usuarios**                        | 1            | 1              | 1              | hasta 10               |
| **Soporte**                         | Chat público | Email          | Prioritario    | Dedicado               |
| **SLA**                             | —            | —              | —              | 99.9% uptime           |

---

## Add-ons (disponibles en todos los planes de pago)

| Add-on                                   | Precio          |
| ---------------------------------------- | --------------- |
| Usuario adicional                        | €9/mes/usuario  |
| ERP adicional (Sage, A3…)                | €15/mes/ERP     |
| Banco adicional (más de 1 cuenta)        | €10/mes/banco   |
| Firma digital (Signaturit) por documento | €1.50/documento |

---

---

## Lógica de trial → conversión

```
Día 0:    Alta → 14 días trial completo (acceso plan Pro)
           Email: "Bienvenido a Isaak — así funciona"
           Onboarding guiado en la app

Día 7:    Email: "¿Qué tal la primera semana?" + caso de uso destacado
           In-app: tip proactivo de Isaak ("Tienes 3 facturas vencidas…")

Día 11:   Email: "Te quedan 3 días de prueba"
           In-app: banner sutil con planes

Día 14:   Downgrade automático a plan Free (10 mensajes/día, sin Holded):
           - In-app: banner "Plan gratuito · 10 msg/día → Ver planes"
           - Los datos de la cuenta se conservan
           - Historial bloqueado en lectura

Día 60:   Si no ha convertido → email de "últimas noticias" + oferta final
```

---

## Costes estimados por usuario (Fase 1)

```
Plan Starter (200 consultas/mes, Claude Haiku):
  Claude Haiku 4.5 promedio:   ~€0.001/consulta
  200 consultas × €0.001     = €0.20/mes en IA
  Infraestructura (prorrateada) = ~€1.50/mes
  Total coste                  = ~€1.70/mes
  Precio                       = €19/mes
  Margen bruto                 ≈ 91%

Plan Pro (ilimitado, promedio 600 consultas/mes estimado):
  Claude Sonnet: 600 × €0.008  = €4.80/mes
  + OCR: 40 docs × €0.01       = €0.40/mes
  Infraestructura               = ~€3/mes
  Total coste                   = ~€8.20/mes
  Precio                        = €49/mes
  Margen bruto                  ≈ 83%

Plan Business (ilimitado, promedio 1.200 consultas/mes):
  IA: 1.200 × €0.009           = €10.80/mes (mix Claude+GPT4o)
  + OCR + Banking               = €5/mes
  + Salt Edge fee               = €3/mes
  Infraestructura               = ~€6/mes
  Total coste                   = ~€24.80/mes
  Precio                        = €149/mes
  Margen bruto                  ≈ 83%
```

---

## Implementación Stripe

### Productos y precios a crear

```typescript
// Stripe Product IDs (crear en dashboard o con CLI)
const STRIPE_PRODUCTS = {
  starter: {
    monthly: 'price_starter_monthly', // €19
    annual: 'price_starter_annual', // €180 (= €15 × 12)
  },
  pro: {
    monthly: 'price_pro_monthly', // €49
    annual: 'price_pro_annual', // €468 (= €39 × 12)
  },
  business: {
    monthly: 'price_business_monthly', // €149
    annual: 'price_business_annual', // €1.428 (= €119 × 12)
  },
};

// Límites por plan → usados en lógica de quota (dailyQueryLimit en TenantSubscription)
// -1 = ilimitado; Free por defecto = 10/día (campo dailyQueryLimit default=10 en schema)
const PLAN_LIMITS: Record<IsaakPlan, { dailyQueries: number }> = {
  FREE: { dailyQueries: 10 }, // DB default
  STARTER: { dailyQueries: -1 }, // 200/mes gestionado a nivel billing
  PRO: { dailyQueries: -1 },
  BUSINESS: { dailyQueries: -1 },
  ENTERPRISE: { dailyQueries: -1 },
};
```

### Webhooks necesarios

```
customer.subscription.created   → crear/actualizar IsaakSubscription
customer.subscription.updated   → cambio de plan
customer.subscription.deleted   → cancelar → downgrade a gratuito
invoice.payment_succeeded       → renovación OK → resetear queriesUsed
invoice.payment_failed          → enviar email + marcar past_due
customer.subscription.trial_will_end → email conversión (3 días antes)
```

### Portal de cliente

Habilitar Stripe Billing Portal para que el usuario gestione:

- Cambio de plan (upgrade/downgrade)
- Datos de facturación
- Historial de facturas
- Cancelación

---

## Métricas de negocio a monitorizar

```
MRR (Monthly Recurring Revenue)
  Target M2:  €800
  Target M6:  €5.000
  Target M12: €15.000

Churn rate mensual
  Target: < 5%

Trial → Paid conversion rate
  Target: 25–35%

ARPU (Average Revenue Per User)
  Target M6: €55/mes (mix de planes)

LTV / CAC ratio
  Target: > 3x

NPS
  Target: > 50 (M3), > 65 (M12)
```
