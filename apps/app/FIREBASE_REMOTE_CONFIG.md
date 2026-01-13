# 🔧 Firebase Remote Config - Guía de Configuración

## ¿Qué es Remote Config?

Firebase Remote Config te permite cambiar el comportamiento y la apariencia de tu app **sin publicar una actualización**. Perfecto para:

✅ **Feature flags** - Activar/desactivar funcionalidades
✅ **A/B testing** - Probar diferentes versiones
✅ **Maintenance mode** - Mostrar mensajes de mantenimiento
✅ **Configuración dinámica** - Cambiar colores, límites, endpoints
✅ **Rollout gradual** - Liberar features por porcentaje de usuarios

## Archivos Creados

### 1. `lib/remoteConfig.ts` - Core SDK
Inicializa Firebase Remote Config y expone funciones para obtener valores:
- `initRemoteConfig()` - Fetch y activate
- `getFeatureFlag(key)` - Booleanos
- `getRemoteString(key)` - Strings
- `getRemoteNumber(key)` - Números
- `getRemoteJSON(key)` - Objetos JSON

### 2. `hooks/useRemoteConfig.ts` - React Hooks
Hooks para usar en componentes:
- `useRemoteConfig()` - Hook principal
- `useFeatureFlag(name)` - Para feature flags
- `useMaintenanceMode()` - Modo mantenimiento

### 3. `components/RemoteConfigDemo.tsx` - Ejemplo
Componente demo que muestra cómo usar Remote Config.

## Configuración en Firebase Console

### Paso 1: Habilitar Remote Config

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `verifactu-business`
3. En el menú lateral: **Engage → Remote Config**
4. Click **"Get started"**

### Paso 2: Crear Parámetros

Crea los siguientes parámetros con sus valores por defecto:

#### Feature Flags (Boolean)

| Key | Default Value | Description |
|-----|---------------|-------------|
| `feature_isaak_chat` | `true` | Activar chat de Isaak |
| `feature_isaak_proactive` | `true` | Notificaciones proactivas |
| `feature_isaak_deadlines` | `true` | Recordatorios de deadlines |
| `feature_new_dashboard` | `false` | Nuevo diseño de dashboard |

#### UI Configuration (String/Number)

| Key | Default Value | Description |
|-----|---------------|-------------|
| `ui_theme_primary_color` | `"#0060F0"` | Color primario del tema |
| `ui_show_onboarding` | `true` | Mostrar onboarding |
| `ui_max_companies` | `3` | Máximo de empresas |

#### Business Logic (Number)

| Key | Default Value | Description |
|-----|---------------|-------------|
| `pricing_free_invoices_limit` | `10` | Facturas gratis en plan free |
| `pricing_trial_days` | `14` | Días de trial |

#### Maintenance (Boolean/String)

| Key | Default Value | Description |
|-----|---------------|-------------|
| `maintenance_mode` | `false` | Activar modo mantenimiento |
| `maintenance_message` | `"Estamos realizando mantenimiento..."` | Mensaje a mostrar |

#### API Configuration (String/Number)

| Key | Default Value | Description |
|-----|---------------|-------------|
| `api_verifactu_endpoint` | `"https://api.verifactu.business"` | Endpoint de API |
| `api_timeout_ms` | `30000` | Timeout en milisegundos |

### Paso 3: Publicar Configuración

1. Click **"Publish changes"** en la esquina superior derecha
2. Agrega un mensaje de commit (ej: "Configuración inicial")
3. Click **"Publish"**

## Uso en Componentes

### Feature Flag Simple

```tsx
"use client";

import { useFeatureFlag } from "@/hooks/useRemoteConfig";

export function NewFeature() {
  const enabled = useFeatureFlag("feature_new_dashboard");

  if (!enabled) {
    return null; // No mostrar si está desactivado
  }

  return <div>Nueva funcionalidad 🎉</div>;
}
```

### Configuración Dinámica

```tsx
"use client";

import { useRemoteConfig } from "@/hooks/useRemoteConfig";

export function DynamicUI() {
  const { getString, getNumber } = useRemoteConfig();
  
  const primaryColor = getString("ui_theme_primary_color");
  const maxCompanies = getNumber("ui_max_companies");

  return (
    <div style={{ backgroundColor: primaryColor }}>
      <p>Puedes tener hasta {maxCompanies} empresas</p>
    </div>
  );
}
```

### Maintenance Mode

```tsx
"use client";

import { useMaintenanceMode } from "@/hooks/useRemoteConfig";

export function MaintenanceBanner() {
  const maintenance = useMaintenanceMode();

  if (!maintenance.enabled) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
      <p>⚠️ {maintenance.message}</p>
    </div>
  );
}
```

### JSON Configuration

