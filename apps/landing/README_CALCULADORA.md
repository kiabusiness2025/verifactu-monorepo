# Calculadora de precio (Landing)

## Ubicación

- Inline: `apps/landing/app/components/PricingCalculatorInline.tsx`
- Modal: `apps/landing/app/components/PricingCalculatorInlineModal.tsx`
- Planes: `apps/landing/app/lib/plans.ts`

## Resultado mostrado al usuario

La calculadora muestra de forma explícita:

1. Cuota del plan.
2. Exceso de facturas (según incluidas del plan).
3. Subtotal sin IVA.
4. IVA (21%).
5. Total mensual estimado.

## Tramos de exceso

- 1-25 facturas extra: `0.50 EUR` por factura.
- 26-100 facturas extra: `0.35 EUR` por factura.
- 101-500 facturas extra: `0.20 EUR` por factura.
- 501+ facturas extra: `0.12 EUR` por factura.

## Fórmula

- `excess = max(0, floor(issuedInvoices) - includedInvoices(plan))`
- `overage = suma_por_tramos(excess)`
- `subtotal = planPrice + overage`
- `iva = subtotal * 0.21`
- `total = subtotal + iva`

## Integración

- En home se renderiza en sección `#planes`.
- En FAQ se abre desde modal con `onOpenCalculator`.
