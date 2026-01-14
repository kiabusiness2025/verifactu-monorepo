# Páginas del Dashboard - Documentación Completa

## 📋 Resumen

Hemos creado una suite completa de páginas para el dashboard de Verifactu Business, proporcionando una interfaz integral para gestionar clientes, proveedores, artículos, gastos y facturas.

## 📁 Estructura de Páginas

### `/dashboard` - Página Principal del Dashboard
**Archivo:** `apps/app/app/dashboard/page.tsx`

**Características:**
- Tarjetas de estadísticas con conteo total de:
  - Clientes
  - Proveedores
  - Artículos
  - Gastos registrados
- Botones de acciones rápidas para crear nuevos registros
- Consejo contextual para nuevos usuarios
- Carga de estadísticas desde la API

**Componentes utilizados:**
- `DashboardStats` - Muestra las métricas principales
- `QuickActions` - Botones para acciones rápidas
- `IsaakGreetingCard` - Saludo personalizado

---

### `/dashboard/customers` - Gestión de Clientes
**Archivo:** `apps/app/app/dashboard/customers/page.tsx`

**Características:**
- Tabla con lista de todos los clientes
- Formulario para crear/editar clientes
- Búsqueda por nombre, email o NIF
- Paginación automática
- Campos:
  - Nombre* (requerido)
  - Email
  - Teléfono
  - NIF
  - Dirección
  - Ciudad
  - Código Postal
  - País (dropdown)
  - Condiciones de Pago
  - Notas

**Componentes utilizados:**
- `CustomersManager` - Contenedor principal
- `CustomersTable` - Tabla de visualización
- `CustomersForm` - Formulario de creación/edición

**API Endpoints:**
- `GET /api/customers` - Listar clientes (con paginación y búsqueda)
- `POST /api/customers` - Crear nuevo cliente
- `GET /api/customers/[id]` - Obtener detalles del cliente con facturas
- `PATCH /api/customers/[id]` - Actualizar cliente
- `DELETE /api/customers/[id]` - Eliminar cliente

---

### `/dashboard/suppliers` - Gestión de Proveedores
**Archivo:** `apps/app/app/dashboard/suppliers/page.tsx`

**Características:**
- Tabla con lista de todos los proveedores
- Formulario para crear/editar proveedores
- Búsqueda por nombre, email o NIF
- Paginación automática
- Campos adicionales específicos de proveedores:
  - Código de Cuenta (para integración contable)
  - Condiciones de Pago

**Componentes utilizados:**
- `SuppliersManager` - Contenedor principal
- `SuppliersTable` - Tabla de visualización
- `SuppliersForm` - Formulario de creación/edición

**API Endpoints:**
- `GET /api/suppliers` - Listar proveedores (con paginación y búsqueda)
- `POST /api/suppliers` - Crear nuevo proveedor
- `GET /api/suppliers/[id]` - Obtener detalles con gastos asociados
- `PATCH /api/suppliers/[id]` - Actualizar proveedor
- `DELETE /api/suppliers/[id]` - Eliminar proveedor

---

### `/dashboard/articles` - Catálogo de Artículos
**Archivo:** `apps/app/app/dashboard/articles/page.tsx`

**Características:**
- Tabla con lista de productos/servicios
- Formulario para crear/editar artículos
- Validación de código único por empresa
- Búsqueda por nombre, código o descripción
- Filtro por categoría
- Campos:
  - Código* (SKU, único por empresa)
  - Nombre* (requerido)
  - Descripción
  - Categoría (Servicios, Productos, Consultoría, Desarrollo, Mantenimiento)
  - Unidad (ud, h, d, kg, m, m²)
  - Precio Unitario*
  - IVA % (convertido desde decimal)
  - Código Contable
  - Stock
  - Notas

**Componentes utilizados:**
- `ArticlesManager` - Contenedor principal
- `ArticlesTable` - Tabla de visualización
- `ArticlesForm` - Formulario de creación/edición

