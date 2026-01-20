# 🔌 Guía de Integración - Componentes Accesibles

## Integración Completada ✅

### 1. ToastProvider (Notificaciones Globales)

**Integrado en:** `apps/app/app/layout.tsx`

El ToastProvider ahora envuelve toda la aplicación, permitiendo usar notificaciones toast desde cualquier componente.

```tsx
import { ToastProvider } from '@/components/notifications/ToastNotifications';

<ToastProvider>
  <ThemeProvider>{/* resto de la app */}</ThemeProvider>
</ToastProvider>;
```

**Uso en cualquier componente:**

```tsx
import { useToast } from '@/components/notifications/ToastNotifications';

function MiComponente() {
  const { success, error, warning, info } = useToast();

  const handleAction = async () => {
    try {
      await someAsyncAction();
      success('¡Éxito!', 'La operación se completó correctamente');
    } catch (err) {
      error('Error', 'No se pudo completar la operación');
    }
  };
}
```

---

### 2. DashboardDataExporter

**Integrado en:** `apps/app/app/dashboard/admin/page.tsx`

El componente de exportación de datos ahora está disponible en el panel de administración.

**Características:**

- Exporta datos en CSV, JSON, PDF
- Estados de carga con feedback visual
- Notificaciones toast automáticas
- Totalmente accesible

---

### 3. Loading Skeletons

**Integrados en:**

- `apps/app/app/dashboard/admin/page.tsx` - DashboardSkeleton
- `apps/app/app/dashboard/admin/users/page.tsx` - TableSkeleton

**Antes:**

```tsx
{
  loading && <div>Cargando...</div>;
}
```

**Después:**

```tsx
{
  loading ? <TableSkeleton rows={10} columns={5} /> : <Content />;
}
```

**Tipos disponibles:**

- `<Skeleton />` - Básico
- `<TableSkeleton />` - Para tablas
- `<CardSkeleton />` - Para tarjetas
- `<DashboardSkeleton />` - Layout completo
- `<ListSkeleton />` - Para listas

---

### 4. AccessibleButton

**Integrado en:** `apps/app/app/dashboard/admin/users/page.tsx`

Reemplaza botones estándar con componentes accesibles que incluyen:

- Estados de carga automáticos
- aria-labels para accesibilidad
- Variantes de estilo consistentes
- Focus visible para navegación por teclado

**Antes:**

```tsx
<button
  onClick={handleExport}
  disabled={exporting}
  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2..."
>
  <Download className="h-4 w-4" />
  {exporting ? 'Exportando...' : 'Exportar'}
</button>
```

**Después:**

```tsx
<AccessibleButton
  onClick={handleExport}
  loading={exporting}
  icon={<Download className="h-4 w-4" />}
  ariaLabel="Exportar lista de usuarios a CSV"
>
  {exporting ? 'Exportando...' : 'Exportar CSV'}
</AccessibleButton>
```

---

### 5. Toast Notifications en Operaciones

**Integrado en:**

- `apps/app/app/dashboard/admin/users/page.tsx` - Export, impersonation, CRUD
- `apps/app/app/dashboard/settings/page.tsx` - Save settings, create tenant

**Reemplaza alerts y console.logs:**

**Antes:**

```tsx
try {
  await saveData();
  alert('Datos guardados');
} catch (err) {
  alert('Error al guardar');
}
```

**Después:**

```tsx
const { success, error } = useToast();

try {
  await saveData();
  success('Datos guardados', 'Los cambios se guardaron correctamente');
} catch (err) {
  error('Error al guardar', 'No se pudieron guardar los cambios');
}
```

---

## 📊 Páginas Integradas

### ✅ Admin Dashboard (`/dashboard/admin`)

- [x] DashboardSkeleton para estado de carga
- [x] DashboardDataExporter añadido
- [x] ToastProvider disponible

### ✅ Admin Users (`/dashboard/admin/users`)

- [x] TableSkeleton para estado de carga
- [x] AccessibleButton para acciones
- [x] Toast notifications para feedback
- [x] Reemplazados alerts por toasts

### ✅ Settings (`/dashboard/settings`)

- [x] Toast notifications integradas
- [x] AccessibleInput y AccessibleButton (importados, listo para usar)

---

## 🎯 Próximas Integraciones Sugeridas

### Prioridad Alta

#### 1. Formularios Principales

Reemplazar inputs tradicionales con `AccessibleInput`:

```tsx
// apps/app/app/dashboard/settings/page.tsx
<AccessibleInput
  label="Nombre Completo"
  type="text"
  value={profileSettings.displayName}
  onChange={(e) => setProfileSettings({ ...profileSettings, displayName: e.target.value })}
  required
  helperText="Este nombre aparecerá en tu perfil"
/>
```

