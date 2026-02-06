# ISAAK: Integración con Vercel y Detección de Errores

## Resumen Ejecutivo

ISAAK (Intelligent System for Automatic Analysis and Key-fixing) ahora incluye integración completa con Vercel para detectar y registrar errores de compilación automáticamente. Los cambios implementados mejoran significativamente la visibilidad de los problemas de build.

---

## Cambios Implementados

### 1. **Configuraciones de Vercel Mejoradas** ✅

#### Root `vercel.json` (Monorepo)

```json
{
  "installCommand": "echo '📋 ISAAK: Starting dependency check' && ...",
  "buildCommand": "echo '🧠 ISAAK: Starting app build' && ...",
  "outputDirectory": "apps/app/.next",
  "framework": "nextjs"
}
```

**Mejoras:**

- Logs informativos con emoji de ISAAK al inicio del build
- Mensaje de confirmación al completar instalación y build
- Facilita seguimiento en Vercel Dashboard

#### App `vercel.json` (apps/landing)

```json
{
  "installCommand": "echo '📋 ISAAK: Starting dependency check' && npm install --legacy-peer-deps && echo '✓ Dependencies installed'",
  "buildCommand": "echo '🧠 ISAAK: Starting landing build' && npm run build && echo '✓ Build completed successfully'"
}
```

**Mejoras:**

- Identidad clara en los logs de Vercel
- Separación visual entre fases de build

---

### 2. **Corrección de `ai-gateway.ts`** ✅

#### Problema Original

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';  // ❌ Paquete no instalado
export const createAIGatewayClient = (apiKey: string) => {
  return {
    openai: createOpenAI({
      apiKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
      defaultQuery: {},  // ❌ Parámetro inválido para OpenAI
      defaultHeaders: {},
    }),
    anthropic: createAnthropic({...}),  // ❌ No disponible
  };
};
```

#### Solución Implementada

```typescript
import { createOpenAI } from '@ai-sdk/openai'; // ✅ Solo OpenAI

export const createAIGatewayClient = (apiKey: string) => {
  return {
    openai: createOpenAI({
      apiKey,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
      // ✅ Removidos parámetros inválidos
    }),
  };
};

export const getRecommendedModel = (context: 'dashboard' | 'landing' | 'admin') => {
  switch (context) {
    case 'dashboard':
      return 'openai/gpt-4-turbo';
    case 'admin':
      return 'openai/gpt-4-turbo'; // ✅ Cambiar de 'anthropic/claude-3-opus'
    case 'landing':
      return 'openai/gpt-3.5-turbo';
    default:
      return 'openai/gpt-4-turbo';
  }
};
```

**Errores Corregidos:**

- ❌ Cannot find module '@ai-sdk/anthropic' → ✅ Removido
- ❌ 'defaultQuery' does not exist in type 'OpenAIProviderSettings' → ✅ Removido
- ❌ Referencias a claude-3-\* → ✅ Reemplazadas con gpt-4-turbo

---

## Scripts de Diagnóstico ISAAK

### `scripts/isaak.sh`

**Función:** Orquestador principal de análisis y auto-fijación

```bash
./scripts/isaak.sh
```

**Detecta:**

- Estado del entorno (Node, pnpm, Git)
- Dependencias faltantes
- Configuración de Prisma y Firebase
- Errores de variables de entorno

---

### `scripts/isaak-diagnostics.sh`

**Función:** Análisis profundo antes de desplegar

```bash
./scripts/isaak-diagnostics.sh
```

**Ejecuta 4 fases:**

1. **Static Code Analysis** - Importaciones rotas, @ts-nocheck, Prisma setup
2. **Local Build Test** - Compilación real de app y landing
3. **Git & Deployment Readiness** - Estado de repositorio
4. **Final Report** - Resumen de errores y readiness

---

### `scripts/isaak-auto-fixer.sh`

**Función:** Auto-corrección de errores comunes

```bash
./scripts/isaak-auto-fixer.sh
```

**Corrige automáticamente:**

- Imports faltantes
- Paths de importación incorrectos
- Dependencias en lugar incorrecto
- Configuración de build

---

## Flujo de Detección de Errores

```
┌─────────────────────────────────────────────┐
│ Desarrollador: git push origin main         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ Vercel Hook Triggered                       │
│ ├─ echo "📋 ISAAK: Starting..."             │
│ └─ npm/pnpm install                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ ISAAK Build Phase                           │
│ ├─ echo "🧠 ISAAK: Starting build"          │
│ ├─ Compilación Next.js                      │
│ └─ echo "✓ Build completed"                 │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
     ✅ SUCCESS   ❌ FAILURE
        │             │
        │             ▼
        │    Vercel Deployment Failed
        │    └─ Logs visibles en:
        │       https://vercel.com/dashboard
        │
        └─────► Ver logs con "ISAAK:"
```

---

## Cómo Leer Logs de Vercel

### 1. Acceder a Vercel Dashboard

```
https://vercel.com/dashboard
```

### 2. Seleccionar Proyecto

- **verifactu-app** (main app)
- **verifactu-landing** (landing page)

### 3. Buscar "ISAAK" en los logs

Los logs ahora incluyen:

```
📋 ISAAK: Starting dependency check
...
🧠 ISAAK: Starting app build
...
✓ Build completed successfully
```

### 4. Identificar Errores

```
error: Cannot find module '@ai-sdk/anthropic'
       ↑ ANTES de este cambio ❌

error: Object literal may only specify known properties
       ↑ Parámetro 'defaultQuery' inválido ❌
```

---

## Configuración Recomendada para CI/CD

### Pre-deployment Checklist

```bash
#!/bin/bash
# Ejecutar localmente antes de push

# 1. Diagnóstico completo
./scripts/isaak-diagnostics.sh

# 2. Auto-fix si es necesario
./scripts/isaak-auto-fixer.sh

# 3. Build local
pnpm build

# 4. Si todo está OK
git push origin main
```

---

## Próximos Pasos (Roadmap)

### ✅ Completado

- [x] Integración de logs ISAAK en vercel.json
- [x] Corrección de ai-gateway.ts
- [x] Scripts de diagnóstico funcionales

### 📋 En Progreso

- [ ] Dashboard de monitoreo en tiempo real
- [ ] Notificaciones automáticas en Discord/Slack
- [ ] Auto-fijación automática en CI/CD

### 🔮 Futuro

- [ ] Análisis predictivo de errores
- [ ] Sugerencias de optimización
- [ ] Integración con GitHub Actions

---

## Problemas Conocidos Resueltos

| Problema                      | Síntoma                  | Solución                   |
| ----------------------------- | ------------------------ | -------------------------- |
| `@ai-sdk/anthropic` no existe | "Cannot find module"     | Removido, usar solo OpenAI |
| `defaultQuery` inválido       | "does not exist in type" | Removido del config        |
| Logs invisibles en Vercel     | No hay visibilidad       | Agregado "echo 🧠 ISAAK"   |

---

## Contacto & Soporte

Para problemas con ISAAK:

1. Revisar logs en Vercel Dashboard (buscar "ISAAK:")
2. Ejecutar localmente: `./scripts/isaak-diagnostics.sh`
3. Revisar documentación de troubleshooting en `/docs`

---

**Última actualización:** Enero 13, 2026
**Estado:** Production Ready ✅
