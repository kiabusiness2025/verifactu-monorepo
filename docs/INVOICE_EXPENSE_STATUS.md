# Estados de facturas (emitidas y recibidas)

## Facturas emitidas (ventas)

Campo: `invoice.status`

Estados sugeridos:

- `draft` → Borrador
- `pending` → Pendiente
- `sent` → Enviada
- `paid` → Pagada
- `overdue` → Vencida
- `canceled` → Cancelada

## Facturas recibidas (gastos)

Campo: `expense_records.status`

Estados sugeridos:

- `received` → Recibida
- `in_review` → En revisión
- `accepted` → Aceptada
- `rejected` → No deducible
- `paid` → Pagada

## Principio

Isaak decide deducible y categoría. El estado se usa para seguimiento visual.
