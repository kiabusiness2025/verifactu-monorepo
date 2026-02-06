# Formato interno de gasto (canónico)

## Objetivo
Unificar cómo se representa un gasto validado por Isaak antes de registrarlo.

## Estructura
```json
{
  "tenantId": "uuid",
  "date": "YYYY-MM-DD",
  "description": "string",
  "amount": 0,
  "taxRate": 0.21,
  "categoryId": 0,
  "categoryName": "string",
  "deductible": true,
  "reference": "string",
  "notes": "string",
  "source": "pdf|photo|excel|voice|manual"
}
```

## Campos mínimos
- tenantId
- date
- description
- amount

## Campos de validación Isaak
- categoryId
- categoryName
- deductible

## Uso
- Todas las entradas (PDF, foto, Excel, voz) deben producir este formato.
- Solo después se registra el gasto en base de datos.
