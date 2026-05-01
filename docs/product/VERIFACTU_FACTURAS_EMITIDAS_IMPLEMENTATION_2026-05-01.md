# VeriFactu + Facturas Emitidas (Implementación 2026-05-01)

## Objetivo

Consolidar el flujo completo de factura en 4 pasos:

1. Crear borrador.
2. Emitir a AEAT (VeriFactu).
3. Guardar estado real de emisión.
4. Generar PDF descargable para cliente.

Además, separar claramente en plataforma:

- Borradores (todavía no emitidos).
- Facturas emitidas (ya registradas en canal VeriFactu).

## Cambios implementados en esta iteración

### 1) Integración AEAT VeriFactu robusta

- mTLS explícito en cliente SOAP.
- Payload alineado con contrato AEAT (Cabecera + RegistroAlta).
- Prueba real en entorno AEAT de pruebas.

Archivos:

- `apps/api/soap-client.js`
- `apps/api/verifactu-xml.js`
- `apps/api/verifactu-xml.test.js`
- `scripts/test-verifactu-register.mjs`

### 2) Generación de PDF de factura

- Generador PDF real (backend API).
- Endpoint de descarga por POST.

Archivos:

- `apps/api/invoice-pdf.js`
- `apps/api/index.js` (ruta `POST /api/verifactu/invoice-pdf`)

### 3) Separación operativa draft vs emitida

Cuando la emisión a AEAT se confirma, la factura deja de estar en borrador:

- `status = issued`
- `verifactu_status` actualizado con el estado técnico/fiscal.

Archivo:

- `apps/isaak/app/api/holded/chat/route.ts`

### 4) Ventas: subapartado Facturas emitidas

Se añadió subapartado en el módulo Ventas con listado operativo:

- búsqueda (número, cliente, NIF)
- filtro por estado
- filtro por cliente
- filtro por periodo predefinido
- orden configurable

Archivos:

- `apps/isaak/app/(workspace)/ventas/VentasWorkspaceClient.tsx`
- `apps/isaak/app/(workspace)/ventas/IssuedInvoicesPanel.tsx`
- `apps/isaak/app/(workspace)/ventas/page.tsx`
- `apps/isaak/app/api/ventas/invoices/issued/route.ts`

## Contrato funcional del subapartado Facturas emitidas

## Fuente de datos

Endpoint:

- `GET /api/ventas/invoices/issued`

Sólo devuelve facturas del tenant activo que cumplan:

- `status = issued` o
- `verifactu_status in (validated, accepted, accepted_with_errors)`

## Filtros soportados

- `q`: texto libre (número, cliente, NIF)
- `status`: estado de emisión (`all`, `validated`, `accepted`, `accepted_with_errors`, `pending`, `error`)
- `customer`: nombre cliente exacto (selector)
- `period`: `current_month`, `previous_month`, `current_quarter`, `previous_quarter`, `current_year`, `previous_year`, `all`
- `sortBy`: `issueDate`, `number`, `customerName`, `amountGross`, `updatedAt`
- `sortDir`: `asc` | `desc`

## Salida

- `items[]` con campos de factura emitida
- `total` para paginación/listados
- `customers[]` para selector de cliente

## Reglas de UX

- El usuario ve primero Chat de ventas.
- Puede cambiar a Facturas emitidas sin salir de Ventas.
- Si no hay datos, mostrar estado vacío claro.
- Si hay error de carga, mensaje concreto y no técnico.

## Separación en BD: contrato recomendado

La separación mínima ya implementada es por estado (`draft` vs `issued`).

Recomendación de endurecimiento (siguiente fase):

1. Añadir enum de ciclo de vida (`draft`, `issued`, `cancelled`) si se requiere tipado fuerte.
2. Mantener `verifactu_status` para estado técnico AEAT.
3. No mezclar en listados de emisión registros `draft` con `pending` intermedio.

## SQL de referencia (siguiente fase opcional)

Si se decide estandarizar histórico existente:

```sql
UPDATE invoices
SET status = 'issued'
WHERE (verifactu_status IN ('validated', 'accepted', 'accepted_with_errors'))
  AND status = 'draft';
```

## QA mínimo

1. Crear borrador desde chat.
2. Confirmar emisión.
3. Verificar que cambia a `status=issued`.
4. Abrir Ventas -> Facturas emitidas y comprobar que aparece en listado.
5. Probar filtros: estado, cliente y periodo.
6. Probar orden por fecha y por total.
7. Generar PDF de la misma factura y comprobar descarga.

## Riesgos conocidos

- Puede haber facturas antiguas con `verifactu_status` válido pero `status=draft` (se corrige con migración SQL de referencia).
- La huella VeriFactu debe ser de cálculo real para evitar estado "Aceptada con errores".

## Próximo paso recomendado

Unificar en una sola acción de producto:

- "Emitir y generar PDF"

Flujo:

1. Emite AEAT.
2. Persiste estado final.
3. Devuelve PDF listo para descargar.
