# Expense Canonical Schema v2

Contrato canónico estable para gastos confirmados por usuario.

## Campos

- supplierName: string
- supplierTaxId?: string | null
- issueDate: string (`YYYY-MM-DD`)
- documentNumber?: string | null

- currency: string (`EUR` por defecto)
- totalAmount: number
- netAmount?: number | null
- vatAmount?: number | null
- vatRate?: number | null

- docType: `invoice|ticket|receipt|bank_fee|payroll|other`
- taxCategory: `iva_deducible|iva_no_deducible|suplido|exento|no_sujeto|pendiente_confirmacion`
- aeatConcept?: string | null
- aeatKey?: string | null

- confidence: `{ [field: string]: number(0..1) }`
- warnings: `string[]`
- source: `{ type: "upload"|"email"|"bank", fileId?: string }`

## Reglas de normalización

- Nunca inventar NIF/CIF/VAT (`supplierTaxId = null` + warning).
- Si falta `issueDate`, usar fecha de carga y warning `issueDate_inferred_from_upload`.
- Si solo hay total:
  - estimar base/IVA solo si `vatRate` fiable
  - marcar warning `amounts_estimated`
- Si no hay desglose fiscal suficiente, warning `missing_tax_breakdown`.
- Si `docType != invoice` y `taxCategory = iva_deducible`, warning `non_invoice_marked_deductible_check`.

## Validación

Implementado en código con Zod en:

- `apps/app/lib/expenses/canonical.ts`
- export: `ExpenseCanonicalV2Schema`

## Consumo

- Motor A (AEAT export) y Motor B (integración API) deben leer solo canonical v2 confirmado.
