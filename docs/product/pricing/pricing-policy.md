# Verifactu Business - Política de precios (v3)

> Fecha: 2026-02-23  
> Estado: Activa  
> Ámbito: Suscripción mensual por plan + exceso de facturas

## Resumen (1 minuto)

- Cobro mensual por plan.
- 1 mes de prueba gratis con aviso previo del importe.
- Planes de landing (fuente de verdad): Básico 19 €, PYME 39 €, Empresa 69 €, Pro 99 €.
- Exceso de facturas se estima con calculadora por tramos y se regulariza en la siguiente factura.

---

## PARTE A - INTERNO (operativo)

### A1) Fuente de verdad

- Planes y precios públicos: apps/landing/app/lib/plans.ts
- Calculadora de exceso: apps/landing/app/components/PricingCalculatorInline.tsx
- Checkout Stripe: apps/landing/app/api/checkout/route.ts
- Stripe sync: scripts/stripe/sync-products.mjs

### A2) Definiciones internas

- Factura emitida: documento final (no borrador) con campos mínimos válidos.
- Movimiento bancario procesado: transacción importada y registrada (PSD2 o Excel).
- Movimientos duplicados no se cuentan (dedupe por claves internas).

### A3) Planes vigentes (landing)

- Básico: 19 € / mes (hasta 10 facturas/mes incluidas)
- PYME: 39 € / mes (hasta 100 facturas/mes incluidas)
- Empresa: 69 € / mes (hasta 300 facturas/mes incluidas)
- Pro: 99 € / mes (hasta 1.000 facturas/mes incluidas)

### A4) Exceso de facturas (calculadora)

Tramos de exceso (acumulativos):

- 1-25 extra: 0,50 € / factura
- 26-100 extra: 0,35 € / factura
- 101-500 extra: 0,20 € / factura
- 501+ extra: 0,12 € / factura

El exceso se informa como estimación y se regulariza en la siguiente factura mensual junto con la cuota del plan.

### A5) Stripe (v2 landing)

Checkout "subscription" por plan:

- line_items:
  - STRIPE_PRICE_PLAN_BASICO_MONTHLY
  - STRIPE_PRICE_PLAN_PYME_MONTHLY
  - STRIPE_PRICE_PLAN_EMPRESA_MONTHLY
  - STRIPE_PRICE_PLAN_PRO_MONTHLY

Trial:

- 30 días (`subscription_data.trial_period_days: 30`)

### A5) Aviso previo

- Siempre notificar "tu próxima cuota será X € + IVA" antes del cobro.

---

## PARTE B - PÚBLICO (web / términos)

### B1) Cómo se calcula el precio

La cuota mensual parte del plan contratado (Básico, PYME, Empresa o Pro).

Si superas las facturas incluidas, puedes seguir operando: el exceso se calcula por tramos y se refleja en la siguiente factura mensual.

### B2) Límites de la calculadora

- La calculadora de exceso sirve para estimar facturas adicionales.
- Si superas 1.000 facturas/mes, pasa a presupuesto personalizado.

Si superas esos límites, ofrecemos presupuesto personalizado.

### B3) Impuestos

Los importes se muestran sin IVA salvo que se indique lo contrario.

---

## Historial

- v3 (2026-02-23): landing como fuente de verdad (planes fijos + exceso por tramos).
- v2 (2026-01-08): tramos finos con límites 1.000/2.000, sin multiempresa.