**API Endpoints:**
- `GET /api/articles` - Listar artículos (con filtro por categoría)
- `POST /api/articles` - Crear nuevo artículo (valida SKU único)
- `GET /api/articles/[id]` - Obtener detalles con líneas de factura
- `PATCH /api/articles/[id]` - Actualizar artículo
- `DELETE /api/articles/[id]` - Eliminar artículo

---

### `/dashboard/expenses` - Registro de Gastos
**Archivo:** `apps/app/app/dashboard/expenses/page.tsx`

**Características:**
- Tabla con lista de gastos registrados
- Tarjetas de resumen: Total Gastos, IVA Soportado, Total de Registros
- Formulario para crear/editar gastos
- Búsqueda por descripción o referencia
- Filtro por categoría
- Filtro por rango de fechas
- Campos:
  - Fecha* (requerida)
  - Categoría* (Suministros, Viajes, Teléfono, Servicios, Software, Hardware, Alquiler, Mantenimiento, Seguros, Otros)
  - Descripción* (requerida)
  - Importe* (requerido)
  - IVA % (convertido desde decimal)
  - Proveedor (opcional)
  - Código Contable
  - Referencia (número de factura)
  - Notas

**Componentes utilizados:**
- `ExpensesManager` - Contenedor principal
- `ExpensesTable` - Tabla de visualización con resumen
- `ExpensesForm` - Formulario de creación/edición

**API Endpoints:**
- `GET /api/expenses` - Listar gastos (con filtros avanzados)
- `POST /api/expenses` - Crear nuevo gasto (valida proveedor)
- `GET /api/expenses/[id]` - Obtener detalles con información de proveedor
- `PATCH /api/expenses/[id]` - Actualizar gasto
- `DELETE /api/expenses/[id]` - Eliminar gasto

---

### `/dashboard/invoices` - Gestión de Facturas
**Archivo:** `apps/app/app/dashboard/invoices/page.tsx`

**Características:**
- Tabla con lista de facturas emitidas
- Formulario inteligente para crear facturas:
  - Selecciona cliente existente
  - Agrega artículos del catálogo
  - Cálculo automático de totales con IVA
  - Soporte para descuentos por línea
- Campos principales:
  - Cliente* (requerido, dropdown)
  - Número de Factura* (e.g., VF-001)
  - Fecha de Emisión*
  - Fecha de Vencimiento*
  - Líneas de Factura (múltiples artículos)
  - Notas internas

**Características Avanzadas:**
- **Tabla de Líneas Dinámicas:**
  - Agregar/eliminar artículos en tiempo real
  - Mostrar precio, cantidad, IVA
  - Cálculo automático de total por línea
  - Resumen de subtotal, IVA total e importe total

**Componentes utilizados:**
- `InvoicesManager` - Contenedor principal
- `InvoicesTable` - Tabla de visualización
- `InvoicesForm` - Formulario de creación/edición con líneas dinámicas

**API Endpoints:**
- `GET /api/invoices` - Listar facturas (con paginación y búsqueda)
- `POST /api/invoices` - Crear nueva factura con líneas
- `GET /api/invoices/[id]` - Obtener detalles completos
- `PATCH /api/invoices/[id]` - Actualizar factura
- `DELETE /api/invoices/[id]` - Eliminar factura

---

### `/dashboard/settings` - Configuración
**Archivo:** `apps/app/app/dashboard/settings/page.tsx`

**Características:**
- Interfaz con pestañas (Tabs)
- **Pestaña General:**
  - Nombre de la Empresa
  - Email
  - Teléfono
  - NIF/CIF
  - Dirección
  - Ciudad
  - Código Postal
- **Pestaña Facturación:**
  - Información del plan actual
  - Método de pago
  - Historial de facturas
- **Pestaña Integraciones:**
  - Estado de conexiones (Resend, Google Sheets, Zapier)
  - Botones para conectar nuevos servicios
- **Pestaña Equipo:**
  - Gestión de miembros
  - Invitar nuevos miembros
  - Roles de usuario

---

### `/dashboard/layout.tsx` - Layout Compartido
**Archivo:** `apps/app/app/dashboard/layout.tsx`

