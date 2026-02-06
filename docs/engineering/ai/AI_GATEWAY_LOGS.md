# Acceder a Logs de AI Gateway en Vercel

## Ver Dashboard de AI Gateway

1. **Abrir Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Iniciar sesión si es necesario

2. **Seleccionar Proyecto**
   - Proyecto: `verifactu-monorepo`
   - Team: `ksenias-projects`

3. **Navegar a AI Gateway**
   - Menú izquierdo → **AI Gateway**
   - O acceso directo: https://vercel.com/dashboard/ai-gateway

## Información Disponible

### Solicitudes (Requests)

- **Timeline**: Gráfico de solicitudes en tiempo real
- **Total requests**: Número total procesadas
- **Latency**: Tiempo promedio de respuesta
- **Error rate**: Porcentaje de errores

### Costos

- **Por modelo**: Desglose de costos por modelo usado
- **Por aplicación**: Costos por endpoint
- **Proyección mensual**: Estimado de gasto

### Modelos

- **Más usados**: Qué modelos se usan más
- **Cambios recientes**: Historial de modelos
- **Switching**: Cuántas veces cambió de modelo

### Errores

- **Log de errores**: Errores ocurridos
- **Rate limiting**: Si se alcanzaron límites
- **Fallos de modelo**: Errores por modelo específico

## Logs en Tiempo Real

### Ver Logs por HTTP

```bash
# 1. Autenticar con Vercel CLI
vercel login

# 2. Monitorear logs de un deployment
vercel logs --project verifactu-monorepo

# 3. Con filtro (si está disponible)
vercel logs --project verifactu-monorepo | grep "ai-gateway"
```

### Ver Logs en Vercel Console

1. Dashboard → `verifactu-monorepo`
2. Tab → **Deployments**
3. Click en deployment actual
4. Tab → **Logs** o **Functions**
5. Ver logs de `/api/chat`

## Monitorear Uso en Tiempo Real

### Durante una Solicitud

El endpoint `/api/chat` registra:

```typescript
// En apps/app/app/api/chat/route.ts
console.log('[Isaak Chat API]', {
  timestamp: new Date().toISOString(),
  context: contextType,
  tenantId: activeTenantId,
  model: 'openai/gpt-4-turbo',
  gateway: 'https://ai-gateway.vercel.sh/v1',
});
```

Esto aparecerá en:

- **Logs de Vercel**: https://vercel.com/dashboard
- **AI Gateway Dashboard**: https://vercel.com/dashboard/ai-gateway

## Buscar Solicitudes Específicas

En el dashboard de AI Gateway:

1. **Por fecha**: Filtrar por rango de fechas
2. **Por modelo**: `gpt-4-turbo`, `claude-3-sonnet`, etc.
3. **Por estado**: Success, Error, Rate Limited
4. **Por endpoint**: Si está configurado en Vercel

## Analizar Costos

### Fórmula de Costos

```
Costo = (Tokens de entrada × 0.01 + Tokens de salida × 0.03) / 1000
```

Para GPT-4 Turbo:

- **Entrada**: $0.01 / 1K tokens
- **Salida**: $0.03 / 1K tokens

Ejemplo:

- Solicitud: 100 tokens entrada, 150 tokens salida
- Costo: (100 × 0.01 + 150 × 0.03) / 1000 = $0.0055

### Monitorear Presupuesto

1. Dashboard → **Settings**
2. Tab → **Billing**
3. **Usage-based Pricing**
4. Ver gastos por mes y proyección

## Configurar Alertas

1. Dashboard → **Settings**
2. Tab → **Notifications**
3. Seleccionar:
   - [ ] Deploy completado
   - [ ] Error en build
   - [ ] Límite de uso alcanzado

## Comparar Modelos

En Vercel AI Gateway Dashboard:

1. **Costos por modelo** (pie chart)
   - GPT-4 Turbo: XX%
   - Claude 3: XX%
   - etc.

2. **Latency por modelo** (bar chart)
   - Más rápido: Claude 3 Haiku
   - Balance: GPT-3.5 Turbo
   - Más potente: GPT-4 Turbo

3. **Error rate por modelo**
   - Si alguno falla frecuentemente

## Ejemplo: Analizar una Solicitud

1. Ir a AI Gateway Dashboard
2. Click en una solicitud específica
3. Ver detalles:
   ```
   Method: POST
   Endpoint: /api/chat
   Model: openai/gpt-4-turbo
   Status: 200 OK
   Latency: 1,234ms
   Tokens (in): 150
   Tokens (out): 280
   Cost: $0.0108
   ```

## Variables de Entorno

Tu configuración actual:

```env
# .env.local
CLAVE_API_AI_VERCEL=vck_5EGDA4EFpVotU1VYVM9OZ2P3zFYpr01oJG2fKCKd0dWYN2kwqn1HR4qa
```

Usada en:

- `apps/app/app/api/chat/route.ts`
- `apps/landing/lib/genkit-hybrid.ts` (opcional)

## Troubleshooting

### "Invalid API Key"

- ✅ Verificar clave en Vercel: https://vercel.com/dashboard/account/integrations/ai-gateway
- Regenerar si es necesario

### "Rate Limit Exceeded"

- Vercel AI Gateway hace rate limiting automático
- Ver en dashboard cuál fue el límite
- Contactar Vercel si necesitas aumentarlo

### "Model not found"

- Verificar que el nombre del modelo sea correcto
- Usar `openai/gpt-4-turbo` no `gpt-4-turbo`
- Consultar lista en https://vercel.com/docs/ai-gateway#models

## Próximas Acciones

1. **Hoy**: Verificar que logs aparezcan en Vercel
2. **Esta semana**: Analizar costos por modelo
3. **Este mes**: Hacer A/B testing entre modelos
4. **Mejora**: Implementar caché para prompts comunes

## Recursos

- [Documentación Oficial](https://vercel.com/docs/ai-gateway)
- [Dashboard](https://vercel.com/dashboard)
- [Modelos Soportados](https://vercel.com/docs/ai-gateway#models)
- [Precios](https://vercel.com/docs/ai-gateway#pricing)
