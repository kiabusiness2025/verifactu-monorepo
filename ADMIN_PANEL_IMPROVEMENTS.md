# Panel de Administración - Mejoras Implementadas

## Resumen

Se ha completado el panel de administración con operaciones CRUD completas para la gestión de empresas, protección de seguridad con `ADMIN_EMAILS`, y una interfaz de usuario moderna.

---

## ✅ Implementado

### 1. **Seguridad - Sistema de Autenticación Admin**

**Archivo**: `apps/app/lib/adminAuth.ts`

- ✅ Función `requireAdmin(req)` que valida si el usuario está en la lista de admins
- ✅ Integración con el sistema de sesiones existente (`getSessionPayload`)
- ✅ Variable de entorno `ADMIN_EMAILS` como allowlist (separada por comas)
- ✅ Retorna `{ email, userId }` del admin autenticado
- ✅ Lanza error `FORBIDDEN` si el usuario no es admin

**Ejemplo de uso**:
```typescript
await requireAdmin(req); // Lanza error si no es admin
```

**Configuración**:
```env
ADMIN_EMAILS=kiabusiness2025@gmail.com,otro@example.com
```

---

### 2. **Cliente API Admin - Funciones Type-Safe**

**Archivo**: `apps/app/lib/adminApi.ts`

- ✅ `adminGet<T>(path)` - Peticiones GET
- ✅ `adminPost<T>(path, body)` - Peticiones POST
- ✅ `adminPatch<T>(path, body)` - Peticiones PATCH
- ✅ `adminDelete<T>(path)` - Peticiones DELETE
- ✅ Manejo automático de errores HTTP
- ✅ Type definitions para `TenantRow`, `UserRow`, `AccountingData`

**Ejemplo de uso**:
```typescript
const data = await adminPost<{ ok: boolean; tenant: Tenant }>(
  "/api/admin/tenants",
  { legalName, taxId, address, cnae }
);
```

---

### 3. **Endpoints API - CRUD Completo para Tenants**

#### **GET /api/admin/tenants**
- ✅ Lista todos los tenants con estadísticas (miembros, facturas, ingresos)
- ✅ Protegido con `requireAdmin()`
- ✅ Respuesta en formato camelCase

#### **POST /api/admin/tenants**
- ✅ Crear nueva empresa
- ✅ Campos obligatorios: `legalName`, `taxId`
- ✅ Campos opcionales: `address`, `cnae`
- ✅ Valida que no exista duplicado de `taxId`
- ✅ Retorna empresa creada con estadísticas iniciales

**Cuerpo de ejemplo**:
```json
{
  "legalName": "Mi Empresa SL",
  "taxId": "B12345678",
  "address": "Calle Principal 123",
  "cnae": "6201"
}
```

#### **GET /api/admin/tenants/:id**
- ✅ Obtener detalles de una empresa específica
- ✅ Incluye estadísticas completas
- ✅ Retorna 404 si no existe

#### **PATCH /api/admin/tenants/:id**
- ✅ Editar empresa existente
- ✅ UPDATE dinámico (solo actualiza campos enviados)
- ✅ Valida duplicados de `taxId` al cambiar
- ✅ Retorna empresa actualizada con estadísticas

**Cuerpo de ejemplo**:
```json
{
  "legalName": "Nuevo Nombre SL",
  "address": "Nueva Dirección 456"
}
```

#### **DELETE /api/admin/tenants/:id**
- ✅ Eliminar empresa
- ✅ Verifica que no tenga facturas asociadas (prevención)
- ✅ Elimina membresías automáticamente (FK constraint)
- ✅ Retorna error 409 si tiene facturas

---

### 4. **UI - Página de Gestión de Empresas**

**Archivo**: `apps/app/app/dashboard/admin/empresas/page.tsx`

#### **Funcionalidades Implementadas**:

**Dashboard de empresas**:
- ✅ KPIs globales (total empresas, total usuarios, ingresos totales)
- ✅ Lista de empresas con estadísticas inline
- ✅ Estado de carga (`loading`)
- ✅ Estado vacío con CTA ("Crear la primera")

**Modal Crear/Editar Empresa**:
- ✅ Modal reutilizable para crear y editar
- ✅ Formulario validado (campos obligatorios marcados con *)
- ✅ Campos: Legal Name, CIF/NIF, Dirección, CNAE
- ✅ Manejo de errores inline
- ✅ Estados de guardado (`saving`)
- ✅ Botón Cancelar y botón Guardar/Crear

**Acciones por empresa**:
- ✅ Botón Editar (abre modal con datos precargados)
- ✅ Botón Eliminar (con confirmación y warning de facturas)
- ✅ Feedback visual en hover

**Manejo de errores**:
- ✅ Errores de creación mostrados en el modal
- ✅ Errores de eliminación mostrados con `alert()`
- ✅ Mensajes en español

---

### 5. **Protección de Endpoints Existentes**

Todos los endpoints admin ahora están protegidos con `requireAdmin()`:

- ✅ `GET /api/admin/users` - Lista de usuarios
- ✅ `GET /api/admin/tenants` - Lista de empresas
- ✅ `GET /api/admin/accounting` - Contabilidad global

**Respuesta de error** (401):
```json
{
  "ok": false,
  "error": "No autorizado"
}
```

---

## 📐 Arquitectura

### **Flujo de Autenticación**

```
Usuario → Firebase Session Cookie → getSessionPayload() → requireAdmin()
                                                              ↓
                                                    Verifica ADMIN_EMAILS
                                                              ↓
                                                    Permite acceso o 403
```

### **Flujo de Creación de Empresa**