**Características:**
- Barra lateral (sidebar) con navegación principal
- Barra superior (topbar) con opciones de usuario
- Sistema de contexto IsaakUI para toda la aplicación
- Componentes de Isaak integrados:
  - IsaakDrawer (panel conversacional)
  - IsaakSmartFloating (botón flotante inteligente)
  - IsaakProactiveBubbles (notificaciones proactivas)
  - IsaakPreferencesModal (configuración de Isaak)
  - IsaakDeadlineNotifications (recordatorios fiscales)
- Protección de rutas (ProtectedRoute)
- Requerimiento de email verificado

---

## 🔗 Navegación Sidebar

```
Dashboard (📊)
├─ Dashboard Principal
├─ Facturas (📄)
├─ Clientes (👥)
├─ Proveedores (🏢)
├─ Artículos (📦)
├─ Gastos (💰)
└─ Configuración
```

---

## 🎨 Diseño y Estilos

**Paleta de Colores:**
- Fondo principal: `bg-slate-50` (gris claro)
- Fondo de cards: `bg-white`
- Bordes: `border-slate-200`
- Texto principal: `text-slate-900`
- Texto secundario: `text-slate-600`
- Colores de acción: `bg-blue-600`, `bg-green-600`, `bg-orange-500`, `bg-purple-500`

**Componentes Reutilizables:**
- Tablas responsivas con paginación
- Formularios con validación
- Modales de confirmación
- Estados de carga
- Mensajes de error

---

## 🔐 Seguridad y Validación

**Multi-tenencia:**
- Todos los endpoints validan `tenantId` del usuario en sesión
- Datos aislados por empresa
- Cascade delete para datos relacionados

**Autenticación:**
- Requerimiento de sesión activa en todos los endpoints
- Validación de email verificado para acceso al dashboard

**Validaciones de Formulario:**
- Campos requeridos marcados con *
- Validación de formato de email
- Validación de unicidad (SKU por empresa)
- Validación de relaciones (cliente/proveedor existe)

---

## 📊 Integraciones API

### Endpoints de Datos (16 total)

**Customers (5):**
```
GET    /api/customers
POST   /api/customers
GET    /api/customers/[id]
PATCH  /api/customers/[id]
DELETE /api/customers/[id]
```

**Suppliers (5):**
```
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/[id]
PATCH  /api/suppliers/[id]
DELETE /api/suppliers/[id]
```

**Articles (5):**
```
GET    /api/articles
POST   /api/articles
GET    /api/articles/[id]
PATCH  /api/articles/[id]
DELETE /api/articles/[id]
```

**Expenses (5):**
```
GET    /api/expenses
POST   /api/expenses
GET    /api/expenses/[id]
PATCH  /api/expenses/[id]
DELETE /api/expenses/[id]
```

**Invoices (4):**
```
GET    /api/invoices
POST   /api/invoices
GET    /api/invoices/[id]
PATCH  /api/invoices/[id]
DELETE /api/invoices/[id]
```

---

## 📦 Dependencias Utilizadas

- **Next.js 14.2.35** - Framework base
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Prisma ORM** - Database management
- **next-auth** - Authentication
- **Resend** - Email service

---

## 🚀 Próximos Pasos Recomendados

1. ✅ **Crear página principal de dashboard** - Completada
2. ✅ **Crear páginas de gestión de datos** - Completadas
3. ✅ **Crear página de facturas** - Completada
4. ✅ **Crear página de configuración** - Completada
5. ⏳ **Implementar generación de PDF de facturas**
6. ⏳ **Agregar reportes y analytics**
7. ⏳ **Implementar búsqueda avanzada**
8. ⏳ **Agregar exportación a Excel**
9. ⏳ **Implementar firma digital de facturas**
10. ⏳ **Integración con sistema fiscal (VeriFacTu oficial)**

---

## 📝 Notas de Desarrollo

- Todos los componentes utilizan `'use client'` para interactividad
- Los formularios utilizan validación controlada
- Las tablas soportan paginación automática
- Los estilos siguen la paleta de Tailwind existente
- Hay soporte para modo oscuro integrado

---

**Última actualización:** 14 de Enero, 2026
**Versión:** 1.0 Completa
