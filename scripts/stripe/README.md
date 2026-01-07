# Stripe Integration - Pricing Calculator

Este directorio contiene el script para sincronizar productos y precios en Stripe según el modelo de calculadora definido en [docs/pricing-policy.md](../../docs/pricing-policy.md).

## Modelo de precios (v1)

El checkout permite al usuario calcular su precio basado en:
- **Empresas activas** (min 1)
- **Facturas emitidas/mes** (min 1)
- **Movimientos bancarios/mes** (min 0, opcional)

### Estructura de precios en Stripe

El script crea un único producto con múltiples precios recurrentes mensuales:

**Base (siempre)**
- `base-monthly`: 19€/mes (incluye 1 empresa)

**Empresas adicionales (desde la 2ª)**
- `company-unit-monthly`: 7€/mes por empresa extra (cantidad variable)

**Facturas (tramos, solo >50)**
- `invoices-51-200-monthly`: +6€
- `invoices-201-500-monthly`: +15€
- `invoices-501-1000-monthly`: +29€
- `invoices-1001-2000-monthly`: +49€

**Movimientos (tramos, solo >0)**
- `mov-1-200-monthly`: +6€
- `mov-201-800-monthly`: +15€
- `mov-801-2000-monthly`: +35€
- `mov-2001-5000-monthly`: +69€

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
STRIPE_PRICE_COMPANY_UNIT_MONTHLY=price_xxx
STRIPE_PRICE_INVOICES_51_200_MONTHLY=price_xxx
...
```

### 2. Configurar en Vercel

Copia todas las variables `STRIPE_PRICE_*` al proyecto de **landing** en Vercel (Environment Variables).

### 3. Webhook de Stripe

Para recibir eventos de suscripciones:

1. Ve a Stripe Dashboard → Webhooks
2. Añade endpoint: `https://verifactu.business/api/webhooks/stripe`
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
- Durante el trial, se almacenan en metadata los parámetros de uso: `companies`, `invoices`, `movements`

## Arquitectura

```
Landing (apps/landing)
├── components/
│   └── PricingCalculatorModal.tsx    # Modal con sliders
├── app/api/
│   ├── checkout/route.ts             # Crea Checkout Session con trial
│   └── webhooks/stripe/route.ts      # Recibe eventos de Stripe
```

## Próximos pasos

- [ ] Guardar suscripciones en base de datos (webhook)
- [ ] Implementar medición de uso real durante el trial
- [ ] Notificar al usuario 5-7 días antes del fin del trial con la cuota calculada
- [ ] Permitir ajustar la suscripción según uso real mensual
