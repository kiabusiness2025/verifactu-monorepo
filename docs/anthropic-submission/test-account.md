# Standard Testing Account + Example Prompts

> Anthropic exige: "a standard testing account with sample data, at least three working examples of prompts or use cases".

## Cuenta de testing

**Provider:** Holded (https://holded.com)
**Tipo:** Cuenta sandbox con datos seed pre-cargados
**Acceso:** Verifactu Business proporcionará credenciales al reviewer de Anthropic vía email seguro (cifrado o canal interno).

### Datos seed disponibles

- **Contactos:** 5 clientes (Acme S.L., Beta Studios, Kappa Digital Zaragoza SL, Delta Group, Epsilon Tech)
- **Facturas:** 12 facturas emitidas en los últimos 3 meses
- **Productos:** 8 productos con stock variado (algunos en stock bajo, uno agotado)
- **Proyectos:** 4 proyectos activos + 1 cerrado
- **Empleados:** 3 empleados de prueba
- **Tesorería:** 4 cuentas (BBVA, Santander, Stripe, Caja)
- **Asientos contables:** 30+ entradas en el diario de marzo

### Cómo dar acceso al reviewer

1. El reviewer de Anthropic comparte un email corporativo `@anthropic.com`
2. Verifactu crea un User en Holded con ese email
3. Genera API key de Holded de la cuenta sandbox
4. Envía email cifrado (o canal Anthropic interno) con:
   - Email/password de Claude para la prueba
   - URL del consent screen: `https://claude-holded.verifactu.business/oauth/authorize`
   - O directamente la API key de Holded para acelerar el setup

---

## 3 working example prompts (verificables en vivo)

### Ejemplo 1 — Lectura de facturas y análisis (read-only)

**Prompt:**

> "¿Cuánto facturé el mes pasado? Quiénes son mis top 3 clientes por importe?"

**Tools que Claude llamará:**

1. `list_documents` con filtro de tipo `invoice` y rango de fechas del mes anterior
2. Agregación local en Claude (no requiere otro tool call)

**Output esperado:**

> "El mes pasado facturaste 12.450 € en 8 facturas. Tus top 3 clientes fueron:
>
> 1. Acme S.L. — 4.200 €
> 2. Beta Studios — 3.150 €
> 3. Kappa Digital Zaragoza SL — 2.500 €"

---

### Ejemplo 2 — Detalle de contacto y pendientes (read-only)

**Prompt:**

> "Trae los datos de Kappa Digital Zaragoza SL y dime cuánto me debe."

**Tools que Claude llamará:**

1. `list_contacts` para resolver el nombre → contactId
2. `get_contact` con el contactId resuelto
3. Opcionalmente `list_documents` filtrado por contactId para calcular pendiente

**Output esperado:**

> "Kappa Digital Zaragoza SL:
>
> - CIF: B99888777
> - Email: contacto@kappa.es
> - Teléfono: +34 976 123 456
> - Estado: Cliente activo desde 2023
> - **Pendiente de cobro: 2.500 € (1 factura)**"

---

### Ejemplo 3 — Crear borrador de factura con confirmación humana (write)

**Prompt:**

> "Crea un borrador de factura para Beta Studios por 1.500 € de consultoría + 21% IVA, vencimiento a 30 días."

**Tools que Claude llamará:**

1. `list_contacts` para resolver "Beta Studios" → contactId
2. **Antes de llamar `create_invoice_draft`, Claude debe mostrar al usuario un resumen** y pedir confirmación explícita
3. Solo tras la confirmación: `create_invoice_draft` con contactId, líneas, importes

**Output esperado:**

> "Voy a crear un borrador con estos datos:
>
> - Cliente: Beta Studios
> - Concepto: Consultoría
> - Base: 1.500 €
> - IVA 21%: 315 €
> - **Total: 1.815 €**
> - Vencimiento: [fecha + 30 días]
>
> ⚠️ Será un **borrador** — no se envía ni cobra hasta que lo apruebes manualmente en Holded.
>
> ¿Confirmas?"

Tras "Sí":

> "✓ Borrador F0031 creado. Está disponible en Holded → Facturas → Borradores para revisarlo antes de emitirlo."

---

## Comportamiento defensivo a verificar

El reviewer puede intentar:

1. **Saltarse la confirmación:** "Crea la factura y enviala al cliente"
   - El connector NO tiene `holded_send_document` expuesto → no es posible enviar
   - El `approveDoc=false` está forzado → la factura queda en borrador

2. **Pedir borrado:** "Borra la factura F0031"
   - El connector NO tiene `holded_delete_document` expuesto → tool no encontrada

3. **Pedir movimiento de dinero:** "Cobra a Beta Studios"
   - El connector NO tiene `holded_pay_document` expuesto → tool no encontrada

4. **Datos sensibles en respuestas:**
   - API keys nunca aparecen en outputs
   - Stack traces enmascarados con `Internal server error. Reference: <uuid>`

---

## Credenciales (placeholder — rellenar al enviar)

```
# Cuenta sandbox para el reviewer de Anthropic
Holded user: review-anthropic@verifactu.business
Holded API key: [se enviará por canal seguro]
Claude consent flow start: https://claude-holded.verifactu.business/oauth/authorize?
  client_id=test-client&redirect_uri=https://claude.ai/...&...
```

> **NOTA:** No incluir credenciales reales en este file. Generar al enviar la submission y compartir por canal seguro (cifrado o Anthropic internal).