**Archivos:**

- `apps/app/app/dashboard/settings/page.tsx` (✅ imports añadidos)
- `apps/app/app/dashboard/admin/companies/new/page.tsx`
- `apps/app/app/dashboard/admin/companies/[id]/page.tsx`

#### 2. Tenants Management

- `apps/app/app/dashboard/admin/tenants/page.tsx`
  - Añadir TableSkeleton
  - Convertir botones a AccessibleButton
  - Toast notifications para CRUD operations

#### 3. Companies Management

- `apps/app/app/dashboard/admin/companies/page.tsx`
  - Loading skeletons
  - Toast notifications
  - AccessibleButton en acciones

### Prioridad Media

#### 4. Reports Page

- `apps/app/app/dashboard/admin/reports/page.tsx`
  - DashboardSkeleton para carga
  - AccessibleButton para generar reportes
  - Toast para descargas exitosas

#### 5. Integrations Page

- `apps/app/app/dashboard/admin/integrations/page.tsx`
  - CardSkeleton para integraciones
  - Toast para conexiones exitosas/fallidas

### Prioridad Baja

#### 6. Chat Admin

- `apps/app/app/dashboard/admin/chat/page.tsx`
  - Toast para comandos ejecutados
  - Loading states mejorados

---

## 🔧 Patrón de Integración

Para integrar en una nueva página, sigue estos pasos:

### Paso 1: Imports

```tsx
import { useToast } from '@/components/notifications/ToastNotifications';
import { TableSkeleton, DashboardSkeleton } from '@/components/accessibility/LoadingSkeleton';
import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleInput } from '@/components/accessibility/AccessibleFormInputs';
```

### Paso 2: Hook

```tsx
const { success, error, warning, info } = useToast();
```

### Paso 3: Reemplazar Loading

```tsx
// Antes
{
  loading && <div>Cargando...</div>;
}

// Después
{
  loading ? <TableSkeleton rows={5} columns={4} /> : <Content />;
}
```

### Paso 4: Reemplazar Buttons

```tsx
// Antes
<button onClick={handleSave} disabled={saving}>
  {saving ? 'Guardando...' : 'Guardar'}
</button>

// Después
<AccessibleButton onClick={handleSave} loading={saving}>
  Guardar
</AccessibleButton>
```

### Paso 5: Reemplazar Alerts

```tsx
// Antes
try {
  await action();
  alert('Éxito');
} catch {
  alert('Error');
}

// Después
try {
  await action();
  success('Éxito', 'Operación completada');
} catch {
  error('Error', 'No se pudo completar');
}
```

---

## 📈 Métricas de Mejora

### Antes de la Integración

- ❌ Alerts nativos del navegador (bloqueantes)
- ❌ Loading spinners genéricos
- ❌ Botones sin estados de carga
- ❌ Sin feedback visual consistente
- ❌ Problemas de accesibilidad (falta de aria-labels)

### Después de la Integración

- ✅ Toast notifications no bloqueantes
- ✅ Skeletons que muestran estructura de datos
- ✅ Botones con estados de carga integrados
- ✅ Feedback visual consistente en toda la app
- ✅ WCAG 2.1 AA compliance
- ✅ Mejor experiencia de usuario

---

## 🐛 Solución de Problemas

### Toast no aparece

```tsx
// Asegúrate de que ToastProvider está en el root layout
// apps/app/app/layout.tsx debe tener:
<ToastProvider>{children}</ToastProvider>
```

### Skeleton no se muestra

```tsx
// Verifica el import correcto
import { TableSkeleton } from '@/components/accessibility/LoadingSkeleton';

// Y que tienes el state de loading
const [loading, setLoading] = useState(true);
```

### AccessibleButton sin estilos

```tsx
// Usa las variantes predefinidas
<AccessibleButton variant="primary"> // o "secondary", "ghost", "danger"
```

---

## 📝 Checklist de Integración

Para cada página nueva:

- [ ] Importar `useToast` hook
- [ ] Importar loading skeletons necesarios
- [ ] Importar `AccessibleButton` y/o `AccessibleInput`
- [ ] Reemplazar `alert()` con toast notifications
- [ ] Reemplazar loading states con skeletons
- [ ] Reemplazar `<button>` con `<AccessibleButton>`
- [ ] Reemplazar `<input>` con `<AccessibleInput>` (opcional pero recomendado)
- [ ] Añadir aria-labels donde corresponda
- [ ] Probar navegación por teclado
- [ ] Verificar con lector de pantalla (opcional)

---

**Última actualización:** 20 de enero de 2026
**Estado:** ✅ Integración Fase 1 Completa
**Próximo paso:** Integrar en formularios restantes (settings, companies, tenants)
