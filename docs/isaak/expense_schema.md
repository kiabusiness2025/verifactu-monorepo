# Isaak v2 Expense Canonical Schema

Objetivo: definir una salida canónica única para gastos procesados por Isaak, independiente del plan.

Este esquema alimenta dos motores de salida:
- Motor A: Export AEAT Excel (todos los planes)
- Motor B: Integración contable vía API (Empresa/PRO)

## Contract (canonical payload)

```json
{
  "supplierName": "string",
  "supplierTaxId": "string|null",
  "issueDate": "YYYY-MM-DD",
  "total": 0,
  "base": 0,
  "vatAmount": 0,
  "vatRate": 0,
  "currency": "EUR",
  "docType": "invoice|ticket|receipt|bank_fee|payroll|other",
  "taxCategory": "iva_deducible|iva_no_deducible|suplido|exento|other",
  "aeatConcept": "string|null",
  "aeatKey": "string|null",
  "confidence": {
    "supplierName": 0,
    "supplierTaxId": 0,
    "issueDate": 0,
    "total": 0,
    "base": 0,
    "vatAmount": 0,
    "vatRate": 0,
    "docType": 0,
    "taxCategory": 0,
    "aeatConcept": 0,
    "aeatKey": 0
  },
  "warnings": [
    "string"
  ],
  "estimated": {
    "base": false,
    "vatAmount": false,
    "vatRate": false,
    "issueDate": false
  }
}
```

## Required fields

- `supplierName`
- `issueDate`
- `total`
- `currency`
- `docType`
- `taxCategory`
- `confidence`
- `warnings`

## Validation rules (hard)

- Nunca inventar NIF/CIF/VAT (`supplierTaxId` queda `null` si no aparece).
- Si `docType` es `bank_fee`, `payroll` u `other` sin IVA:
  - `vatRate = 0`
  - `vatAmount = 0`
- Si faltan datos obligatorios para libros AEAT, no bloquear:
  - mantener registro
  - añadir `warnings` explícitos
- Si hay total pero falta base/IVA:
  - estimar solo con indicios claros
  - marcar `estimated.* = true`
  - añadir warning
- Si hay múltiples fechas:
  - priorizar fecha de emisión
  - si no existe, usar fecha de cargo con warning

## Tax behavior

- Si hay IVA y deducibilidad incierta:
  - proponer `taxCategory`
  - bajar `confidence.taxCategory`
  - solicitar confirmación en UI
- `aeatConcept` y `aeatKey` son opcionales pero recomendables cuando aplique.

## Output format from Isaak

Isaak debe devolver siempre:
1. JSON canónico validable (Zod)
2. Resumen humano corto (1-3 líneas) para la UI

## UI confirmation contract

Antes de persistir como "source of truth", usuario confirma:
- proveedor
- fecha
- base / IVA / tipo
- `docType`
- `taxCategory`
- `aeatConcept` opcional

## Minimal Zod sketch

```ts
import { z } from 'zod';

export const expenseCanonicalSchema = z.object({
  supplierName: z.string().min(1),
  supplierTaxId: z.string().min(1).nullable(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total: z.number().nonnegative(),
  base: z.number().nonnegative(),
  vatAmount: z.number().nonnegative(),
  vatRate: z.number().nonnegative(),
  currency: z.string().default('EUR'),
  docType: z.enum(['invoice', 'ticket', 'receipt', 'bank_fee', 'payroll', 'other']),
  taxCategory: z.enum(['iva_deducible', 'iva_no_deducible', 'suplido', 'exento', 'other']),
  aeatConcept: z.string().nullable(),
  aeatKey: z.string().nullable(),
  confidence: z.record(z.number().min(0).max(1)),
  warnings: z.array(z.string()),
  estimated: z.object({
    base: z.boolean(),
    vatAmount: z.boolean(),
    vatRate: z.boolean(),
    issueDate: z.boolean(),
  }),
});
```
