# Stripe Integration - Pricing Calculator

Este directorio contiene el script para sincronizar productos y precios en Stripe según el modelo de calculadora definido en [docs/pricing-policy.md](../../docs/pricing-policy.md).

## Modelo de precios (v1)

El checkout permite al usuario calcular su precio basado en:

- **Facturas emitidas/mes** (min 1)
- **Movimientos bancarios/mes** (min 0, opcional)

### Estructura de precios en Stripe

El script crea un único producto con múltiples precios recurrentes mensuales:

**Planes landing (fuente de verdad)**

- `plan-basico-monthly`: 19€/mes
- `plan-pyme-monthly`: 39€/mes
- `plan-empresa-monthly`: 69€/mes
- `plan-pro-monthly`: 99€/mes

**Base (siempre)**

- `base-monthly`: 19€/mes

**Facturas (tramos, solo >10)**

- `invoices-11-20-monthly`: +5€
- `invoices-21-30-monthly`: +10€
- `invoices-31-40-monthly`: +15€
- `invoices-41-50-monthly`: +20€
- `invoices-51-100-monthly`: +25€
- `invoices-101-200-monthly`: +35€
- `invoices-201-300-monthly`: +45€
- `invoices-301-400-monthly`: +55€
- `invoices-401-500-monthly`: +65€
- `invoices-501-1000-monthly`: +85€

**Movimientos (tramos, solo >0)**

- `mov-1-20-monthly`: +5€
- `mov-21-30-monthly`: +10€
- `mov-31-40-monthly`: +15€
- `mov-41-50-monthly`: +20€
- `mov-51-100-monthly`: +25€
- `mov-101-200-monthly`: +35€
- `mov-201-300-monthly`: +45€
- `mov-301-400-monthly`: +55€
- `mov-401-500-monthly`: +65€
- `mov-501-1000-monthly`: +85€
- `mov-1001-2000-monthly`: +105€

## Uso

### 1. Sincronizar productos y precios

**Desarrollo/Test:**

```powershell
$env:STRIPE_SECRET_KEY="sk_test_xxx"
node scripts/stripe/sync-products.mjs
```

**Producción:**

```powershell
$env:STRIPE_SECRET_KEY="sk_live_xxx"
node scripts/stripe/sync-products.mjs
```

El script imprime las variables de entorno que debes configurar:

```
STRIPE_PRICE_BASE_MONTHLY=price_xxx
STRIPE_PRICE_PLAN_BASICO_MONTHLY=price_xxx
STRIPE_PRICE_PLAN_PYME_MONTHLY=price_xxx
STRIPE_PRICE_PLAN_EMPRESA_MONTHLY=price_xxx
STRIPE_PRICE_PLAN_PRO_MONTHLY=price_xxx
STRIPE_PRICE_INVOICES_11_20_MONTHLY=price_xxx
...
```

### 2. Configurar en Vercel

Copia todas las variables `STRIPE_PRICE_*` al proyecto de **landing** en Vercel (Environment Variables).

### 3. Webhook de Stripe

Para recibir eventos de suscripciones:

1. Ve a Stripe Dashboard → Webhooks
2. Añade endpoint: `https://verifactu.business/api/stripe/webhook`
3. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copia el "Signing secret" y configúralo como `STRIPE_WEBHOOK_SECRET` en Vercel

## Trial de 30 días

El checkout está configurado con `subscription_data.trial_period_days: 30`, por lo que:

- El usuario NO paga al suscribirse
- Tiene 30 días de acceso completo
- Stripe cobra automáticamente al finalizar el trial (si no cancela)
- Durante el trial, se almacenan en metadata los parámetros de uso: `invoices`, `movements`, `bankingEnabled`

## Arquitectura

```
Landing (apps/landing)
├── components/
│   └── PricingCalculatorInlineModal.tsx
├── app/api/
│   ├── checkout/route.ts             # Crea Checkout Session con trial
│   └── stripe/webhook/route.ts       # Recibe eventos de Stripe
```

## Próximos pasos

- [ ] Guardar suscripciones en base de datos (webhook)
- [ ] Implementar medición de uso real durante el trial
- [ ] Notificar al usuario 5-7 días antes del fin del trial con la cuota calculada
- [ ] Permitir ajustar la suscripción según uso real mensual
