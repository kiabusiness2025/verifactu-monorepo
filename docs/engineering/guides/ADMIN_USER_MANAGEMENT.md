# Admin: Gestión de Usuarios

Sistema completo de gestión de usuarios desde el panel de administración.

---

## 🎯 Funcionalidades Implementadas

### 1. Ver Lista de Usuarios

**Ubicación:** `/dashboard/admin/users`

**Características:**

- Listado completo de todos los usuarios registrados
- Búsqueda por email o nombre
- Contador de total de usuarios
- **Exportar a Excel:** Botón verde en la esquina superior derecha
- **Acciones por usuario:**
  - **Ver:** Abrir ficha completa del usuario
  - **Entrar:** Login como usuario (impersonation) para soporte

**Columnas mostradas:**

- Email
- Nombre
- Número de empresas
- Rol principal

---

### 2. Ver Ficha Completa de Usuario

**Ubicación:** `/dashboard/admin/users/[id]`

**Secciones:**

#### Información Principal

- Nombre y email
- ID del usuario
- Fecha de registro
- Estado (activo/inactivo)
- Onboarding completado (badge)
- **Métricas:**
  - Número de empresas
  - Conversaciones con Isaak
  - Tono configurado para Isaak
  - Actividad reciente

#### Empresas (Memberships)

- Lista de todas las empresas asociadas
- Nombre legal y NIF
- Rol en cada empresa (propietario/miembro)
- Fecha de incorporación
- Badge "DEMO" si es empresa demo

#### Suscripciones

- Lista de todas las suscripciones activas
- Plan contratado (nombre y código)
- Precio mensual
- Estado (active/trial/cancelled)
- Fechas de trial y próxima renovación

#### Actividad Reciente

- Últimas 10 facturas creadas por el usuario
- Número de factura
- Cliente
- Importe
- Fecha
- Empresa asociada

**Acciones disponibles:**

- **Editar:** Modificar nombre y email (próximamente)
- **Entrar como usuario:** Acceder al dashboard del usuario

---

### 3. Entrar como Usuario (Impersonation)

**API:** `POST /api/admin/users/[id]/impersonate`

**Funcionamiento:**

1. Admin hace clic en "Entrar como usuario"
2. Confirmación de seguridad
3. Sistema crea sesión con credenciales del usuario objetivo
4. Redirección automática a `/dashboard`
5. Admin ve y gestiona el dashboard como si fuera el usuario

**Seguridad:**

- Solo usuarios en `ADMIN_EMAILS` pueden usar esta función
- Campo `impersonatedBy` en sesión para auditoría
- Sesión limitada a 8 horas
- Registro de todas las impersonaciones

**Para salir:**

- Cerrar sesión normalmente
- Limpiar cookies del navegador

---

### 4. Exportar a Excel

**API:** `GET /api/admin/users/export`

**Formato:**

- CSV compatible con Excel
- Codificación UTF-8 con BOM (detectado automáticamente por Excel)
- Nombre de archivo: `usuarios-YYYY-MM-DD.csv`

**Columnas exportadas:**

- ID del usuario
- Email
- Nombre
- Fecha de Registro
- Número de Empresas
- Nombres de Empresas (separadas por `;`)
- Roles (separados por `;`)
- Tono de Isaak configurado
- Onboarding Completado (Sí/No)

**Uso:**

1. Hacer clic en botón "Exportar a Excel" (verde, esquina superior derecha)
2. Archivo se descarga automáticamente
3. Abrir con Excel/Google Sheets/LibreOffice

---

## 🔧 Sincronización Firebase-PostgreSQL

### Problema

Cuando se eliminan usuarios en Firebase Authentication, esos usuarios permanecen en PostgreSQL, causando desincronización.

### Solución: Script de Sincronización

**Script:** `scripts/sync-users-with-firebase.js`

#### Ver qué usuarios huérfanos existen (sin eliminar)

```bash
node scripts/sync-users-with-firebase.js --dry-run
```

#### Eliminar usuarios huérfanos de PostgreSQL

```bash
node scripts/sync-users-with-firebase.js --delete
```

**Qué hace:**

