# Isaak - Instrucciones operativas exactas (VeriFactu + PDF)

## Propósito

Estas instrucciones definen el comportamiento obligatorio de Isaak en ventas para facturas:

1. Crear borrador con confirmación humana.
2. Emitir a AEAT solo tras confirmación explícita.
3. Generar PDF de la factura emitida.
4. Mostrar estado claro para usuario final, sin tecnicismos innecesarios.

## Reglas de comportamiento

1. Nunca emitir automáticamente tras crear borrador.
2. Antes de emitir, Isaak debe resumir: cliente, concepto, base, IVA y total.
3. Solo emitir si el usuario responde con confirmación explícita (por ejemplo: "sí", "confirmar", "emitir", "adelante").
4. Si falla emisión, explicar en lenguaje claro qué falta corregir.
5. Si emisión ok, ofrecer descarga de PDF inmediatamente.

## Flujo operativo exacto

## Paso A - Crear borrador

Ruta responsable:

- `apps/isaak/app/api/holded/chat/route.ts`

Acción:

- Crear registro en `invoices` con `status='draft'`.

Mensaje al usuario:

- Confirmar que el borrador está creado.
- Mostrar resumen económico.
- Preguntar si desea emitir a AEAT.

## Paso B - Emitir a AEAT

Ruta responsable:

- `apps/isaak/app/api/holded/chat/route.ts` (función de emisión)

Servicio externo:

- `POST /api/verifactu/register-invoice` en API backend.

Regla de persistencia obligatoria cuando emisión es correcta:

- `status='issued'`
- `verifactu_status` actualizado
- `verifactu_hash` actualizado
- `verifactu_qr` actualizado si llega

## Paso C - Generar PDF

Servicio backend:

- `POST /api/verifactu/invoice-pdf`

Entrada mínima:

- número, fecha
- emisor (nombre, NIF, domicilio)
- cliente (nombre, NIF/NIE, domicilio)
- concepto
- base, IVA, total
- huella / CSV / estado si disponibles

Salida:

- `application/pdf` descargable.

## Mensajes de Isaak (plantillas recomendadas)

## Tras crear borrador

"He preparado el borrador de factura con estos datos:\n\n- Cliente: ...\n- Concepto: ...\n- Base: ...\n- IVA: ...\n- Total: ...\n\nSi te parece bien, la emito ahora a AEAT."

## Tras emisión correcta

"Factura emitida correctamente. Ya quedó registrada y lista para descarga en PDF.\n\nSi quieres, te la preparo también para enviar al cliente."

## Tras error de emisión

"No he podido completar la emisión porque hay un dato que revisar: ...\n\nSi quieres, lo corregimos ahora y lo reintentamos."

## Lista de verificación previa a emitir

1. NIF/NIE del cliente con formato válido.
2. Cliente identificado (cuando aplique) en censo AEAT.
3. Base + IVA = total correcto.
4. Fecha en formato correcto.
5. Huella calculada con algoritmo real.

## Lista de verificación tras emitir

1. `status` debe pasar a `issued`.
2. `verifactu_status` no nulo.
3. `verifactu_hash` no nulo.
4. Factura visible en Ventas -> Facturas emitidas.
5. PDF descargable.
