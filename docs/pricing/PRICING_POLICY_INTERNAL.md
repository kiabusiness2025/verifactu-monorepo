# Política de precios (INTERNAL) - Verifactu Business

## Objetivo
Modelo simple "por tramo" (bandas). El checkout siempre incluye:
- Base mensual
- 0 o 1 add-on de facturas (según tramo)
- 0 o 1 add-on de movimientos (según tramo, si conciliación activada)

## Incluido en el precio base
- Base: 19 € / mes (neto, sin IVA)
- Facturas emitidas incluidas: hasta 10 / mes
- Movimientos bancarios incluidos: 0 (por defecto). Si conciliación ON y movimientos > 0, aplica tramo.

## Fuente de verdad (código)
- Cálculo: apps/landing/app/lib/pricing/calc.ts
- Checkout: apps/landing/app/api/checkout/route.ts
- Stripe sync + env: scripts/stripe/sync-and-fill-env.mjs
- Vercel env upsert: scripts/vercel/upsert-landing-env-bonus.ps1

## Facturas emitidas (tramos)
- 1-10: +0
- 11-20: +5
- 21-30: +10
- 31-40: +15
- 41-50: +20
- 51-100: +25
- 101-200: +35
- 201-300: +45
- 301-400: +55
- 401-500: +65
- 501-1000: +85
- >1000: presupuesto

## Movimientos bancarios (tramos, si conciliación activada)
- 0: +0
- 1-20: +5
- 21-30: +10
- 31-40: +15
- 41-50: +20
- 51-100: +25
- 101-200: +35
- 201-300: +45
- 301-400: +55
- 401-500: +65
- 501-1000: +85
- 1001-2000: +105
- >2000: presupuesto

## Implementación Stripe (V1)
Checkout "subscription":
- line_items:
  - STRIPE_PRICE_BASE_MONTHLY (quantity 1)
  - STRIPE_PRICE_INVOICES_* (quantity 1 si aplica)
  - STRIPE_PRICE_MOV_* (quantity 1 si aplica)

## Actualización mensual por uso real (roadmap inmediato)
- Medir uso real del periodo.
- Antes de renovar:
  - recalcular tramos
  - actualizar items de la suscripción (sin prorrateo)
  - notificar "tu próxima cuota será X € + IVA".
