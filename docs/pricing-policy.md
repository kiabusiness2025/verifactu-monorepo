# Verifactu Business - Política de precios (v2)

> Fecha: 2026-01-08  
> Estado: Activa  
> Ámbito: Suscripción mensual + cálculo por uso (facturas y movimientos)

## Resumen (1 minuto)
- Cobro mensual, sin anual por ahora.
- 1 mes de prueba gratis con aviso previo del importe.
- Base 19 € / mes + IVA.
- Facturas: base incluye hasta 10 al mes. Tramos hasta 1.000.
- Movimientos: 0 = 0 €. Tramos hasta 2.000 si conciliación ON.
- Por encima de esos límites: presupuesto personalizado.

---

## PARTE A - INTERNO (operativo)

### A1) Fuente de verdad
- Cálculo: apps/landing/app/lib/pricing/calc.ts
- Checkout: apps/landing/app/api/checkout/route.ts
- Stripe sync: scripts/stripe/sync-and-fill-env.mjs

### A2) Definiciones internas
- Factura emitida: documento final (no borrador) con campos mínimos válidos.
- Movimiento bancario procesado: transacción importada y registrada (PSD2 o Excel).
- Movimientos duplicados no se cuentan (dedupe por claves internas).

### A3) Tramos vigentes
Base:
- 19 € / mes (incluye 1-10 facturas/mes).

Facturas (por tramo, no acumulativo):
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

Movimientos (solo si conciliación ON, por tramo):
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

### A4) Stripe (v1)
Checkout "subscription":
- line_items:
  - STRIPE_PRICE_BASE_MONTHLY
  - STRIPE_PRICE_INVOICES_* (si aplica)
  - STRIPE_PRICE_MOV_* (si aplica)

### A5) Aviso previo
- Siempre notificar "tu próxima cuota será X € + IVA" antes del cobro.

---

## PARTE B - PÚBLICO (web / términos)

### B1) Cómo se calcula el precio
La cuota mensual se basa en:
- Facturas emitidas
- Movimientos bancarios procesados (solo si activas conciliación)

La calculadora muestra una estimación orientativa.

### B2) Límites de la calculadora
- Hasta 1.000 facturas/mes
- Hasta 2.000 movimientos/mes

Si superas esos límites, ofrecemos presupuesto personalizado.

### B3) Impuestos
Los importes se muestran sin IVA salvo que se indique lo contrario.

---

## Historial
- v2 (2026-01-08): tramos finos con límites 1.000/2.000, sin multiempresa.
