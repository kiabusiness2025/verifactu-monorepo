# Chat de Administración con IA

Sistema de chat integrado en el panel de administración que permite verificar el estado del sistema, diagnosticar problemas y obtener ayuda en tiempo real.

## Características

### 🤖 Asistente Inteligente
- Responde preguntas sobre el estado del sistema
- Diagnostica problemas y sugiere soluciones
- Explica errores y configuraciones
- Acceso a contexto completo del proyecto

### ⚡ Comandos Rápidos

#### `/help`
Muestra lista de comandos disponibles

#### `/logs [target]`
Ver logs del sistema
```
/logs app          → Logs de la aplicación
/logs api          → Logs del API
/logs all          → Todos los logs
```

#### `/errors [tipo]`
Mostrar errores recientes
```
/errors typescript → Errores de compilación
/errors runtime    → Errores de ejecución
/errors all        → Todos los errores
```

#### `/deploy [acción]`
Estado y gestión de deployments
```
/deploy status     → Estado actual
/deploy history    → Historial
/deploy rollback   → Revertir último deploy
```

#### `/preview [componente]`
Vista previa de componentes
```
/preview InvoicesTable
/preview AdminChat
```

#### `/check [sistema]`
Verificar configuración y servicios
```
/check database    → Estado de PostgreSQL
/check firebase    → Firebase Auth
/check api         → API VeriFactu
/check all         → Verificación completa
```

## Configuración

### 1. Variables de entorno

Añade a `apps/app/.env`:

```env
# Opción A: Usar OpenAI
OPENAI_API_KEY=sk-proj-xxxxx

# Opción B: Usar Isaak (tu asistente)
USE_ISAAK_FOR_ADMIN=true
ISAAK_API_KEY=your_key
ISAAK_ASSISTANT_ID=asst_xxxxx
```

### 2. Permisos de Admin

Solo usuarios con `isAdmin = true` en la base de datos pueden acceder:

```sql
UPDATE users 
SET is_admin = true 
WHERE email = 'tu_email@ejemplo.com';
```

## Uso

### Acceso
1. Inicia sesión como admin
2. Ve a: `/dashboard/admin`
3. Scroll hasta "Asistente de Administración"

### Preguntas Naturales

Puedes hacer preguntas en lenguaje natural:

```
"¿Cuántos usuarios tenemos?"
"¿Por qué falló el último deploy?"
"¿Hay errores de TypeScript?"
"¿Está funcionando la base de datos?"
"¿Cómo configuro VeriFactu?"
```

### Comandos

O usar comandos específicos para acciones rápidas:

```
/check database
/logs app
/errors typescript
/deploy status
```

## Personalización

### Agregar Nuevos Comandos

Edita `apps/app/components/admin/AdminChat.tsx`:

```typescript
case '/tucomando':
  return `Tu respuesta aquí`;
```

### Mejorar Contexto del Sistema

Edita `apps/app/app/api/admin/chat/route.ts`:

```typescript
async function buildSystemContext(tenantId?: string) {
  // Añade más estadísticas y contexto
  const metrics = await getCustomMetrics();
  return `...tu contexto...`;
}
```

### Integrar con Servicios Externos

```typescript
// Ejemplo: Ver estado de Vercel
case '/vercel':
  const deployments = await fetch('https://api.vercel.com/v6/deployments', {
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
  });
  return formatDeployments(await deployments.json());
```

## Seguridad

✅ Solo accesible para admins
✅ Validación de sesión en cada request
✅ No expone información sensible (passwords, keys)
✅ Logs de todas las interacciones
✅ Rate limiting recomendado para producción

## Mejoras Futuras

- [ ] Ejecución de comandos de sistema (con confirmación)
- [ ] Vista previa real de componentes React
- [ ] Gráficos y visualizaciones de métricas
- [ ] Notificaciones en tiempo real
- [ ] Historial de conversaciones
- [ ] Export de diagnósticos a PDF
- [ ] Integración con Slack/Teams
- [ ] Búsqueda semántica en documentación

## Costos

### Con OpenAI
- ~$0.03 por 1K tokens (GPT-4)
- ~100 mensajes = $1-2 USD

### Con Isaak
- Según tu plan actual de OpenAI/Azure

### Fallback Gratis
Si no configuras API keys, usa respuestas simples basadas en keywords.