```
UI → openCreateModal() → handleSubmit()
                               ↓
                          adminPost("/api/admin/tenants", data)
                               ↓
                          requireAdmin(req)
                               ↓
                          Validar taxId único
                               ↓
                          INSERT INTO tenants
                               ↓
                          Retorna tenant con stats
                               ↓
                          UI actualiza estado
```

---

## 🔒 Seguridad

1. **Allowlist de Admins**: Solo emails en `ADMIN_EMAILS` pueden acceder
2. **Verificación en cada endpoint**: Todos los endpoints admin llaman `requireAdmin()`
3. **Sesiones Firebase**: Integración con sistema de auth existente
4. **Validación de duplicados**: No permite crear empresas con CIF/NIF duplicado
5. **Prevención de eliminación**: No permite eliminar empresas con facturas asociadas

---

## 🎨 UI/UX

- **Diseño consistente**: Sigue el sistema de diseño existente (Tailwind)
- **Feedback visual**: Estados de loading, hover, disabled
- **Mensajes claros**: Errores y confirmaciones en español, sin jerga técnica
- **Responsive**: Funciona en móvil y desktop
- **Accesibilidad**: Campos requeridos marcados, labels descriptivos

---

## 🚀 Próximos Pasos Opcionales

### **Funcionalidades Adicionales** (no implementadas):

1. **Gestión de Miembros**:
   - `POST /api/admin/tenants/:id/members` - Añadir/quitar usuarios a empresa
   - Modal para gestionar membresías desde el admin

2. **Impersonación**:
   - `POST /api/admin/tenants/:id/impersonate` - Entrar como usuario de una empresa
   - Útil para debugging y soporte

3. **Filtros y Búsqueda**:
   - Filtrar empresas por CIF/NIF, nombre, CNAE
   - Ordenar por facturación, fecha de creación, etc.

4. **Paginación**:
   - Implementar paginación para listas grandes de empresas

5. **Exportación**:
   - Exportar lista de empresas a CSV/Excel

6. **Auditoría**:
   - Log de acciones admin (quién creó/editó/eliminó qué)

---

## 📝 Notas de Implementación

### **Cambios de Formato**:
- La API devuelve datos en **camelCase** para consistencia con el frontend
- Los nombres de campos de base de datos siguen siendo **snake_case**
- La transformación se hace en los endpoints API

### **Decisiones de Diseño**:
1. **UUID nativo**: Usar `crypto.randomUUID()` en lugar de `nanoid`
2. **Modals sobre páginas**: Modal para crear/editar en lugar de páginas separadas
3. **Confirmación nativa**: `confirm()` nativo en lugar de modal custom
4. **Inline stats**: Estadísticas mostradas directamente en la lista

### **Compatibilidad**:
- ✅ Next.js 14 App Router
- ✅ React Server Components
- ✅ PostgreSQL database
- ✅ Sistema de auth Firebase existente
- ✅ Sin dependencias adicionales

---

## 🔧 Testing

### **Para probar localmente**:

1. **Configurar ADMIN_EMAILS**:
```bash
# apps/app/.env.local
ADMIN_EMAILS=tu-email@example.com
```

2. **Iniciar servidor**:
```bash
npm run dev
```

3. **Acceder al admin**:
```
http://localhost:3000/dashboard/admin/empresas
```

4. **Verificar seguridad**:
   - Intentar acceder sin estar autenticado → Debe redirigir o mostrar error
   - Intentar acceder con un email NO admin → Debe mostrar 403

### **Casos de prueba**:

- ✅ Crear empresa con todos los campos
- ✅ Crear empresa solo con campos obligatorios (legalName + taxId)
- ✅ Intentar crear empresa con taxId duplicado → Error 409
- ✅ Editar nombre de empresa
- ✅ Editar CIF de empresa a uno existente → Error 409
- ✅ Eliminar empresa sin facturas → Éxito
- ✅ Intentar eliminar empresa con facturas → Error 409
- ✅ Acceder sin email admin → Error 403

---

## 📚 Archivos Modificados/Creados

### **Nuevos**:
- `apps/app/lib/adminAuth.ts` - Sistema de autenticación admin
- `apps/app/lib/adminApi.ts` - Cliente API type-safe
- `apps/app/app/api/admin/tenants/[id]/route.ts` - CRUD individual de tenants

### **Modificados**:
- `apps/app/app/api/admin/tenants/route.ts` - Agregado POST y protección
- `apps/app/app/api/admin/users/route.ts` - Agregada protección
- `apps/app/app/api/admin/accounting/route.ts` - Agregada protección
- `apps/app/app/dashboard/admin/empresas/page.tsx` - UI completa CRUD

---

## ✅ Checklist Final

- ✅ Seguridad implementada con `requireAdmin()`
- ✅ CRUD completo para tenants (GET, POST, PATCH, DELETE)
- ✅ UI funcional con modal crear/editar
- ✅ Validaciones (duplicados, campos requeridos)
- ✅ Prevención de eliminación con facturas
- ✅ Transformación snake_case → camelCase
- ✅ Manejo de errores completo
- ✅ Estados de loading y feedback visual
- ✅ 0 errores de TypeScript
- ✅ Compatible con sistema de auth existente

---

## 🎯 Resultado Final

El panel de administración es ahora **100% operativo** para gestionar empresas. Un administrador puede:

1. Ver lista completa de empresas con estadísticas
2. Crear nuevas empresas desde la interfaz
3. Editar información de empresas existentes
4. Eliminar empresas (si no tienen facturas)
5. Todo protegido por la allowlist `ADMIN_EMAILS`

**Sin necesidad de acceso directo a la base de datos** ✅
