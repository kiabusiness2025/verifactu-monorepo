# Politica de precios (INTERNAL) - Verifactu Business

## Objetivo
Modelo simple "por tramo" (bandas). El checkout siempre incluye:
- Base mensual
- 0 o 1 add-on de facturas (segun tramo)
- 0 o 1 add-on de movimientos (segun tramo, si conciliacion activada)

## Incluido en el precio base
- Base: 19 EUR/mes (neto, sin IVA)
- Facturas emitidas incluidas: hasta 10/mes
- Movimientos bancarios incluidos: 0 (por defecto). Si conciliacion ON y movimientos > 0, aplica tramo.

## Fuente de verdad (codigo)
- Calculo: apps/landing/app/lib/pricing/calc.ts
- Checkout: apps/landing/app/api/checkout/route.ts
- Stripe sync + env: scripts/stripe/sync-and-fill-env.mjs
- Vercel env upsert: scripts/vercel/upsert-landing-env-bonus.ps1

## Facturas emitidas (tramos)
- 1-10: +0
- 11-50: +4
- 51-200: +6
- 201-500: +15
- >500: presupuesto

## Movimientos bancarios (tramos, si conciliacion activada)
- 0: +0
- 1-100: +3
- 101-200: +5
- 201-500: +9
- 501-1000: +15
- >1000: presupuesto

## Implementacion Stripe (V1)
Checkout "subscription":
- line_items:
  - STRIPE_PRICE_BASE_MONTHLY (quantity 1)
  - STRIPE_PRICE_INVOICES_* (quantity 1 si aplica)
  - STRIPE_PRICE_MOV_* (quantity 1 si aplica)

## Actualizacion mensual por uso real (roadmap inmediato)
- Medir uso real del periodo.
- Antes de renovar:
  - recalcular tramos
  - actualizar items de la suscripcion (sin prorrateo)
  - notificar "Tu proxima cuota sera X EUR + IVA".
