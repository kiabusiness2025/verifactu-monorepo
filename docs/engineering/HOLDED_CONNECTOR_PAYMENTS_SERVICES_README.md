# Holded Connector – Pagos (Payments) y Servicios (Services)

## Estado actual (Abril 2026)

### Implementado

- Compras/gastos (purchases): CRUD completo, validación, tests.
- Contactos (customers): CRUD completo, validación, tests.
- Claims, access-requests, onboarding, status, connect: operativos y alineados con contratos compartidos.

### Pendiente de implementar

- **Pagos (payments):**
  - Endpoints RESTful para listar, crear, obtener, actualizar y eliminar pagos.
  - Tests unitarios y de integración.
  - Documentación OpenAPI/contrato.
- **Servicios (services):**
  - Endpoints RESTful para listar, crear, obtener, actualizar y eliminar servicios.
  - Tests unitarios y de integración.
  - Documentación OpenAPI/contrato.

---

## 1. Pagos (payments)

### Modelo de datos

- Prisma model: `Payment`
- Relacionado con: `Invoice`, `Tenant`
- Campos principales: `id`, `invoiceId`, `tenantId`, `amount`, `method`, `reference`, `paidAt`, `createdAt`

### Endpoints propuestos

- `GET    /api/holded/payments` → Listar pagos
- `POST   /api/holded/payments` → Crear pago
- `GET    /api/holded/payments/[id]` → Obtener pago
- `PUT    /api/holded/payments/[id]` → Actualizar pago
- `DELETE /api/holded/payments/[id]` → Eliminar pago

### Validación y reglas

- Validar existencia de invoice y tenant.
- Validar amount > 0, fecha, método.
- Solo usuarios autenticados y del tenant pueden operar.
- Usar Zod para validación de payloads.

### Tests

- `route.test.ts` y `[id]/route.test.ts` cubriendo todos los flujos.

---

## 2. Servicios (services)

### Modelo de datos

- Prisma model: `CatalogItem` (`itemType = service`)
- Relacionado con: `ServiceCategory`, `CatalogPrice`, `Tenant`
- Campos principales: `id`, `categoryId`, `itemType`, `name`, `description`, `isPublished`, `createdAt`, `updatedAt`

### Endpoints propuestos

- `GET    /api/holded/services` → Listar servicios
- `POST   /api/holded/services` → Crear servicio
- `GET    /api/holded/services/[id]` → Obtener servicio
- `PUT    /api/holded/services/[id]` → Actualizar servicio
- `DELETE /api/holded/services/[id]` → Eliminar servicio

### Validación y reglas

- Validar campos requeridos: name, categoryId, price, descripción.
- Solo usuarios autenticados y del tenant pueden operar.
- Usar Zod para validación de payloads.
- Soft delete recomendado (marcar como inactivo).

### Tests

- `route.test.ts` y `[id]/route.test.ts` cubriendo todos los flujos.

---

## 3. Estructura de carpetas recomendada

```
apps/holded/app/api/holded/payments/
  route.ts
  route.test.ts
  [id]/
    route.ts
    route.test.ts

apps/holded/app/api/holded/services/
  route.ts
  route.test.ts
  [id]/
    route.ts
    route.test.ts
```

---

## 4. Siguientes pasos

1. Definir contratos OpenAPI/Zod para payments y services.
2. Implementar endpoints siguiendo el patrón de compras/contactos.
3. Añadir tests unitarios y de integración.
4. Documentar endpoints en este README y en la documentación pública del conector.
5. Validar integración con frontend y panel admin.

---

## 5. Referencias

- Modelo Prisma: `packages/db/prisma/schema.prisma`
- Ejemplo de endpoints: `apps/holded/app/api/holded/purchases/`, `apps/holded/app/api/holded/customers/`
- Documentación general: `docs/README.md`, `docs/product/ISAAK_HOLDED_API_IMPLEMENTATION_SCOPE.md`

---

**Isaak (con K) – Abril 2026**

Construir confianza, claridad y continuidad.