1. Obtiene lista de usuarios de Firebase Auth
2. Obtiene lista de usuarios de PostgreSQL
3. Compara ambas listas
4. Identifica usuarios en PG que NO existen en Firebase
5. Si `--dry-run`: solo muestra la lista
6. Si `--delete`: elimina esos usuarios de PostgreSQL (cascade)

**Recomendación:**

- Ejecutar `--dry-run` primero para verificar
- Ejecutar `--delete` solo si estás seguro
- Considerar automatizar con cron job semanal

---

## 🔒 Seguridad

### Verificación de Admin

Todos los endpoints requieren:

1. Sesión válida (token JWT)
2. Email en lista `ADMIN_EMAILS` (variable de entorno)

**Ejemplo de `ADMIN_EMAILS`:**

```
ADMIN_EMAILS=kiabusiness2025@gmail.com,admin@verifactu.business
```

### Auditoría

- Campo `impersonatedBy` en sesiones de impersonation
- Logs de todas las acciones de admin
- Timestamps de creación y modificación

---

## 📊 APIs Disponibles

### GET `/api/admin/users`

Listado completo de usuarios con información básica.

### GET `/api/admin/users/[id]`

Detalle completo de un usuario específico.

**Response:**

```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "Usuario Ejemplo",
    "created_at": "2024-01-01T00:00:00Z",
    "isaak_tone": "friendly",
    "has_completed_onboarding": true
  },
  "memberships": [...],
  "subscriptions": [...],
  "recentActivity": [...],
  "conversationsCount": 5
}
```

### PATCH `/api/admin/users/[id]`

Actualizar nombre o email de usuario.

**Body:**

```json
{
  "name": "Nuevo Nombre",
  "email": "nuevo@email.com"
}
```

### DELETE `/api/admin/users/[id]`

Eliminar usuario (próximamente).

### POST `/api/admin/users/[id]/impersonate`

Login como usuario para soporte.

**Response:**

```json
{
  "success": true,
  "message": "Sesión creada como user@example.com",
  "redirectTo": "/dashboard"
}
```

### GET `/api/admin/users/export`

Exportar todos los usuarios a CSV.

**Headers:**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="usuarios-2024-01-01.csv"`

---

## 🚀 Próximas Mejoras

### Crear Usuario desde Admin Panel

- Formulario completo (no solo email/password de Firebase)
- Asignación de empresas inicial
- Configuración de rol y permisos
- Envío de email de bienvenida

### Edición Completa

- Modal de edición inline en lista de usuarios
- Edición de preferencias (tono Isaak, etc.)
- Cambio de contraseña desde admin

### Gestión de Suscripciones

- Cancelar suscripción
- Cambiar plan
- Extender trial
- Aplicar descuentos/cupones

### Webhooks de Sincronización

- Webhook de Firebase cuando usuario se elimina
- Actualización automática en PostgreSQL
- Sin necesidad de ejecutar script manual

---

## 🆘 Solución de Problemas

### "Error: No admin access"

**Causa:** Tu email no está en `ADMIN_EMAILS`.
**Solución:** Añadir tu email a la variable de entorno en Vercel.

### "Usuario no encontrado" al impersonar

**Causa:** Usuario eliminado de Firebase pero aún en PostgreSQL.
**Solución:** Ejecutar `scripts/sync-users-with-firebase.js --delete`

### Excel no muestra bien los caracteres especiales

**Causa:** Excel no detectó UTF-8.
**Solución:** El CSV ya incluye BOM. Si persiste, abrir con Google Sheets o LibreOffice.

### No puedo salir de impersonation

**Solución:**

1. Cerrar sesión normalmente
2. O ir a `/api/auth/logout`
3. O limpiar cookies del navegador

---

## 📝 Notas

- **Cascade deletes:** Al eliminar un usuario, se eliminan automáticamente sus memberships, preferencias y conversaciones
- **Soft delete:** No implementado aún. Todos los deletes son hard deletes
- **Backup:** Exportar usuarios regularmente antes de hacer deletes masivos
- **Logs:** Revisar logs de Vercel para auditar acciones de admin

---

**Documentación actualizada:** 2024-01-16
**Versión:** 1.0
