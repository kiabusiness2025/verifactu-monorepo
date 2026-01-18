# Sistema de Auto-Reparación con Isaak

Sistema automático de detección, análisis y corrección de errores en Verifactu.business.

## 🎯 Componentes del Sistema

### 1. **Detección de Errores (Cliente)**

**Archivo**: `apps/app/components/monitoring/ErrorMonitor.tsx`

Componente que se ejecuta en el navegador y detecta:
- ❌ Imágenes rotas (`<img>` sin cargar)
- 🔗 Enlaces rotos (al hacer click)
- 🔘 Botones vacíos (sin texto ni iconos)
- 🐌 Carga lenta (> 5 segundos)
- 🚨 Errores en consola

**Instalación**: Ya está incluido en `layout.tsx`

### 2. **Endpoint de Reportes**

**Archivo**: `apps/app/app/api/monitor/error/route.ts`

Recibe errores del cliente y:
1. Analiza severidad (crítico, alto, medio, bajo)
2. Determina si es auto-reparable
3. Trigger workflow de GitHub si es crítico
4. Devuelve análisis al cliente

**URL**: `POST /api/monitor/error`

**Payload**:
```json
{
  "errors": [
    {
      "type": "broken_image",
      "details": { "src": "/images/logo.png" },
      "url": "https://verifactu.business/dashboard",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "userAgent": "Mozilla/5.0...",
  "viewport": { "width": 1920, "height": 1080 },
  "performance": {...}
}
```

### 3. **Páginas de Error Personalizadas**

#### 404 - NO ENCONTRADO
**Archivo**: `apps/app/app/not-found.tsx`
- Reporta automáticamente a Isaak
- Muestra mensaje al usuario
- Botón para volver al inicio

#### 500 - ERROR RUNTIME
**Archivo**: `apps/app/app/error.tsx`
- Captura errores no manejados
- Reporta stack trace a Isaak
- Botón reset para reintentar

#### ⏳ LOADING
**Archivo**: `apps/app/app/loading.tsx`
- Spinner mientras carga
- Mejora UX durante transiciones

### 4. **Workflow de Auto-Fix**

**Archivo**: `.github/workflows/auto-fix-and-deploy.yml`

**Triggers**:
- Manual (workflow_dispatch) con contexto de error
- Push a main/develop
- Pull requests

**Proceso**:
1. ✅ Type check (TypeScript)
2. 🔍 Analiza errores con GitHub Copilot
3. 🛠️ Auto-fix de errores comunes
4. 📝 Commit automático con mensaje de Isaak
5. 🚀 Deploy a Vercel

**Inputs**:
- `error_context`: JSON con contexto del error
- `auto_fix`: Habilitar fixes automáticos (default: true)

## 🚀 Cómo Usar

### Trigger Manual desde API

```typescript
await fetch(
  'https://api.github.com/repos/OWNER/REPO/actions/workflows/auto-fix-and-deploy.yml/dispatches',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        error_context: JSON.stringify(errorData),
        auto_fix: 'true'
      }
    })
  }
);
```

### Variables de Entorno Requeridas

```bash
# En GitHub Secrets
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=xxx
VERCEL_PROJECT_ID=xxx
GITHUB_TOKEN=xxx  # Auto-generado por GitHub

# En .env.local (para testing local)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPOSITORY=owner/repo
```

## 📊 Tipos de Errores Detectados

| Tipo | Severidad | Auto-Fixable | Acción |
|------|-----------|--------------|--------|
| `broken_image` | Alto | ✅ Sí | Buscar imagen o crear placeholder |
| `empty_button` | Medio | ✅ Sí | Añadir texto o icono |
| `runtime_error` | Crítico | ⚠️ Depende | Análisis del stack trace |
| `not_found` | Medio | ⚠️ Depende | Revisar rutas |
| `slow_load` | Alto (>10s) | ✅ Sí | Optimizar recursos |
| `console_error` | Alto | ❌ No | Revisión manual |

## 🤖 Flujo Completo

```
Usuario experimenta error
         ↓
ErrorMonitor detecta (cliente)
         ↓
POST /api/monitor/error
         ↓
Análisis con Isaak
         ↓
¿Es crítico y auto-fixable?
    ↓ SÍ              ↓ NO
    ↓                 Guarda para revisión
Trigger GitHub Workflow
         ↓
Auto-fix + Commit
         ↓
Deploy a Vercel
         ↓
✅ Error resuelto
```

## 📝 Logs

### En Cliente (Browser Console)
```
[ErrorMonitor] Detected broken_image: /images/logo.png
[ErrorMonitor] Batch report sent: 3 errors
```

### En API (Server Logs)
```
[ERROR MONITOR] Received 3 error(s):
  1. broken_image at https://verifactu.business/dashboard
     Details: { src: '/images/logo.png' }
[ISAAK] 1 errores críticos detectados. Iniciando auto-fix...
```

### En GitHub Actions
```
🤖 Isaak Error Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{ errors: [...] }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Auto-fixes applied
🚀 Deploying to Vercel...
```

## 🔧 Configuración Adicional

### Ajustar Umbrales

En `ErrorMonitor.tsx`:
```typescript
const slowLoadThreshold = 5000; // Cambiar a 3000 para 3 segundos
```

En `route.ts`:
```typescript
severity: error.details.loadTime > 10000 ? 'high' : 'medium'
// Cambiar 10000 a otro valor
```

### Deshabilitar Auto-Fix

En workflow dispatch:
```typescript
inputs: {
  auto_fix: 'false'  // Solo analiza, no aplica fixes
}
```

## 🎯 Próximos Pasos

- [ ] Dashboard de errores en Admin Panel
- [ ] Análisis con IA (OpenAI/Claude) para fixes más inteligentes
- [ ] Notificaciones por email/Slack
- [ ] Métricas y estadísticas de errores
- [ ] A/B testing de fixes
- [ ] Rollback automático si el fix causa más errores

## 🆘 Troubleshooting

### Error: "GITHUB_TOKEN not configured"
```bash
# En GitHub Secrets, añade:
GITHUB_TOKEN = ghp_xxxxx
```

### Workflow no se dispara
```bash
# Verifica permisos en .github/workflows/auto-fix-and-deploy.yml:
permissions:
  contents: write
  pull-requests: write
```

### Errores no se reportan
```bash
# Verifica que ErrorMonitor esté en layout.tsx
import { ErrorMonitor } from '@/components/monitoring/ErrorMonitor';

// En body:
<ErrorMonitor />
```