```tsx
"use client";

import { useRemoteConfig } from "@/hooks/useRemoteConfig";

interface PricingTiers {
  starter: { price: number; features: string[] };
  pro: { price: number; features: string[] };
}

export function PricingTable() {
  const { getJSON } = useRemoteConfig();
  
  const pricing = getJSON<PricingTiers>("pricing_tiers");

  if (!pricing) {
    return <div>Cargando precios...</div>;
  }

  return (
    <div>
      <h3>Starter: €{pricing.starter.price}/mes</h3>
      <h3>Pro: €{pricing.pro.price}/mes</h3>
    </div>
  );
}
```

## Testing

### Ver el Demo

1. Agregar el componente al dashboard:

```tsx
// apps/app/app/dashboard/page.tsx
import { RemoteConfigDemo } from "@/components/RemoteConfigDemo";

export default function DashboardPage() {
  return (
    <div>
      {/* ...resto del dashboard */}
      <RemoteConfigDemo />
    </div>
  );
}
```

2. Iniciar el servidor:

```bash
cd apps/app
pnpm dev
```

3. Visitar: http://localhost:3000/dashboard

### Probar Cambios en Tiempo Real

1. En Firebase Console, cambia un valor (ej: `feature_new_dashboard` a `true`)
2. Click **"Publish changes"**
3. En tu app, click el botón **"🔄 Actualizar"**
4. Los cambios deberían reflejarse inmediatamente

## Condiciones y Targeting

Firebase Remote Config permite segmentar usuarios:

### Por Porcentaje (Rollout Gradual)

1. En Firebase Console, click un parámetro
2. Click **"Add value for condition"**
3. Crear condición:
   - **Name**: "Beta users"
   - **Condition**: "User in percentage" → 10%
   - **Value**: `true`
4. El 10% de usuarios verá el feature activado

### Por Plataforma

- **iOS**: `app.platform == 'ios'`
- **Android**: `app.platform == 'android'`
- **Web**: `app.platform == 'web'`

### Por Región

- **España**: `device.country in ['ES']`
- **LATAM**: `device.country in ['MX', 'AR', 'CL', 'CO']`

### Por Versión

- **Versión específica**: `app.version == '2.0.0'`
- **Versión mínima**: `app.version >= '1.5.0'`

### Por Custom User Properties

Primero, setea propiedades en el código:

```typescript
import { getRemoteConfig, setUserProperties } from "firebase/remote-config";

const config = getRemoteConfig();
setUserProperties(config, {
  subscription_plan: "pro",
  company_size: "medium",
});
```

Luego en Firebase Console:
- **Condition**: `user.subscription_plan == 'pro'`

## Variables de Entorno

Remote Config usa las mismas variables de Firebase que ya tienes configuradas:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Configuración Avanzada

### Cambiar Intervalo de Fetch

Por defecto, Remote Config hace fetch cada 1 hora. Para cambiar:

```typescript
// lib/remoteConfig.ts
remoteConfig.settings = {
  minimumFetchIntervalMillis: 600000, // 10 minutos
  fetchTimeoutMillis: 60000, // 60 segundos
};
```

### Modo Desarrollo (Sin Cache)

```typescript
remoteConfig.settings = {
  minimumFetchIntervalMillis: 0, // Fetch siempre
};
```

## Mejores Prácticas

✅ **Usa valores por defecto** - Define fallbacks en `defaultConfig`
✅ **Nombra claro** - `feature_*`, `ui_*`, `pricing_*`, etc.
✅ **Documenta** - Agrega descripciones en Firebase Console
✅ **Versiona** - Usa historial de Remote Config para rollback
✅ **Testing** - Prueba con condiciones antes de publicar al 100%
✅ **Monitoreo** - Revisa Analytics para ver impacto de cambios

❌ **No uses para datos sensibles** - API keys, secrets, etc.
❌ **No abuses** - Demasiados parámetros ralentizan la app
❌ **No confíes 100%** - Siempre ten defaults locales

## Troubleshooting

### "Remote Config not initialized"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de que el código se ejecute en el cliente (`"use client"`)

### Los cambios no se reflejan
- Verifica que publicaste los cambios en Firebase Console
- Espera el `minimumFetchIntervalMillis` configurado
- Usa el botón "Actualizar" en el demo
- Verifica la consola del navegador para errores

### Error: "Fetch failed"
- Verifica tu conexión a internet
- Revisa que Firebase esté correctamente configurado
- Verifica los permisos en Firebase Console

## Recursos

- [Firebase Remote Config Docs](https://firebase.google.com/docs/remote-config)
- [Best Practices](https://firebase.google.com/docs/remote-config/best-practices)
- [Use Cases](https://firebase.google.com/docs/remote-config/use-cases)
- [Firebase Console](https://console.firebase.google.com/)

---

**Configurado por**: GitHub Copilot  
**Fecha**: Enero 2026  
**Proyecto**: Verifactu Business
