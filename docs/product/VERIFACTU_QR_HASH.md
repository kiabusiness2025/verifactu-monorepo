# VeriFactu — Implementación QR y Hash

## Descripción

Este módulo implementa la generación de **códigos QR** y **huellas digitales (hash)** para facturas según la normativa VeriFactu de la AEAT.

---

## Componentes

### Backend (apps/api/)

#### 1. **verifactu-generator.js**
Genera QR y hash para cada factura:

- `calculateInvoiceHash(invoice, previousHash)` → Calcula SHA-256
- `generateInvoiceQR(invoice, hash)` → Genera QR como base64
- `processInvoiceVeriFactu(invoice, previousHash)` → Proceso completo
- `getLastInvoiceHash(db, tenantId)` → Obtiene último hash (cadena)

**Cadena de bloques:**
Cada factura incluye el hash de la anterior, creando una cadena inmutable.

#### 2. **verifactu-xml.js**
Actualizado para incluir campos VeriFactu en el XML:
```javascript
DatosVeriFactu: {
  HuellaDigital: verifactu_hash,
  CodigoQR: 'incluido'
}
```

#### 3. **index.js - Endpoint `/api/verifactu/register-invoice`**
1. Calcula hash y genera QR
2. Combina datos con factura original
3. Envía a AEAT vía SOAP
4. Devuelve resultado con QR y hash

---

### Frontend (apps/app/)

#### 1. **Prisma Schema**
Modelo `Invoice` actualizado con:
- `verifactuStatus` → 'pending' | 'sent' | 'validated' | 'error'
- `verifactuQr` → Imagen QR en base64
- `verifactuHash` → Hash SHA-256 de la factura

#### 2. **InvoiceQR.tsx**
Componente React para mostrar:
- Estado de validación con iconos
- Código QR
- Huella digital (primeros 32 caracteres)

#### 3. **DemoInvoice Type**
Actualizado para incluir campos VeriFactu opcionales.

---

## Flujo de uso

### 1. Crear factura
```typescript
POST /api/invoices
{
  "number": "2024-001",
  "issueDate": "2024-01-15",
  "customerName": "Cliente SA",
  "customerNif": "B12345678",
  "amountNet": 1000,
  "amountTax": 210,
  "amountGross": 1210
}
```

### 2. Registrar en VeriFactu (automático o manual)
```typescript
POST /api/verifactu/register-invoice
// Body: datos de la factura

// Respuesta:
{
  "ok": true,
  "data": {
    "verifactu_qr": "data:image/png;base64,iVBORw0KGg...",
    "verifactu_hash": "a3f5e8d2c1b4...",
    "verifactu_status": "validated"
  }
}
```

### 3. Mostrar QR en UI
```tsx
import { InvoiceQR } from "@/components/invoices/InvoiceQR";

<InvoiceQR invoice={invoice} />
```

---

## Normativa AEAT

### Hash (Huella digital)
SHA-256 de:
```
NIF|NumeroFactura|Fecha|ImporteNeto|IVA|Total|HashAnterior
```

### QR Code
URL de validación AEAT:
```
https://verifactu.agenciatributaria.gob.es/verify?
  nif=B12345678
  &numero=2024-001
  &fecha=2024-01-15
  &importe=1210.00
  &hash=a3f5e8d2c1b4...
```

---

## Instalación

### 1. Instalar dependencias
```bash
cd apps/api
npm install qrcode
```

### 2. Sincronizar Prisma
```bash
cd apps/app
npx prisma generate
npx prisma migrate dev --name add_verifactu_fields
```

### 3. Desplegar API en Cloud Run
```bash
gcloud builds submit --config cloudbuild-backend.yaml
```

---

## Testing con AEAT

### 1. Crear factura de prueba
```bash
curl -X POST https://api.verifactu.business/api/verifactu/register-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "uuid-tenant",
    "number": "TEST-001",
    "issueDate": "2024-01-15",
    "customerName": "Cliente Test",
    "customerNif": "B12345678",
    "amountNet": 100,
    "amountTax": 21,
    "amountGross": 121
  }'
```

### 2. Verificar QR
- Escanear QR con móvil
- Debe redirigir a portal AEAT
- Validar datos de la factura

### 3. Comprobar cadena
```sql
SELECT number, verifactu_hash, created_at 
FROM invoices 
WHERE tenant_id = 'uuid' 
ORDER BY created_at DESC 
LIMIT 5;
```

Cada hash debe incluir el anterior en su cálculo.

---

## Mantenimiento

### Regenerar QR de factura existente
```javascript
const { processInvoiceVeriFactu } = require('./verifactu-generator');

const invoice = await prisma.invoice.findUnique({ where: { id } });
const previousHash = await getLastInvoiceHash(prisma, invoice.tenantId);
const verifactu = await processInvoiceVeriFactu(invoice, previousHash);

await prisma.invoice.update({
  where: { id },
  data: verifactu
});
```

### Validar cadena de hashes
```javascript
// Verificar que cada hash incluye el anterior
const invoices = await prisma.invoice.findMany({
  where: { tenantId },
  orderBy: { createdAt: 'asc' }
});

for (let i = 1; i < invoices.length; i++) {
  const prev = invoices[i-1].verifactuHash;
  const current = calculateInvoiceHash(invoices[i], prev);
  
  if (current !== invoices[i].verifactuHash) {
    console.error(`Chain broken at invoice ${invoices[i].number}`);
  }
}
```

---

## Estado actual

✅ Schema Prisma actualizado  
✅ Generador de QR y hash implementado  
✅ XML VeriFactu con campos incluidos  
✅ Endpoint API integrado  
✅ Componente UI para mostrar QR  
✅ Tipos TypeScript actualizados  
✅ Dependencia qrcode instalada  

**Próximos pasos:**
- Ejecutar migración Prisma en producción
- Instalar dependencias en Cloud Run
- Probar con facturas reales en AEAT
- Implementar validación automática en UI
