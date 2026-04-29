# Plan de Implementación por Bloques — Ampliación Conector Holded (2026)

Este plan está diseñado para que Codex implemente y valide cada bloque de ampliación de forma incremental, siguiendo el orden de prioridades de negocio y permitiendo validación tras cada entrega.

---

## Prioridad 1 — Impacto máximo inmediato

### 1. Compras / gastos / facturas de proveedor

**Objetivo:** cubrir el lado de gasto real de la empresa.

**Scopes a pedir:**

- holded_list_purchases
- holded_get_purchase
- holded_create_purchase_draft o holded_create_purchase
- (opcional después) holded_list_purchase_orders
- (opcional después) holded_list_purchase_refunds

**Por qué va primero:**

- Completa ventas + compras
- Permite alquileres, suministros, asesoría, gastos recurrentes
- Es clave para IVA soportado y contabilidad real

**Mínimo funcional:**

- Listar compras por fecha
- Obtener una compra concreta
- Crear compra borrador con: proveedor, fecha, líneas, IVA, retención si aplica

**Caso demo:**

- Factura de alquiler con IVA y retención
- Factura de luz
- Factura de asesoría externa

---

### 2. Contactos CRUD

**Objetivo:** no depender de importaciones o UI para altas y cambios.

**Scopes a pedir:**

- holded_create_contact
- holded_update_contact
- holded_delete_contact

**Por qué va segundo:**

- Desbloquea flujos completos
- Necesario para ventas, compras, proyectos, pagos

**Mínimo funcional:**

- Crear cliente
- Crear proveedor
- Actualizar email/teléfono/dirección
- Borrar o desactivar contacto si la API lo soporta

**Caso demo:**

- “crea un nuevo proveedor de alquiler”
- “actualiza el email del cliente”
- “da de alta un cliente para emitir factura”

---

### 3. Empleados

**Objetivo:** cubrir la capa laboral básica.

**Scopes a pedir:**

- holded_list_employees
- holded_get_employee
- holded_create_employee
- holded_update_employee

**Por qué va tercero:**

- Muy relevante para asesoría y demo pyme
- Conecta con nóminas, tiempos, proyectos

**Mínimo funcional:**

- Listar empleados
- Obtener ficha
- Crear empleado con datos básicos
- Actualizar datos de empleado

**Caso demo:**

- “lista empleados”
- “abre la ficha de Laura”
- “crea un nuevo empleado”

---

### 4. Pagos / cobros

**Objetivo:** cubrir tesorería y cierre de documentos.

**Scopes a pedir:**

- holded_list_payments
- holded_get_payment
- holded_create_payment
- holded_update_payment
- holded_pay_document

**Por qué va cuarto:**

- Muy útil para seguimiento financiero
- Mejora mucho la demo de negocio real

**Mínimo funcional:**

- Ver pagos
- Registrar pago/cobro
- Vincular pago a documento

**Caso demo:**

- “registra el cobro de esta factura”
- “marca esta compra como pagada”
- “muéstrame los pagos de este mes”

---

### 5. Servicios

**Objetivo:** facturación estructurada y catálogo reutilizable.

**Scopes a pedir:**

- holded_list_services
- holded_get_service
- holded_create_service
- holded_update_service

**Por qué va quinto:**

- Esencial para empresas de servicios como Nova Gestión
- Mejora ventas, propuestas y consistencia

**Mínimo funcional:**

- Listar catálogo
- Crear servicio
- Actualizar precio/IVA/descripción

**Caso demo:**

- “crea un servicio de consultoría puntual”
- “actualiza el precio del servicio recurrente”
- “muéstrame el catálogo de servicios”

---

## Prioridad 2 — Operativa completa

### 6. Productos

- holded_list_products
- holded_get_product
- holded_create_product
- holded_update_product

### 7. Proyectos con escritura

- holded_create_project
- holded_update_project

### 8. Tareas con escritura

- holded_create_project_task
- (opcional) holded_update_project_task
- (opcional) holded_delete_project_task

### 9. Bookings con escritura

- holded_create_booking
- holded_update_booking

### 10. Time tracking

- holded_create_employee_time
- holded_list_employee_times
- o equivalente de proyecto/tiempo si lo separan así

---

## Prioridad 3 — Contabilidad robusta

### 11. Cuentas contables completas

**Objetivo:** que el conector vea y maneje el plan contable completo.

- mantener holded_list_accounts
- mejorar implementación para no devolver vista parcial
- holded_create_accounting_account con payload real completo

**Muy importante:**
Aquí no basta con “exponer”; hay que revisar la implementación porque ahora no estamos viendo todo el cuadro.

### 12. Asientos de diario completos

- mantener holded_list_daily_ledger
- holded_create_daily_ledger_entry con payload explícito de líneas

**Mínimo funcional:**

- fecha
- concepto
- líneas con cuenta / debe / haber

### 13. Taxes / impuestos

- holded_list_taxes

**Valor:**

- muy útil para IVA
- clave si se quieren automatizar validaciones fiscales

### 14. Expenses accounts

- holded_list_expenses_accounts
- holded_get_expenses_account
- holded_create_expenses_account
- holded_update_expenses_account

**Valor:**

- especialmente útil si se potencia compras/gastos

---

**Cada bloque debe implementarse y validarse antes de pasar al siguiente.**

Este plan debe mantenerse actualizado según validaciones y cambios en la API pública de Holded.
