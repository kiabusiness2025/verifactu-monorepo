# AI Gateway - Quick Reference

> Vercel AI Gateway está **completamente integrado** en Verifactu. Tu endpoint `/api/chat` usa AI Gateway con soporte para 100+ modelos.

## 🎯 En 30 segundos

| Aspecto | Detalles |
|---------|----------|
| **Clave API** | `vck_5EGDA4EFpVotU1VYVM9OZ2P3zFYpr01oJG2fKCKd0dWYN2kwqn1HR4qa` ✅ |
| **Base URL** | `https://ai-gateway.vercel.sh/v1` |
| **Modelo actual** | `openai/gpt-4-turbo` |
| **Endpoint** | `POST /api/chat` (dashboard) |
| **Estado** | 🟢 Activo y funcionando |
| **Logs** | https://vercel.com/dashboard → AI Gateway |

## 🚀 Cambiar de Modelo en 10 Segundos

```typescript
// apps/app/app/api/chat/route.ts, línea ~110
model: aiGatewayClient('openai/gpt-4-turbo'),  // ← Cambiar aquí

// Opciones:
// 'openai/gpt-4-turbo'         (mejor para contabilidad)
// 'openai/gpt-3.5-turbo'       (más rápido)
// 'anthropic/claude-3-opus'    (mejor reasoning)
// 'anthropic/claude-3-sonnet'  (balance)
// 'xai/grok-2'                 (análisis avanzado)
```

Luego: `git add . && git commit -m "feat: use claude-3" && git push origin main`

Vercel redeploya automáticamente en 2-3 minutos.

## 📊 Ver Costos en Vercel

1. **Abrir**: https://vercel.com/dashboard
2. **Seleccionar**: `verifactu-monorepo`
3. **Ir a**: AI Gateway (menú izquierdo)
4. **Ver**: Solicitudes, costos, latencia, errores

## 💰 Comparar Costos (por 1K tokens)

| Modelo | Entrada | Salida | Caso de uso |
|--------|---------|--------|------------|
| **GPT-4 Turbo** | $0.01 | $0.03 | 📊 Análisis contable ✅ |
| GPT-3.5 Turbo | $0.0005 | $0.0015 | ⚡ Respuestas rápidas |
| Claude 3 Opus | $0.015 | $0.075 | 🧠 Reasoning complejo |
| Claude 3 Sonnet | $0.003 | $0.015 | ⚖️ Balance (50% más barato) |
| Claude 3 Haiku | $0.00025 | $0.00125 | 🔥 Muy económico |
| Gemini Pro | $0.0005 | $0.0015 | 💚 Google económico |

## 🔍 Ejemplo: Analizar Solicitud

En Vercel AI Gateway Dashboard:
```
✓ Solicitud: 2024-01-13 18:45:32
✓ Endpoint: /api/chat
✓ Modelo: openai/gpt-4-turbo
✓ Status: 200 OK
✓ Latencia: 1,234 ms
✓ Tokens entrada: 150
✓ Tokens salida: 280
✓ Costo: $0.0108
```

## 📁 Archivos de Configuración

```
apps/app/
├── app/api/chat/route.ts          ← Usa AI Gateway ✅
├── lib/ai-gateway.ts              ← Configuración de modelos
└── .env.local (local only)        ← CLAVE_API_AI_VERCEL

docs/ai/
├── AI_GATEWAY_CONFIG.md           ← Configuración completa
├── AI_GATEWAY_LOGS.md             ← Cómo ver logs
└── AI_GATEWAY_QUICK_REFERENCE.sh  ← Esta guía
```

## 🔗 Links Útiles

- **Dashboard**: https://vercel.com/dashboard
- **AI Gateway**: https://vercel.com/dashboard/ai-gateway
- **Docs**: https://vercel.com/docs/ai-gateway
- **Modelos**: https://vercel.com/docs/ai-gateway#models

## ✅ Checklist

- [x] Clave API configurada en `.env.local`
- [x] `/api/chat` usa AI Gateway
- [x] Documentación creada
- [x] Logs accesibles en Vercel
- [ ] Monitorear costos después del primer mes
- [ ] Hacer A/B testing entre modelos
- [ ] Optimizar prompts para cada modelo
- [ ] Implementar caché para prompts comunes

## 🚨 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Invalid API Key" | Verificar en https://vercel.com/dashboard/account/integrations |
| "Rate Limit" | Ver dashboard, Vercel limita automáticamente |
| "Model not found" | Usar nombre completo: `openai/gpt-4-turbo` (no solo `gpt-4-turbo`) |
| No ve logs | Dashboard → Deployments → Logs (esperar 30-60 segundos) |

## 🎓 Próximos Pasos

1. **Hoy**: Hacer una solicitud a `/api/chat` desde el dashboard
2. **Hoy**: Ver la solicitud en Vercel AI Gateway Dashboard
3. **Esta semana**: Analizar latencia y costos por modelo
4. **Este mes**: Hacer A/B testing GPT-4 vs Claude 3

---

**Última actualización**: 2024-01-13  
**Estado**: 🟢 Activo  
**Mantenedor**: GitHub Copilot
