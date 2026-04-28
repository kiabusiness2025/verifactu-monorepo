# ISAAK — Modelo de Suscripción y Negocio

> Última actualización: 2026-04-28

---

## Planes

|                                   | **Trial**  | **Starter**    | **Pro**         | **Business**     |
| --------------------------------- | ---------- | -------------- | --------------- | ---------------- |
| **Precio mensual**                | Gratis     | **€29/mes**    | **€69/mes**     | **€149/mes**     |
| **Precio anual**                  | —          | €23/mes (−20%) | €55/mes (−20%)  | €119/mes (−20%)  |
| **Duración**                      | 30 días    | —              | —               | —                |
|                                   |            |                |                 |                  |
| **Chat + ERP (Holded)**           | ✅         | ✅             | ✅              | ✅               |
| **Dashboard KPIs**                | ✅         | ✅             | ✅              | ✅               |
| **Alertas automáticas**           | ✅         | ✅             | ✅              | ✅               |
| **Digest semanal email**          | ✅         | ✅             | ✅              | ✅               |
| **Consultas IA**                  | 100 total  | 300/mes        | Ilimitado       | Ilimitado        |
| **OCR imágenes en chat**          | 5 total    | 20/mes         | Ilimitado       | Ilimitado        |
| **Motor IA**                      | Claude     | Claude         | Claude + GPT-4o | Elegible (todos) |
| **Historial conversaciones**      | 30 días    | 90 días        | 1 año           | Ilimitado        |
|                                   |            |                |                 |                  |
| **Google / MS Calendar**          | ❌         | ❌             | ✅              | ✅               |
| **Lectura de email (facturas)**   | ❌         | ❌             | ✅              | ✅               |
| **Inbox facturas (email propio)** | ❌         | ❌             | ✅              | ✅               |
| **Contabilización automática**    | ❌         | ❌             | ✅              | ✅               |
| **Notificaciones push**           | ❌         | ❌             | ✅              | ✅               |
| **Voz (entrada + salida)**        | ❌         | ❌             | ✅              | ✅               |
|                                   |            |                |                 |                  |
| **Documentos mercantiles**        | ❌         | ❌             | ❌              | ✅               |
| **Modelos fiscales (borradores)** | ❌         | ❌             | ❌              | ✅               |
| **Open Banking / Banco**          | ❌         | ❌             | ❌              | ✅               |
| **Conciliación automática**       | ❌         | ❌             | ❌              | ✅               |
| **Multi-ERP**                     | ❌         | ❌             | ❌              | ✅               |
| **API de integración**            | ❌         | ❌             | ❌              | ✅               |
|                                   |            |                |                 |                  |
| **Usuarios**                      | 1          | 1              | 3               | 10               |
| **Soporte**                       | Isaak chat | Email          | Prioritario     | Dedicado         |
| **SLA**                           | —          | —              | —               | 99.5% uptime     |

---

## Add-ons (disponibles en todos los planes de pago)

| Add-on                                   | Precio          |
| ---------------------------------------- | --------------- |
| Usuario adicional                        | €9/mes/usuario  |
| ERP adicional (Sage, A3…)                | €15/mes/ERP     |
| Banco adicional (más de 1 cuenta)        | €10/mes/banco   |
| Firma digital (Signaturit) por documento | €1.50/documento |

---

## Enterprise (>10 usuarios o white-label)

- Precio: desde €499/mes
- White-label: Isaak con tu marca (para asesorías/gestorías)
- On-premise: deploy en infraestructura del cliente
- SSO/SAML
- SLA 99.9% con soporte 24/7
- Formación del equipo incluida

---

## Lógica de trial → conversión

```
Día 0:    Alta → 30 días trial completo (acceso plan Pro)
           Email: "Bienvenido a Isaak — así funciona"
           Onboarding guiado en la app

Día 7:    Email: "¿Qué tal la primera semana?" + caso de uso destacado
           In-app: tip proactivo de Isaak ("Tienes 3 facturas vencidas…")

Día 20:   Email: "Te quedan 10 días de prueba"
           In-app: banner sutil con planes

Día 27:   Email: "Te quedan 3 días" + descuento 25% primer mes
           In-app: modal de conversión con planes

Día 30:   Downgrade automático a plan Gratuito limitado:
           - 5 consultas/mes
           - Solo dashboard (sin chat activo)
           - Banner persistente de conversión
           - Los datos se conservan 90 días más antes de purga

Día 120:  Si no ha convertido → email de "últimas noticias" + oferta final
```

---

## Costes estimados por usuario (Fase 1)

```
Plan Starter (300 consultas/mes):
  Claude Sonnet 4.6 promedio:  ~€0.008/consulta (con tools Holded)
  300 consultas × €0.008     = €2.40/mes en IA
  Infraestructura (prorrateada) = ~€1.50/mes
  Total coste                  = ~€3.90/mes
  Precio                       = €29/mes
  Margen bruto                 ≈ 87%

Plan Pro (ilimitado, promedio 600 consultas/mes estimado):
  IA: 600 × €0.008            = €4.80/mes
  + OCR: 40 docs × €0.01      = €0.40/mes
  Infraestructura              = ~€3/mes
  Total coste                  = ~€8.20/mes
  Precio                       = €69/mes
  Margen bruto                 ≈ 88%

Plan Business (ilimitado, promedio 1.200 consultas/mes):
  IA: 1.200 × €0.009          = €10.80/mes (mix Claude+GPT4o)
  + OCR + Banking              = €5/mes
  + Nordigen fee               = €3/mes
  Infraestructura              = ~€6/mes
  Total coste                  = ~€24.80/mes
  Precio                       = €149/mes
  Margen bruto                 ≈ 83%
```

---

## Implementación Stripe

### Productos y precios a crear

```typescript
// Stripe Product IDs (crear en dashboard o con CLI)
const STRIPE_PRODUCTS = {
  starter: {
    monthly: 'price_starter_monthly', // €29
    annual: 'price_starter_annual', // €276 (= €23 × 12)
  },
  pro: {
    monthly: 'price_pro_monthly', // €69
    annual: 'price_pro_annual', // €660 (= €55 × 12)
  },
  business: {
    monthly: 'price_business_monthly', // €149
    annual: 'price_business_annual', // €1.428 (= €119 × 12)
  },
};

// Límites por plan → usados en lógica de rate limiting
const PLAN_LIMITS: Record<IsaakPlan, { queries: number; ocr: number }> = {
  TRIAL: { queries: 100, ocr: 5 },
  STARTER: { queries: 300, ocr: 20 },
  PRO: { queries: -1, ocr: -1 }, // -1 = unlimited
  BUSINESS: { queries: -1, ocr: -1 },
  ENTERPRISE: { queries: -1, ocr: -1 },
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
